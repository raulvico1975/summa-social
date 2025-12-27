export type FeatureAnnouncement = {
  id: string; // ha de canviar quan hi ha una novetat nova
  text: string;
  cta?: {
    label: string;
    href: string; // ruta interna (sense orgSlug)
  };
};

export const FEATURE_ANNOUNCEMENT: FeatureAnnouncement | null = {
  id: 'v1.17-ui-polish',
  text: "Novetat: Interfície millorada amb taules més llegibles, navegació amb breadcrumbs i millor accessibilitat.",
  cta: {
    label: "Explorar",
    href: "/dashboard/movimientos",
  },
};

export const WORKING_ON: string[] = [
  "Exportació de justificacions de projectes",
  "Millores en el matching de devolucions",
  "Informes de seguiment de projectes",
];
