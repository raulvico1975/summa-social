export type FeatureAnnouncement = {
  id: string; // ha de canviar quan hi ha una novetat nova
  text: string;
  cta?: {
    label: string;
    href: string; // ruta interna (sense orgSlug)
  };
};

export const FEATURE_ANNOUNCEMENT: FeatureAnnouncement | null = {
  id: 'v1.13-bulk-categorization',
  text: "Novetat: Ara pots seleccionar diversos moviments i assignar categories en bloc.",
  cta: {
    label: "Veure com funciona",
    href: "/dashboard/movimientos",
  },
};

export const WORKING_ON: string[] = [
  "Millorar la identificació de donants dins les remeses",
  "Donar més visibilitat a les dades fiscals pendents",
  "Afinar la gestió de devolucions parcials",
];
