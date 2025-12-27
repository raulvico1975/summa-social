export type FeatureAnnouncement = {
  id: string; // ha de canviar quan hi ha una novetat nova
  text: string;
  cta?: {
    label: string;
    href: string; // ruta interna (sense orgSlug)
  };
};

export const FEATURE_ANNOUNCEMENT: FeatureAnnouncement | null = {
  id: 'v1.18-onboarding',
  text: "Novetat: Configuració inicial guiada per a noves organitzacions.",
  cta: {
    label: "Veure",
    href: "/onboarding",
  },
};

export const WORKING_ON: string[] = [
  "Exportació de justificacions de projectes",
  "Guardrails contextuals per dades fiscals",
  "Informes de seguiment de projectes",
];
