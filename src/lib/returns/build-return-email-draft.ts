import { renderReturnEmailTemplate } from '@/lib/returns/render-return-email-template';

export const SYSTEM_DEFAULT_RETURN_EMAIL_TEMPLATE = `Bon dia {{name}},

Hem rebut la devolució de la quota corresponent a {{month}} per un import de {{amount}}.

Quan us sigui possible, us agrairem que reviseu si hi ha algun problema amb el compte o el saldo. Si tot està correcte, ens ho podeu confirmar i tornarem a intentar el cobrament en la propera remesa.

Moltes gràcies pel vostre suport.

Una salutació,
L’equip`;

export type ReturnEmailDraftLanguage = 'ca' | 'es' | 'fr' | 'pt';

const LOCALE_BY_LANGUAGE: Record<ReturnEmailDraftLanguage, string> = {
  ca: 'ca-ES',
  es: 'es-ES',
  fr: 'fr-FR',
  pt: 'pt-PT',
};

function toMonthYear(txDate: string, language: ReturnEmailDraftLanguage): string {
  const isoDate = txDate.slice(0, 10);
  const parsedDate = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return txDate;
  }
  return new Intl.DateTimeFormat(LOCALE_BY_LANGUAGE[language], {
    month: 'long',
    year: 'numeric',
  }).format(parsedDate);
}

function toAmount(amount: number, language: ReturnEmailDraftLanguage): string {
  return new Intl.NumberFormat(LOCALE_BY_LANGUAGE[language], {
    style: 'currency',
    currency: 'EUR',
  }).format(Math.abs(amount));
}

export function buildReturnEmailDraft(input: {
  contactName?: string | null;
  txDate: string;
  amount: number;
  language: ReturnEmailDraftLanguage;
  organizationReturnTemplate?: string | null;
}): string {
  const normalizedName = input.contactName?.trim() ?? '';
  const template = input.organizationReturnTemplate?.trim()
    ? input.organizationReturnTemplate
    : SYSTEM_DEFAULT_RETURN_EMAIL_TEMPLATE;

  const rendered = renderReturnEmailTemplate(template, {
    name: normalizedName,
    month: toMonthYear(input.txDate, input.language),
    amount: toAmount(input.amount, input.language),
  });

  if (!normalizedName) {
    return rendered.replaceAll('Bon dia ,', 'Bon dia,');
  }

  return rendered;
}
