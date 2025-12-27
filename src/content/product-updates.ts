export type FeatureAnnouncement = {
  id: string; // ha de canviar quan hi ha una novetat nova
  text: string;
  cta?: {
    label: string;
    href: string; // ruta interna (sense orgSlug)
  };
};

export const FEATURE_ANNOUNCEMENT: FeatureAnnouncement | null = {
  id: 'v1.19-onboarding-modal',
  text: "Novetat: Benvinguda guiada per a noves organitzacions.",
};

export const WORKING_ON: string[] = [
  "Exportació de justificacions de projectes",
  "Guardrails contextuals per dades fiscals",
  "Informes de seguiment de projectes",
];
