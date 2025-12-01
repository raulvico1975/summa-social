'use client';

import * as React from 'react';
import { DonationCertificateGenerator } from '@/components/donation-certificate-generator';

export default function CertificatsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">
          Certificats de Donació
        </h1>
        <p className="text-muted-foreground">
          Genera certificats fiscals per als teus donants
        </p>
      </div>
      
      <DonationCertificateGenerator />
    </div>
  );
}
