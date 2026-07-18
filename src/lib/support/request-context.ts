import type { Firestore } from 'firebase-admin/firestore'

export class SupportOrganizationResolutionError extends Error {
  readonly status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'SupportOrganizationResolutionError'
    this.status = status
  }
}

function normalizeIdentifier(raw: unknown, label: string): string | null {
  if (raw === undefined || raw === null || raw === '') return null
  if (typeof raw !== 'string') {
    throw new SupportOrganizationResolutionError(`${label} invàlid`)
  }
  const value = raw.trim()
  if (!value || value.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new SupportOrganizationResolutionError(`${label} invàlid`)
  }
  return value
}

export async function resolveSupportOrganizationId(input: {
  db: Firestore
  uid: string
  requestedOrganizationId?: unknown
  requestedOrgSlug?: unknown
}): Promise<string> {
  const requestedOrganizationId = normalizeIdentifier(input.requestedOrganizationId, 'organizationId')
  const requestedOrgSlug = normalizeIdentifier(input.requestedOrgSlug, 'orgSlug')

  if (requestedOrgSlug) {
    const slugSnap = await input.db.doc(`slugs/${requestedOrgSlug}`).get()
    const slugOrganizationId = slugSnap.exists && typeof slugSnap.data()?.orgId === 'string'
      ? String(slugSnap.data()?.orgId).trim()
      : ''

    if (!slugOrganizationId) {
      throw new SupportOrganizationResolutionError('Organització no trobada')
    }
    if (requestedOrganizationId && requestedOrganizationId !== slugOrganizationId) {
      throw new SupportOrganizationResolutionError('El context d’organització no coincideix')
    }
    return slugOrganizationId
  }

  if (requestedOrganizationId) return requestedOrganizationId

  // Compatibilitat temporal amb clients antics. Els clients actuals sempre envien
  // l'organització visible; aquest fallback es pot retirar quan no quedin sessions antigues.
  const userDoc = await input.db.doc(`users/${input.uid}`).get()
  const profile = userDoc.data() ?? {}
  const fallbackOrganizationId = typeof profile.defaultOrganizationId === 'string'
    ? profile.defaultOrganizationId
    : typeof profile.organizationId === 'string'
      ? profile.organizationId
      : ''

  if (!fallbackOrganizationId) {
    throw new SupportOrganizationResolutionError('Usuari sense organització assignada')
  }
  return fallbackOrganizationId
}
