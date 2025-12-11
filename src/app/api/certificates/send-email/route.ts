import { NextRequest, NextResponse } from 'next/server';
import { buildCertificateEmail } from '@/lib/email/buildCertificateEmail';

interface SendEmailRequest {
  organizationId: string;
  organizationName: string;
  organizationEmail?: string;
  organizationLanguage?: 'ca' | 'es';
  donors: Array<{
    id: string;
    name: string;
    email: string;
    pdfBase64: string;
    // Per certificats individuals (donació puntual)
    singleDonation?: {
      date: string;   // Data formatada
      amount: string; // Import formatat
    };
  }>;
  year: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SendEmailRequest = await request.json();

    const { organizationName, organizationEmail, organizationLanguage, donors, year } = body;

    if (!donors || donors.length === 0) {
      return NextResponse.json(
        { error: 'No donors provided' },
        { status: 400 }
      );
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    const results = {
      sent: 0,
      errors: 0,
      skippedNoEmail: 0,
    };

    const org = {
      name: organizationName,
      email: organizationEmail,
      language: organizationLanguage,
    };

    for (const donor of donors) {
      if (!donor.email) {
        results.skippedNoEmail++;
        continue;
      }

      try {
        const { subject, html, text } = buildCertificateEmail(
          org,
          donor,
          year,
          donor.singleDonation
        );

        // Construir el nom del fitxer
        const sanitizedName = donor.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9]/g, '_')
          .substring(0, 30);
        // Nom diferent per certificat individual vs anual
        const filename = donor.singleDonation
          ? `certificat_donacio_${sanitizedName}.pdf`
          : `certificat_${year}_${sanitizedName}.pdf`;

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: `${organizationName} / Summa Social <certifica@summasocial.app>`,
            to: donor.email,
            reply_to: organizationEmail || undefined,
            subject,
            html,
            text,
            attachments: [
              {
                filename,
                content: donor.pdfBase64,
              },
            ],
          }),
        });

        if (response.ok) {
          results.sent++;
        } else {
          const errorData = await response.json();
          console.error('Resend error for donor', donor.id, errorData);
          results.errors++;
        }
      } catch (error) {
        console.error('Error sending email to donor', donor.id, error);
        results.errors++;
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in send-email route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
