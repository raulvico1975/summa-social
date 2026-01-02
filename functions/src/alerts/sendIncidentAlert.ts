// functions/src/alerts/sendIncidentAlert.ts
// Envia emails d'alerta per incidents crítics del sistema via Resend
// NO utilitza Firebase Extension - usa directament l'API de Resend (ja existent al projecte)

import * as admin from "firebase-admin";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { defineString, defineBoolean } from "firebase-functions/params";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓ (params de Firebase)
// ═══════════════════════════════════════════════════════════════════════════

const ALERT_EMAIL = defineString("ALERT_EMAIL", {
  default: "raul.vico.ferre@gmail.com",
  description: "Email on enviar alertes crítiques",
});

const RESEND_API_KEY = defineString("RESEND_API_KEY", {
  description: "API key de Resend per enviar emails",
});

const ALERTS_ENABLED = defineBoolean("ALERTS_ENABLED", {
  default: false, // IMPORTANT: desactivat per defecte en dev
  description: "Activar/desactivar enviament d'alertes email",
});

// Rutes core: errors aquí són crítics des del primer cop
const CORE_ROUTES = [
  "/movimientos",
  "/moviments",
  "/importar",
  "/import",
  "/fiscalitat",
  "/fiscalidad",
  "/project-module",
  "/projectes",
  "/proyectos",
];

// Finestra de cooldown: no reenviar si alertSentAt < 24h
const COOLDOWN_HOURS = 24;

// ═══════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════

type IncidentType =
  | "CLIENT_CRASH"
  | "PERMISSIONS"
  | "IMPORT_FAILURE"
  | "EXPORT_FAILURE"
  | "INVARIANT_BROKEN";

type IncidentSeverity = "CRITICAL" | "WARNING";
type IncidentStatus = "OPEN" | "ACK" | "RESOLVED";

