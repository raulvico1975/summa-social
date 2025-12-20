/**
 * Cloud Function per migrar els projectes del path antic al nou
 *
 * Mou documents de:
 *   /organizations/{orgId}/projectModule/{docId} (on docId sembla un projecte)
 * A:
 *   /organizations/{orgId}/projectModule/_/projects/{docId}
 *
 * Callable només per administradors.
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";

const db = admin.firestore();

interface MigrationResult {
  success: boolean;
  migrated: number;
  errors: string[];
  details: Array<{
    orgId: string;
    orgName: string;
    projectId: string;
    projectName: string;
    status: "migrated" | "skipped" | "error";
    message?: string;
  }>;
}

export const migrateProjectModulePaths = functions
  .region("europe-west1")
  .https.onCall(async (data, context): Promise<MigrationResult> => {
    // Verificar autenticació
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Usuari no autenticat"
      );
    }

    const dryRun = data?.dryRun ?? true;
    const targetOrgId = data?.orgId ?? null;

    functions.logger.info("Iniciant migració de projectModule paths", {
      dryRun,
      targetOrgId,
      userId: context.auth.uid,
    });

    const result: MigrationResult = {
      success: true,
      migrated: 0,
      errors: [],
      details: [],
    };

    try {
      // Obtenir organitzacions
      let orgsQuery: admin.firestore.Query = db.collection("organizations");
      if (targetOrgId) {
        // Si s'especifica una org, només mirar aquella
      }

      const orgsSnapshot = await orgsQuery.get();

      for (const orgDoc of orgsSnapshot.docs) {
        if (targetOrgId && orgDoc.id !== targetOrgId) continue;

        const orgId = orgDoc.id;
        const orgName = orgDoc.data().name || orgId;

        functions.logger.info(`Processant org: ${orgName} (${orgId})`);

        // Obtenir tots els documents dins de projectModule
        const projectModuleSnapshot = await db
          .collection("organizations")
          .doc(orgId)
          .collection("projectModule")
          .get();

        for (const moduleDoc of projectModuleSnapshot.docs) {
          // Ignorar el placeholder correcte
          if (moduleDoc.id === "_") continue;

          const docData = moduleDoc.data();

          // Comprovar si sembla un projecte (té 'name' i 'status')
          if (docData && docData.name && docData.status) {
            functions.logger.info(`Trobat projecte al path antic: ${moduleDoc.id}`, {
              name: docData.name,
              status: docData.status,
            });

            if (!dryRun) {
              try {
                // Copiar al nou path
                const newRef = db
                  .collection("organizations")
                  .doc(orgId)
                  .collection("projectModule")
                  .doc("_")
                  .collection("projects")
                  .doc(moduleDoc.id);

                await newRef.set({
                  ...docData,
                  _migratedAt: admin.firestore.FieldValue.serverTimestamp(),
                  _migratedFrom: `projectModule/${moduleDoc.id}`,
                });

                // Eliminar l'antic
                await moduleDoc.ref.delete();

                result.details.push({
                  orgId,
                  orgName,
                  projectId: moduleDoc.id,
                  projectName: docData.name,
                  status: "migrated",
                });

                result.migrated++;
              } catch (err) {
                const errorMsg = err instanceof Error ? err.message : "Unknown error";
                result.errors.push(`Error migrant ${moduleDoc.id}: ${errorMsg}`);
                result.details.push({
                  orgId,
                  orgName,
                  projectId: moduleDoc.id,
                  projectName: docData.name,
                  status: "error",
                  message: errorMsg,
                });
              }
            } else {
              // Dry run - només informar
              result.details.push({
                orgId,
                orgName,
                projectId: moduleDoc.id,
                projectName: docData.name,
                status: "skipped",
                message: "Dry run - no migrat",
              });
              result.migrated++;
            }
          }
        }

        // Mostrar projectes ja al path correcte
        const correctProjectsSnapshot = await db
          .collection("organizations")
          .doc(orgId)
          .collection("projectModule")
          .doc("_")
          .collection("projects")
          .get();

        functions.logger.info(`Projectes al path correcte per ${orgName}: ${correctProjectsSnapshot.size}`);
      }

      functions.logger.info("Migració completada", {
        migrated: result.migrated,
        errors: result.errors.length,
        dryRun,
      });

      return result;
    } catch (err) {
      functions.logger.error("Error durant migració", err);
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      result.success = false;
      result.errors.push(errorMsg);
      return result;
    }
  }
);
