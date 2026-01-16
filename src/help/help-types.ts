export type HelpRouteKey =
  | '/dashboard'
  | '/dashboard/movimientos'
  | '/dashboard/donants'
  | '/dashboard/proveidors'
  | '/dashboard/treballadors'
  | '/dashboard/informes'
  | '/dashboard/configuracion'
  | '/dashboard/projectes'
  | '/dashboard/project-module/expenses'
  | '/dashboard/project-module/projects'
  | string;

export type HelpExtraSection = {
  title: string;
  items: string[];
};

export type HelpExtraLink = {
  label: string;
  href?: string;
  note?: string;
};

export type HelpExtra = {
  order?: HelpExtraSection;
  flow?: HelpExtraSection;
  pitfalls?: HelpExtraSection;
  whenNot?: HelpExtraSection;
  checks?: HelpExtraSection;
  returns?: HelpExtraSection;
  remittances?: HelpExtraSection;
  contacts?: HelpExtraSection;
  categories?: HelpExtraSection;
  documents?: HelpExtraSection;
  bankAccounts?: HelpExtraSection;
  ai?: HelpExtraSection;
  bulk?: HelpExtraSection;
  importing?: HelpExtraSection;
  filters?: HelpExtraSection;
  quality?: HelpExtraSection;
  manual?: HelpExtraLink;
  video?: HelpExtraLink;
};

export type HelpContent = {
  title: string;
  intro?: string;
  steps?: string[];
  tips?: string[];
  extra?: HelpExtra;
  keywords?: string[];
};
