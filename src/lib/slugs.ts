// src/lib/slugs.ts
// ═══════════════════════════════════════════════════════════════════════════════
// GESTIÓ CENTRALITZADA DE SLUGS
// ═══════════════════════════════════════════════════════════════════════════════
//
// ARQUITECTURA DE SLUGS (font de veritat):
// -----------------------------------------
// - /slugs/{slug}           → Índex CANÒNIC (slug → orgId). Lectura pública.
// - /organizations/{id}.slug → Camp DENORMALITZAT per construir URLs dins context.
//
// Quan es crea o edita una organització, SEMPRE s'ha d'actualitzar AMBDÓS llocs
// mitjançant `reserveSlug()`. La funció fa una transacció atòmica per garantir
// consistència.
//
// Per fer lookup slug → orgId, usar /slugs/{slug} (O(1), públic).
// Per construir URLs dins l'app, usar organizations.slug (ja carregat en context).
// ═══════════════════════════════════════════════════════════════════════════════

import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  runTransaction,
  collection,
  getDocs
} from 'firebase/firestore';

/**
 * Genera un slug a partir d'un nom.
 * "Fundació Flores de Kiskeya" → "fundacio-flores-de-kiskeya"
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar accents
    .replace(/[^a-z0-9\s-]/g, '')    // Eliminar caràcters especials
    .replace(/\s+/g, '-')            // Espais a guions
    .replace(/-+/g, '-')             // Múltiples guions a un
    .replace(/^-|-$/g, '')           // Eliminar guions al principi/final
    .substring(0, 50);               // Limitar longitud
}

/**
 * Valida el format d'un slug.
 * Retorna true si és vàlid.
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length < 3 || slug.length > 50) return false;
  // Només lletres minúscules, números i guions
  // No pot començar ni acabar amb guió
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

/**
 * Comprova si un slug està disponible.
 * @param firestore Instància de Firestore
 * @param slug Slug a comprovar
 * @param excludeOrgId ID de l'organització a excloure (per edició)
 * @returns true si està disponible
 */
export async function isSlugAvailable(
  firestore: Firestore,
  slug: string,
  excludeOrgId?: string
): Promise<boolean> {
  const slugRef = doc(firestore, 'slugs', slug);
  const slugSnap = await getDoc(slugRef);

  if (!slugSnap.exists()) return true;

  // Si existeix però és de la mateixa organització, està disponible (per edició)
  if (excludeOrgId && slugSnap.data()?.orgId === excludeOrgId) return true;

  return false;
}

/**
 * Genera un slug únic afegint sufixos numèrics si cal.
 * "fundacio-example" → "fundacio-example-2" → "fundacio-example-3"
 */
export async function generateUniqueSlug(
  firestore: Firestore,
  baseName: string,
  excludeOrgId?: string
): Promise<string> {
  const baseSlug = generateSlug(baseName);

  if (!baseSlug) {
    throw new Error('No es pot generar un slug del nom proporcionat');
  }

  let candidateSlug = baseSlug;
  let suffix = 1;
  const maxAttempts = 100;

  while (suffix <= maxAttempts) {
    const isAvailable = await isSlugAvailable(firestore, candidateSlug, excludeOrgId);
    if (isAvailable) {
      return candidateSlug;
    }
    suffix++;
    candidateSlug = `${baseSlug}-${suffix}`;
  }

  throw new Error('No s\'ha pogut generar un slug únic després de 100 intents');
}

/**
 * Reserva un slug per a una organització (transacció atòmica).
 * Crea el document a /slugs/{slug} i actualitza l'organització.
 *
 * @param firestore Instància de Firestore
 * @param orgId ID de l'organització
 * @param newSlug Nou slug a reservar
 * @param orgName Nom de l'organització (per mostrar a la pàgina de login)
 * @param oldSlug Slug anterior (si s'està canviant)
 * @throws Error si el slug ja està ocupat
 */
