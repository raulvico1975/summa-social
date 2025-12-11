import { ca } from '@/i18n/ca';
import { es } from '@/i18n/es';
import type { OrganizationLanguage } from '@/lib/data';

const translations = { ca, es };

interface OrganizationData {
  name: string;
  email?: string | null;
  language?: OrganizationLanguage;
}

interface DonorData {
  name?: string | null;
  email: string;
}

// Informació per certificat individual (donació puntual)
interface SingleDonationInfo {
  date: string;   // Data formatada (ex: "15/03/2025")
  amount: string; // Import formatat (ex: "1.000,00 €")
}

export interface CertificateEmailPayload {
  subject: string;
  html: string;
  text: string;
}

/**
 * Construeix el contingut de l'email per enviar un certificat de donacions.
 * Funció pura que no depèn de cap servei extern.
 *
 * @param org - Dades de l'organització
 * @param donor - Dades del donant
 * @param year - Any fiscal (per certificats anuals) o any de la donació
 * @param singleDonation - Si s'especifica, és un certificat d'una donació puntual
 */
export function buildCertificateEmail(
  org: OrganizationData,
  donor: DonorData,
  year: string,
  singleDonation?: SingleDonationInfo,
): CertificateEmailPayload {
  const lang = org.language ?? 'es';
  const t = translations[lang].certificates.email;

  // Subjecte i cos diferenciats segons tipus de certificat
  const subject = singleDonation
    ? t.subjectSingle(org.name, singleDonation.date)
    : t.subject(org.name, year);

  const greeting = donor.name
    ? t.greetingWithName(donor.name)
    : t.greetingGeneric;

  const body = singleDonation
    ? t.bodySingle(singleDonation.date, singleDonation.amount)
    : t.body(year);

  const attachmentNote = t.attachmentNote;
  const thanks = t.thanks;
  const regards = t.regards;
  const footer = t.footer;

  const lines = [
    greeting,
    '',
    body,
    '',
    attachmentNote,
    '',
    thanks,
    '',
    regards,
    org.name,
    '',
    '---',
    footer,
  ];

  const text = lines.join('\n');

  // HTML simple però net
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .greeting { margin-bottom: 20px; }
    .body { margin-bottom: 20px; }
    .attachment-note { margin-bottom: 20px; color: #666; }
    .thanks { margin-bottom: 20px; }
    .signature { margin-top: 30px; }
    .org-name { font-weight: 600; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <p class="greeting">${greeting}</p>
  <p class="body">${body}</p>
  <p class="attachment-note">${attachmentNote}</p>
  <p class="thanks">${thanks}</p>
  <div class="signature">
    <p>${regards}</p>
    <p class="org-name">${org.name}</p>
  </div>
  <div class="footer">
    <p>${footer}</p>
  </div>
</body>
</html>
`.trim();

  return { subject, html, text };
}
