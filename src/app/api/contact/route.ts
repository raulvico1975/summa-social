import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const CONTACT_FORM_SCHEMA = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  organization: z.string().trim().max(160).optional().transform((value) => value ?? ''),
  message: z.string().trim().min(10).max(5000),
  website: z.string().trim().max(500).optional().transform((value) => value ?? ''),
  language: z.enum(['ca', 'es', 'fr', 'pt']).optional(),
});

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function readResendError(response: Response) {
  try {
    return await response.json();
  } catch {
    try {
      return await response.text();
    } catch {
      return null;
    }
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: 'INVALID_PAYLOAD' }, { status: 400 });
  }

  const parsed = CONTACT_FORM_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, code: 'INVALID_PAYLOAD' }, { status: 400 });
  }

  const { website, name, email, organization, message, language } = parsed.data;

  if (website) {
    return NextResponse.json({ ok: true });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.CONTACT_FORM_TO_EMAIL?.trim();

  if (!resendApiKey || !recipient) {
    console.error('[contact] Email service not configured', {
      hasResendApiKey: Boolean(resendApiKey),
      hasRecipient: Boolean(recipient),
    });
    return NextResponse.json({ ok: false, code: 'SERVICE_NOT_CONFIGURED' }, { status: 503 });
  }

  const serverTimestamp = new Date().toISOString();
  const subjectTarget = organization || name;
  const subject = `Nou contacte web - ${subjectTarget}`;
  const organizationLine = organization || '-';
  const languageLine = language || '-';

  const text = [
    'Nou contacte web',
    '',
    `Nom: ${name}`,
    `Email: ${email}`,
    `Entitat: ${organizationLine}`,
    `Idioma: ${languageLine}`,
    `Data/hora servidor: ${serverTimestamp}`,
    '',
    'Missatge:',
    message,
  ].join('\n');

  const html = `
    <div>
      <h1>Nou contacte web</h1>
      <p><strong>Nom:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Entitat:</strong> ${escapeHtml(organizationLine)}</p>
      <p><strong>Idioma:</strong> ${escapeHtml(languageLine)}</p>
      <p><strong>Data/hora servidor:</strong> ${escapeHtml(serverTimestamp)}</p>
      <p><strong>Missatge:</strong></p>
      <p>${escapeHtml(message).replaceAll('\n', '<br />')}</p>
    </div>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Summa Social <certifica@summasocial.app>',
        to: recipient,
        reply_to: email,
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const resendError = await readResendError(response);
      console.error('[contact] Resend error', {
        status: response.status,
        resendError,
      });
      return NextResponse.json({ ok: false, code: 'SEND_FAILED' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[contact] Unexpected send error', error);
    return NextResponse.json({ ok: false, code: 'SEND_FAILED' }, { status: 500 });
  }
}
