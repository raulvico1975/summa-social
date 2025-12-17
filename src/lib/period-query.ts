import type { DateFilterValue, FilterType } from '@/components/date-filter';

type SearchParamsLike = {
  get(name: string): string | null;
};

const PERIOD_TYPE_VALUES: FilterType[] = ['all', 'year', 'quarter', 'month', 'custom'];

export function toPeriodQuery(filter: DateFilterValue | null | undefined): Record<string, string> {
  if (!filter) return {};

  const query: Record<string, string> = {
    periodType: filter.type,
  };

  if ((filter.type === 'year' || filter.type === 'quarter' || filter.type === 'month') && filter.year) {
    query.periodYear = filter.year.toString();
  }

  if (filter.type === 'quarter' && filter.quarter) {
    query.periodQuarter = filter.quarter.toString();
  }

  if (filter.type === 'month' && filter.month) {
    query.periodMonth = filter.month.toString();
  }

  if (filter.type === 'custom' && filter.customRange) {
    if (filter.customRange.from) {
      query.periodFrom = toIsoDate(filter.customRange.from);
    }
    if (filter.customRange.to) {
      query.periodTo = toIsoDate(filter.customRange.to);
    }
  }

  return query;
}

export function fromPeriodQuery(params: SearchParamsLike | null | undefined): DateFilterValue | null {
  if (!params) return null;
  const periodType = params.get('periodType');
  if (!periodType || !isValidType(periodType)) return null;

  if (periodType === 'all') {
    return { type: 'all' };
  }

  if (periodType === 'year') {
    const year = toNumber(params.get('periodYear'));
    if (!year) return null;
    return { type: 'year', year };
  }

  if (periodType === 'quarter') {
    const year = toNumber(params.get('periodYear'));
    const quarter = toNumber(params.get('periodQuarter'));
    if (!year || !quarter || quarter < 1 || quarter > 4) return null;
    return { type: 'quarter', year, quarter: quarter as 1 | 2 | 3 | 4 };
  }

  if (periodType === 'month') {
    const year = toNumber(params.get('periodYear'));
    const month = toNumber(params.get('periodMonth'));
    if (!year || !month || month < 1 || month > 12) return null;
    return { type: 'month', year, month };
  }

  if (periodType === 'custom') {
    const fromRaw = params.get('periodFrom');
    const toRaw = params.get('periodTo');
    const range = {
      from: fromRaw ? parseDate(fromRaw) : null,
      to: toRaw ? parseDate(toRaw) : null,
    };
    if (!range.from && !range.to) return null;
    return { type: 'custom', customRange: range };
  }

  return null;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const parts = value.split('-');
  if (parts.length !== 3) return null;
  const [yearStr, monthStr, dayStr] = parts;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return isNaN(date.getTime()) ? null : date;
}

function toNumber(value: string | null): number | null {
  if (!value) return null;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function isValidType(value: string): value is FilterType {
  return PERIOD_TYPE_VALUES.includes(value as FilterType);
}