interface SystemIncident {
  id: string;
  signature: string;
  type: IncidentType;
  severity: IncidentSeverity;
  orgId?: string;
  orgSlug?: string;
  route?: string;
  message: string;
  topStack?: string;
  count: number;
  firstSeenAt: admin.firestore.Timestamp;
  lastSeenAt: admin.firestore.Timestamp;
  status: IncidentStatus;
  lastSeenMeta?: Record<string, unknown>;
  alertSentAt?: admin.firestore.Timestamp;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function isCoreRoute(route: string | undefined): boolean {
  if (!route) return false;
  const lowerRoute = route.toLowerCase();
  return CORE_ROUTES.some((core) => lowerRoute.includes(core));
}

interface AlertDecision {
  shouldAlert: boolean;
  reason: string;
}

/**
 * Determina si cal enviar alerta email.
 * Criteris (tots obligatoris):
 * 1. severity === CRITICAL
 * 2. status === OPEN (mai si ACK o RESOLVED)
 * 3. count >= 2 OR isCoreRoute
 * 4. !alertSentAt OR (lastSeenAt - alertSentAt > COOLDOWN_HOURS)
 */
function shouldSendAlert(
  incident: SystemIncident,
  previousData?: SystemIncident
): AlertDecision {
  // 1. Ha de ser CRITICAL
  if (incident.severity !== "CRITICAL") {
    return { shouldAlert: false, reason: "No és CRITICAL" };
  }

  // 2. Ha de ser OPEN (respectar ACK immediatament)
  if (incident.status !== "OPEN") {
    return { shouldAlert: false, reason: `Status és ${incident.status}, no OPEN` };
  }

  // 3. count >= 2 O ruta core
  const isCore = isCoreRoute(incident.route);
  if (incident.count < 2 && !isCore) {
    return { shouldAlert: false, reason: "count < 2 i no és ruta core" };
  }

  // 4. Respectar cooldown (un mail per incident per finestra)
  if (incident.alertSentAt) {
    const alertSentMs = incident.alertSentAt.toMillis();
    const lastSeenMs = incident.lastSeenAt.toMillis();
    const hoursSinceAlert = (lastSeenMs - alertSentMs) / (1000 * 60 * 60);

    // Si es va reobrir (era RESOLVED i ara OPEN), permetre enviar si >24h
    const wasResolved = previousData?.status === "RESOLVED";
    if (!wasResolved && hoursSinceAlert < COOLDOWN_HOURS) {
      return { shouldAlert: false, reason: `Cooldown actiu (${Math.round(hoursSinceAlert)}h < ${COOLDOWN_HOURS}h)` };
    }
    if (wasResolved && hoursSinceAlert < COOLDOWN_HOURS) {
      return { shouldAlert: false, reason: `Reobert però cooldown actiu` };
    }
  }

  return {
    shouldAlert: true,
    reason: isCore ? "Ruta core afectada" : `Repetit ${incident.count} vegades`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERAR PROMPT DE REPARACIÓ (sense dades sensibles)
// ═══════════════════════════════════════════════════════════════════════════

const INCIDENT_HELP: Record<IncidentType, { whatItMeans: string; whyCritical: string; nextSteps: string }> = {
  CLIENT_CRASH: {
    whatItMeans: "Una pantalla peta per un error de codi.",
    whyCritical: "L'usuari no pot continuar treballant.",
    nextSteps: "1. Reproduir a la ruta afectada.\n2. Passar error a Claude Code.",
  },
  PERMISSIONS: {
    whatItMeans: "Accés a dades sense permisos.",
    whyCritical: "Pot bloquejar operativa diària.",
    nextSteps: "1. Verificar rol usuari.\n2. Revisar firestore.rules.",
  },
  IMPORT_FAILURE: {
    whatItMeans: "Importació de dades fallada.",
    whyCritical: "Dades no carregades.",
    nextSteps: "1. Revisar format fitxer.\n2. Passar error a Claude Code.",
  },
  EXPORT_FAILURE: {
    whatItMeans: "Exportació fallada.",
    whyCritical: "No es pot generar document.",
    nextSteps: "1. Reproduir exportació.\n2. Passar error a Claude Code.",
  },
  INVARIANT_BROKEN: {
    whatItMeans: "Regla de negoci violada.",
    whyCritical: "Dades poden estar desquadrades.",
    nextSteps: "1. NO modificar res.\n2. Consultar DEV-SOLO-MANUAL.",
  },
};

const TYPE_LABELS: Record<IncidentType, string> = {
  CLIENT_CRASH: "Error de codi",
  PERMISSIONS: "Error de permisos",
  IMPORT_FAILURE: "Error d'importació",
  EXPORT_FAILURE: "Error d'exportació",
  INVARIANT_BROKEN: "Invariant violada",
};

/**
 * Genera prompt net (sense dades sensibles: emails, IBANs, imports)
 */
function buildIncidentFixPack(incident: SystemIncident): { title: string; summary: string; promptText: string } {
  const typeLabel = TYPE_LABELS[incident.type] || incident.type;
  const routeShort = incident.route?.split("/").slice(-2).join("/") || "desconeguda";

  // Netejar missatge de possibles dades sensibles
  const cleanMessage = incident.message
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]") // emails
    .replace(/[A-Z]{2}\d{2}[A-Z0-9]{10,30}/g, "[IBAN]") // IBANs
    .replace(/\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g, "[CARD]") // targetes
    .slice(0, 300);

  const title = `${typeLabel} a ${routeShort}`;

  const help = INCIDENT_HELP[incident.type];
  const summary = `${help.whatItMeans} ${help.whyCritical}`;

  const promptText = `## Incident Fix Pack – Summa Social

### 1. Context
Ets Claude Code dins el repo Summa Social (Next.js 14 + Firebase).
Llegeix primer: docs/SUMMA-SOCIAL-REFERENCIA-COMPLETA.md i docs/DEV-SOLO-MANUAL.md

**Regles:** No dependències noves. No refactoritzar. Canvi mínim viable.

### 2. Detalls

| Camp | Valor |
|------|-------|
| Tipus | ${incident.type} |
| Severitat | ${incident.severity} |
| Ruta | ${incident.route || "N/A"} |
| Org | ${incident.orgSlug || "N/A"} |
| Repeticions | ${incident.count} |
| Signatura | ${incident.signature} |

**Missatge:**
\`\`\`
${cleanMessage}
\`\`\`

**Top stack:**
\`\`\`
${incident.topStack || "No disponible"}
\`\`\`

### 3. Objectiu
Arreglar l'error perquè la ruta torni a funcionar. Incloure passos de QA.

### 4. Procediment
1. Localitza fitxer: ${incident.topStack?.split("/").slice(-1)[0] || "desconegut"}
2. Proposa canvi mínim amb paths exactes
3. Indica QA: com verificar
`;

  return { title, summary, promptText };
}

// ═══════════════════════════════════════════════════════════════════════════
// ENVIAR EMAIL VIA RESEND
// ═══════════════════════════════════════════════════════════════════════════

async function sendEmailViaResend(
  to: string,
  subject: string,
  htmlBody: string,
  apiKey: string
): Promise<boolean> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "Summa Social Alertes <alertes@summasocial.app>",
        to,
        subject,
        html: htmlBody,
      }),
    });

    if (response.ok) {
      return true;
    } else {
      const errorData = await response.json();
      logger.error("sendEmailViaResend: Resend API error", errorData);
      return false;
    }
  } catch (err) {
    logger.error("sendEmailViaResend: fetch error", err);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CLOUD FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

export const sendIncidentAlert = onDocumentWritten(
  {
    document: "systemIncidents/{incidentId}",
    region: "europe-west1",
  },
  async (event) => {
    const { incidentId } = event.params;

    // ─────────────────────────────────────────────────────────────────────────
    // VALIDACIÓ DE CONFIG (log + return si falta, sense throw)
    // ─────────────────────────────────────────────────────────────────────────

    // Check global toggle
    if (!ALERTS_ENABLED.value()) {
      logger.info(`sendIncidentAlert: ALERTS_ENABLED=false, skipping ${incidentId}`);
      return;
    }

    // Validar RESEND_API_KEY
    const apiKey = RESEND_API_KEY.value();
    if (!apiKey) {
      logger.warn(`sendIncidentAlert: RESEND_API_KEY not configured, skipping ${incidentId}`);
      return;
    }

    // Validar ALERT_EMAIL
    const alertEmail = ALERT_EMAIL.value();
    if (!alertEmail) {
      logger.warn(`sendIncidentAlert: ALERT_EMAIL not configured, skipping ${incidentId}`);
      return;
    }

    // ─────────────────────────────────────────────────────────────────────────

    // Només processem si existeix (no esborrats)
    if (!event.data?.after.exists) {
      logger.info(`sendIncidentAlert: incident ${incidentId} deleted, skipping`);
      return;
    }

    const incident = { id: incidentId, ...event.data.after.data() } as SystemIncident;
    const previousData = event.data.before.exists
      ? (event.data.before.data() as SystemIncident)
      : undefined;

    // Decidir si cal enviar alerta
    const decision = shouldSendAlert(incident, previousData);
    if (!decision.shouldAlert) {
      logger.info(`sendIncidentAlert: skipping ${incidentId} - ${decision.reason}`);
      return;
    }

    // IDEMPOTÈNCIA: Comprovar si ja s'ha enviat (doble escriptura)
    // Usar transacció per evitar carreres
    const incidentRef = db.doc(`systemIncidents/${incidentId}`);

    try {
      const sent = await db.runTransaction(async (transaction) => {
        const freshDoc = await transaction.get(incidentRef);
        if (!freshDoc.exists) return false;

        const freshData = freshDoc.data() as SystemIncident;

        // Si alertSentAt és recent (< 1 min), assumir que una altra instància ja ho fa
        if (freshData.alertSentAt) {
          const msSinceAlert = Date.now() - freshData.alertSentAt.toMillis();
          if (msSinceAlert < 60000) {
            logger.info(`sendIncidentAlert: alertSentAt recent, skipping duplicate`);
            return false;
          }
        }

        // Marcar que estem enviant ABANS d'enviar (optimistic lock)
        transaction.update(incidentRef, {
          alertSentAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return true;
      });

      if (!sent) {
        return;
      }
    } catch (err) {
      logger.error(`sendIncidentAlert: transaction failed for ${incidentId}`, err);
      return;
    }

    // Generar contingut
    const { title, summary, promptText } = buildIncidentFixPack(incident);

    // Construir HTML de l'email (sense dades sensibles)
    const adminLink = `https://summa.social/admin`;
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #dc2626; font-size: 18px; margin-bottom: 10px; }
    .severity { background: #dc2626; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .meta { background: #f5f5f5; padding: 12px; border-radius: 8px; margin: 16px 0; font-size: 14px; }
    pre { background: #1a1a1a; color: #22c55e; padding: 12px; border-radius: 8px; overflow-x: auto; font-size: 12px; white-space: pre-wrap; word-break: break-all; }
    .cta { display: inline-block; background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 16px; }
    .footer { color: #666; font-size: 11px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <h1>🚨 ${title}</h1>
  <span class="severity">${incident.severity}</span> <span style="color:#666;font-size:12px;">· ${decision.reason}</span>

  <div class="meta">
    <strong>Ruta:</strong> ${incident.route || "N/A"}<br>
    <strong>Org:</strong> ${incident.orgSlug || "N/A"}<br>
    <strong>Repeticions:</strong> ${incident.count}<br>
    <strong>Signatura:</strong> <code>${incident.signature}</code>
  </div>

  <p><strong>Resum:</strong> ${summary}</p>

  <h2 style="font-size:14px;margin-top:20px;">Prompt per Claude Code</h2>
  <p style="font-size:12px;color:#666;">Copia i enganxa a Claude Code:</p>
  <pre>${promptText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>

  <a href="${adminLink}" class="cta">Veure incidents a /admin</a>

  <div class="footer">
    <p>Alerta automàtica del sistema Sentinelles v1.1</p>
    <p>Per silenciar: fes ACK des del panell d'admin.</p>
  </div>
</body>
</html>
`;

    // Enviar email (usem les variables ja validades a l'inici)
    const emailSent = await sendEmailViaResend(
      alertEmail,
      `[Summa] 🚨 ${title}`,
      htmlBody,
      apiKey
    );

    if (emailSent) {
      logger.info(`sendIncidentAlert: email sent for ${incidentId} to ${alertEmail}`);
    } else {
      // Si falla l'enviament, esborrar alertSentAt per permetre reintent
      await incidentRef.update({
        alertSentAt: admin.firestore.FieldValue.delete(),
      });
      logger.error(`sendIncidentAlert: email failed, cleared alertSentAt for retry`);
    }
  }
);
