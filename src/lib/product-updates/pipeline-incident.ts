export const PRODUCT_UPDATES_PIPELINE_INCIDENT_ID = 'PRODUCT_UPDATES_WEEKLY_PIPELINE';

export interface ProductUpdatesPipelineIncidentInput {
  weekStart: string;
  weekEnd: string;
  error: unknown;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function sanitizeProductUpdatesPipelineError(error: unknown): string {
  return errorMessage(error)
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/\b(?:gh[oprsu]_|re_)[A-Za-z0-9_-]+\b/g, '[REDACTED]')
    .replace(/[A-Za-z0-9_-]{48,}/g, '[REDACTED]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
}

export function buildProductUpdatesPipelineIncident(
  input: ProductUpdatesPipelineIncidentInput
): Record<string, unknown> {
  const cleanError = sanitizeProductUpdatesPipelineError(input.error) || 'Error desconegut';

  return {
    signature: PRODUCT_UPDATES_PIPELINE_INCIDENT_ID,
    type: 'INVARIANT_BROKEN',
    severity: 'CRITICAL',
    route: '/health-check/product-updates',
    message: `La publicació setmanal de novetats ha fallat: ${cleanError}`.slice(0, 500),
    status: 'OPEN',
    impact: 'functional',
    lastSeenMeta: {
      functionName: 'runWeeklyProductUpdates',
      weekStart: input.weekStart,
      weekEnd: input.weekEnd,
      errorMessage: cleanError,
    },
  };
}