export async function reserveSlug(
  firestore: Firestore,
  orgId: string,
  newSlug: string,
  orgName: string,
  oldSlug?: string
): Promise<void> {
  if (!isValidSlug(newSlug)) {
    throw new Error(
      'El slug no és vàlid. Ha de tenir entre 3 i 50 caràcters, ' +
      'només lletres minúscules, números i guions.'
    );
  }

  await runTransaction(firestore, async (transaction) => {
    const newSlugRef = doc(firestore, 'slugs', newSlug);
    const newSlugSnap = await transaction.get(newSlugRef);

    // Comprovar si el nou slug ja existeix
    if (newSlugSnap.exists()) {
      const existingOrgId = newSlugSnap.data()?.orgId;
      if (existingOrgId !== orgId) {
        throw new Error(`El slug "${newSlug}" ja està en ús`);
      }
      // Si és el mateix orgId, no cal fer res amb el slug
      return;
    }

    // Si hi ha un slug anterior, eliminar-lo
    if (oldSlug && oldSlug !== newSlug) {
      const oldSlugRef = doc(firestore, 'slugs', oldSlug);
      transaction.delete(oldSlugRef);
    }

    // Reservar el nou slug
    transaction.set(newSlugRef, {
      orgId: orgId,
      orgName: orgName,
      createdAt: new Date().toISOString()
    });

    // Actualitzar l'organització amb el nou slug
    const orgRef = doc(firestore, 'organizations', orgId);
    transaction.update(orgRef, { slug: newSlug });
  });
}

/**
 * Allibera un slug (quan s'elimina una organització).
 */
export async function releaseSlug(
  firestore: Firestore,
  slug: string
): Promise<void> {
  const slugRef = doc(firestore, 'slugs', slug);
  await deleteDoc(slugRef);
}

/**
 * Obté l'orgId a partir d'un slug.
 * @returns orgId o null si no existeix
 */
export async function getOrgIdBySlug(
  firestore: Firestore,
  slug: string
): Promise<string | null> {
  const slugRef = doc(firestore, 'slugs', slug);
  const slugSnap = await getDoc(slugRef);

  if (!slugSnap.exists()) return null;

  return slugSnap.data()?.orgId || null;
}

/**
 * Migra les organitzacions existents a la col·lecció /slugs.
 * Només cal executar-ho una vegada.
 * @returns Nombre d'organitzacions migrades
 */
export async function migrateExistingSlugs(
  firestore: Firestore
): Promise<{ migrated: number; errors: string[] }> {
  const orgsRef = collection(firestore, 'organizations');
  const snapshot = await getDocs(orgsRef);

  let migrated = 0;
  const errors: string[] = [];

  for (const orgDoc of snapshot.docs) {
    const orgData = orgDoc.data();
    const orgId = orgDoc.id;

    try {
      let slug = orgData.slug;

      // Si no té slug, generar-lo
      if (!slug && orgData.name) {
        slug = await generateUniqueSlug(firestore, orgData.name, orgId);
      }

      if (slug) {
        // Verificar si ja existeix a /slugs
        const slugRef = doc(firestore, 'slugs', slug);
        const slugSnap = await getDoc(slugRef);

        if (!slugSnap.exists()) {
          // Crear el document a /slugs
          await setDoc(slugRef, {
            orgId: orgId,
            orgName: orgData.name || '',
            createdAt: new Date().toISOString(),
            migratedAt: new Date().toISOString()
          });

          // Actualitzar l'organització si no tenia slug
          if (!orgData.slug) {
            const orgRef = doc(firestore, 'organizations', orgId);
            await setDoc(orgRef, { slug }, { merge: true });
          }

          migrated++;
        }
      }
    } catch (err) {
      errors.push(`Error migrant ${orgId}: ${err instanceof Error ? err.message : 'Error desconegut'}`);
    }
  }

  return { migrated, errors };
}
