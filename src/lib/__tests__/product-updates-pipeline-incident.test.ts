import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProductUpdatesPipelineIncident,
  PRODUCT_UPDATES_PIPELINE_INCIDENT_ID,
  sanitizeProductUpdatesPipelineError,
} from '@/lib/product-updates/pipeline-incident';

test('sanitizeProductUpdatesPipelineError elimina credencials del missatge', () => {
  const sanitized = sanitizeProductUpdatesPipelineError(
    new Error('Publish failed Bearer ghp_abcdefghijklmnopqrstuvwxyz1234567890')
  );

  assert.equal(sanitized, 'Publish failed Bearer [REDACTED]');
});

test('buildProductUpdatesPipelineIncident crea una alerta critica sense undefined', () => {
  const incident = buildProductUpdatesPipelineIncident({
    weekStart: '2026-07-13',
    weekEnd: '2026-07-19',
    error: new Error('Sessió no vàlida. Torna a iniciar sessió.'),
  });

  assert.equal(incident.signature, PRODUCT_UPDATES_PIPELINE_INCIDENT_ID);
  assert.equal(incident.severity, 'CRITICAL');
  assert.equal(incident.route, '/health-check/product-updates');
  assert.equal(incident.status, 'OPEN');
  assert.doesNotMatch(JSON.stringify(incident), /undefined/);
  assert.match(String(incident.message), /Sessió no vàlida/);
});
