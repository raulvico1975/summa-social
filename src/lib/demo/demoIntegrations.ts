/**
 * Estat d'integracions en mode DEMO
 *
 * Les integracions són visibles però "desconnectades" en mode DEMO.
 * No es fan crides reals a serveis externs.
 */

import { isDemoEnv } from './isDemoOrg';

// ─────────────────────────────────────────────────────────────────────────────
// Tipus
// ─────────────────────────────────────────────────────────────────────────────

export type IntegrationStatus = 'connected' | 'disconnected' | 'demo';

export interface IntegrationState {
  status: IntegrationStatus;
  label: string;
  description?: string;
}

export interface DemoIntegrations {
  stripe: IntegrationState;
  bank: IntegrationState;
  email: IntegrationState;
  storage: IntegrationState;
}

// ─────────────────────────────────────────────────────────────────────────────
// Estat central
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_INTEGRATIONS: DemoIntegrations = {
  stripe: {
    status: 'demo',
    label: 'Stripe',
    description: 'Pagaments amb targeta (desconnectat en DEMO)',
  },
  bank: {
    status: 'demo',
    label: 'Connexió bancària',
    description: 'Importació de moviments bancaris (desconnectat en DEMO)',
  },
  email: {
    status: 'demo',
    label: 'Correu electrònic',
    description: 'Enviament de certificats i notificacions (desconnectat en DEMO)',
  },
  storage: {
    status: 'connected', // Storage sí que funciona a demo
    label: 'Emmagatzematge',
    description: 'Pujada de documents i fitxers',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna l'estat de totes les integracions segons l'entorn
 */
export function getDemoIntegrationStatus(): DemoIntegrations {
  if (!isDemoEnv()) {
    // En producció, retornem tot com "connected" (l'estat real es determina a cada component)
    return {
      stripe: { status: 'connected', label: 'Stripe' },
      bank: { status: 'connected', label: 'Connexió bancària' },
      email: { status: 'connected', label: 'Correu electrònic' },
      storage: { status: 'connected', label: 'Emmagatzematge' },
    };
  }

  return DEMO_INTEGRATIONS;
}

/**
 * Retorna l'estat d'una integració específica
 */
export function getIntegrationStatus(
  integration: keyof DemoIntegrations
): IntegrationState {
  return getDemoIntegrationStatus()[integration];
}

/**
 * Comprova si una integració està disponible (pot fer crides reals)
 * En DEMO, només storage està realment disponible
 */
export function isIntegrationAvailable(
  integration: keyof DemoIntegrations
): boolean {
  if (!isDemoEnv()) return true; // En prod, assumim disponible

  const status = getIntegrationStatus(integration);
  return status.status === 'connected';
}

/**
 * Retorna el text del badge segons l'estat
 */
export function getIntegrationBadgeText(status: IntegrationStatus): string {
  switch (status) {
    case 'connected':
      return 'Connectat';
    case 'disconnected':
      return 'Desconnectat';
    case 'demo':
      return 'Desconnectat (DEMO)';
  }
}

/**
 * Retorna les classes CSS del badge segons l'estat
 */
export function getIntegrationBadgeClass(status: IntegrationStatus): string {
  switch (status) {
    case 'connected':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'disconnected':
      return 'bg-gray-100 text-gray-600 border-gray-300';
    case 'demo':
      return 'bg-amber-100 text-amber-800 border-amber-300';
  }
}
