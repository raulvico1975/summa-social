// src/hooks/organization-provider.tsx

'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import type { Organization, OrganizationRole, UserProfile } from '@/lib/data';
import { Loader2, AlertCircle } from 'lucide-react';
import { User } from 'firebase/auth';

// ═══════════════════════════════════════════════════════════════════════════════
// GENERACIÓ AUTOMÀTICA DE SLUGS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Genera un slug a partir d'un nom.
 * "Fundació Flores de Kiskeya" → "fundacio-flores-de-kiskeya"
 */
function generateSlug(name: string): string {
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
 * Genera un slug únic verificant que no existeixi a Firestore.
 * Si existeix, afegeix un sufix numèric.
 */
async function generateUniqueSlug(
  firestore: any, 
  baseName: string, 
  excludeOrgId?: string
): Promise<string> {
  let slug = generateSlug(baseName);
  let suffix = 0;
  let isUnique = false;

  while (!isUnique) {
    const candidateSlug = suffix === 0 ? slug : `${slug}-${suffix}`;
    const q = query(collection(firestore, 'organizations'), where('slug', '==', candidateSlug));
    const snapshot = await getDocs(q);
    
    // És únic si no existeix o si l'únic resultat és la mateixa organització
    if (snapshot.empty || (snapshot.docs.length === 1 && snapshot.docs[0].id === excludeOrgId)) {
      slug = candidateSlug;
      isUnique = true;
    } else {
      suffix++;
    }
  }

  return slug;
}

interface OrganizationContextType {
  organization: Organization | null;
  organizationId: string | null;
  orgSlug: string | null;
  userProfile: UserProfile | null;
  userRole: OrganizationRole | null;
  firebaseUser: User | null;
  isLoading: boolean;
  error: Error | null;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

interface OrganizationProviderProps {
  children: ReactNode;
  orgSlug?: string; // Slug opcional - si no es passa, es carrega la primera org de l'usuari
}

/**
 * Hook intern per carregar l'organització pel slug o per l'usuari
 */
function useOrganizationBySlug(orgSlug?: string) {
  const { firestore, user, isUserLoading } = useFirebase();
  const router = useRouter();
  
  const [organization, setOrganization] = React.useState<Organization | null>(null);
  const [organizationId, setOrganizationId] = React.useState<string | null>(null);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [userRole, setUserRole] = React.useState<OrganizationRole | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    // Si encara estem carregant l'usuari, esperem
    if (isUserLoading) {
      return;
    }

    // Si no hi ha usuari autenticat, redirigim a login
    if (!user) {
      setIsLoading(false);
      router.push('/login');
      return;
    }

    const loadOrganization = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let orgDoc: Organization | null = null;
        let orgId: string | null = null;

        if (orgSlug) {
          // ═══════════════════════════════════════════════════════════════════
          // CARREGA PER SLUG (nova funcionalitat)
          // ═══════════════════════════════════════════════════════════════════
          const orgsRef = collection(firestore, 'organizations');
          const q = query(orgsRef, where('slug', '==', orgSlug));
          const snapshot = await getDocs(q);

          if (snapshot.empty) {
            throw new Error(`No s'ha trobat l'organització "${orgSlug}"`);
          }

          const docSnap = snapshot.docs[0];
          orgId = docSnap.id;
          orgDoc = { id: orgId, ...docSnap.data() } as Organization;

          // Verificar que l'usuari té accés a aquesta organització
          const memberRef = doc(firestore, 'organizations', orgId, 'members', user.uid);
          const memberSnap = await getDoc(memberRef);

          if (!memberSnap.exists()) {
            // Comprovar si és Super Admin
            const SUPER_ADMIN_UID = 'f2AHJqjXiOZkYajwkOnZ8RY6h2k2';
            if (user.uid !== SUPER_ADMIN_UID) {
              throw new Error('No tens accés a aquesta organització');
            }
            // Super Admin pot veure qualsevol org
            setUserRole('admin');
          } else {
            const memberData = memberSnap.data();
            setUserRole(memberData.role as OrganizationRole);
          }

        } else {
          // ═══════════════════════════════════════════════════════════════════
          // CARREGA PER USUARI (comportament antic - per compatibilitat)
          // ═══════════════════════════════════════════════════════════════════
          
          // Buscar la primera organització on l'usuari és membre
          // Això és una query de grup de col·leccions
          const userProfileRef = doc(firestore, 'users', user.uid);
          const userProfileSnap = await getDoc(userProfileRef);
          
          if (userProfileSnap.exists()) {
            const profileData = userProfileSnap.data();
            if (profileData.defaultOrganizationId) {
              orgId = profileData.defaultOrganizationId;
            }
          }

          // Si no té organització per defecte, buscar la primera
          if (!orgId) {
            // Buscar totes les organitzacions on l'usuari és membre
            const orgsRef = collection(firestore, 'organizations');
            const orgsSnapshot = await getDocs(orgsRef);
            
            for (const orgDocSnap of orgsSnapshot.docs) {
              const memberRef = doc(firestore, 'organizations', orgDocSnap.id, 'members', user.uid);
              const memberSnap = await getDoc(memberRef);
              if (memberSnap.exists()) {
                orgId = orgDocSnap.id;
                const memberData = memberSnap.data();
                setUserRole(memberData.role as OrganizationRole);
                break;
              }
            }
          }

          if (orgId) {
            const orgRef = doc(firestore, 'organizations', orgId);
            const orgSnap = await getDoc(orgRef);
            if (orgSnap.exists()) {
              orgDoc = { id: orgId, ...orgSnap.data() } as Organization;
            }
          }
        }

        if (!orgDoc || !orgId) {
          throw new Error('No s\'ha trobat cap organització');
        }

        // ═══════════════════════════════════════════════════════════════════
        // GENERACIÓ AUTOMÀTICA DE SLUG
        // Si l'organització no té slug, el generem i guardem
        // ═══════════════════════════════════════════════════════════════════
        if (!orgDoc.slug) {
          console.log(`Organització "${orgDoc.name}" no té slug, generant...`);
          const newSlug = await generateUniqueSlug(firestore, orgDoc.name, orgId);
          
          // Guardar el slug a Firestore
          const orgRef = doc(firestore, 'organizations', orgId);
          await updateDoc(orgRef, { slug: newSlug });
          
          // Actualitzar l'objecte local
          orgDoc = { ...orgDoc, slug: newSlug };
          console.log(`Slug generat i guardat: "${newSlug}"`);
        }

        setOrganization(orgDoc);
        setOrganizationId(orgId);

        // Carregar perfil d'usuari
        const profileRef = doc(firestore, 'organizations', orgId, 'members', user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          setUserProfile({ id: user.uid, ...profileSnap.data() } as UserProfile);
        }

      } catch (err) {
        console.error('Error loading organization:', err);
        setError(err instanceof Error ? err : new Error('Error desconegut'));
      } finally {
        setIsLoading(false);
      }
    };

    loadOrganization();
  }, [firestore, user, isUserLoading, orgSlug, router]);

  return {
    organization,
    organizationId,
    orgSlug: organization?.slug || orgSlug || null,
    userProfile,
    userRole,
    firebaseUser: user,
    isLoading: isLoading || isUserLoading,
    error,
  };
}

/**
 * Provider que gestiona l'organització actual i la fa disponible a tots els components.
 * Ara accepta un orgSlug opcional per carregar l'organització des de la URL.
 */
export function OrganizationProvider({ children, orgSlug }: OrganizationProviderProps) {
  const organizationData = useOrganizationBySlug(orgSlug);
  const router = useRouter();

  // Mentre es carrega, mostrar un indicador
  if (organizationData.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregant organització...</p>
        </div>
      </div>
    );
  }

  // Si hi ha error, mostrar-lo
  if (organizationData.error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center p-4 max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-destructive font-semibold text-lg">Error carregant l'organització</p>
          <p className="text-muted-foreground">
            {organizationData.error.message}
          </p>
          <div className="flex gap-2 mt-4">
            <button 
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Anar al panell
            </button>
            <button 
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
            >
              Tornar a l'inici
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Si no hi ha organització, no renderitzar res
  if (!organizationData.organization) {
    return null;
  }

  return (
    <OrganizationContext.Provider value={organizationData}>
      {children}
    </OrganizationContext.Provider>
  );
}

/**
 * Hook per accedir a l'organització actual des de qualsevol component.
 * Ara també proporciona el slug de l'organització per construir URLs.
 * 
 * Ús:
 * ```typescript
 * const { organizationId, orgSlug, userRole } = useCurrentOrganization();
 * 
 * // Construir enllaços:
 * const dashboardUrl = `/${orgSlug}/dashboard`;
 * const movimentsUrl = `/${orgSlug}/dashboard/movimientos`;
 * ```
 */
export function useCurrentOrganization(): OrganizationContextType {
  const context = useContext(OrganizationContext);
  
  if (context === undefined) {
    throw new Error('useCurrentOrganization must be used within an OrganizationProvider');
  }
  
  return context;
}

/**
 * Hook helper per construir URLs amb el slug de l'organització actual.
 * 
 * Ús:
 * ```typescript
 * const { buildUrl } = useOrgUrl();
 * 
 * // Retorna: "/flores-kiskeya/dashboard/movimientos"
 * const url = buildUrl('/dashboard/movimientos');
 * ```
 */
export function useOrgUrl() {
  const { orgSlug } = useCurrentOrganization();
  
  const buildUrl = React.useCallback((path: string) => {
    if (!orgSlug) {
      // Fallback a URLs sense slug (compatibilitat)
      return path;
    }
    
    // Eliminar /dashboard del principi si existeix, perquè l'afegirem amb el slug
    const cleanPath = path.startsWith('/dashboard') 
      ? path 
      : `/dashboard${path.startsWith('/') ? path : '/' + path}`;
    
    return `/${orgSlug}${cleanPath}`;
  }, [orgSlug]);

  return { orgSlug, buildUrl };
}
