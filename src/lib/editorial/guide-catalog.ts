export type GuideDomain = 'fiscal' | 'sepa' | 'remittances' | 'superadmin' | 'general'

export const GUIDE_CATALOG = [
  { id: 'firstDay', domain: 'general' },
  { id: 'firstMonth', domain: 'general' },
  { id: 'monthClose', domain: 'general' },
  { id: 'movements', domain: 'general' },
  { id: 'importMovements', domain: 'general' },
  { id: 'bulkCategory', domain: 'general' },
  { id: 'changePeriod', domain: 'general' },
  { id: 'selectBankAccount', domain: 'general' },
  { id: 'attachDocument', domain: 'general' },
  { id: 'returns', domain: 'remittances' },
  { id: 'remittances', domain: 'remittances' },
  { id: 'splitRemittance', domain: 'remittances' },
  { id: 'stripeDonations', domain: 'remittances' },
  { id: 'travelReceipts', domain: 'general' },
  { id: 'travelExpenseReport', domain: 'general' },
  { id: 'mileageTravel', domain: 'general' },
  { id: 'donors', domain: 'general' },
  { id: 'reports', domain: 'general' },
  { id: 'projects', domain: 'general' },
  { id: 'monthlyFlow', domain: 'general' },
  { id: 'yearEndFiscal', domain: 'fiscal' },
  { id: 'accessSecurity', domain: 'general' },
  { id: 'initialLoad', domain: 'general' },
  { id: 'changeLanguage', domain: 'general' },
  { id: 'importDonors', domain: 'general' },
  { id: 'generateDonorCertificate', domain: 'fiscal' },
  { id: 'model182HasErrors', domain: 'fiscal' },
  { id: 'model182', domain: 'fiscal' },
  { id: 'model347', domain: 'fiscal' },
  { id: 'certificatesBatch', domain: 'fiscal' },
  { id: 'donorSetInactive', domain: 'general' },
  { id: 'donorReactivate', domain: 'general' },
  { id: 'editMovement', domain: 'general' },
  { id: 'movementFilters', domain: 'general' },
  { id: 'bulkAICategorize', domain: 'general' },
  { id: 'remittanceViewDetail', domain: 'remittances' },
  { id: 'resetPassword', domain: 'general' },
  { id: 'updateExistingDonors', domain: 'general' },
  { id: 'remittanceLowMembers', domain: 'remittances' },
  { id: 'saveRemittanceMapping', domain: 'remittances' },
  { id: 'toggleRemittanceItems', domain: 'remittances' },
  { id: 'dangerDeleteLastRemittance', domain: 'superadmin' },
] as const

const GUIDE_ID_SET = new Set<string>(GUIDE_CATALOG.map(item => item.id))
const GUIDE_DOMAIN_BY_ID = new Map<string, GuideDomain>(
  GUIDE_CATALOG.map(item => [item.id, item.domain])
)

export function isGuideIdInCatalog(guideId: string): boolean {
  return GUIDE_ID_SET.has(guideId)
}

export function getGuideDomainFromCatalog(guideId: string): GuideDomain | null {
  return GUIDE_DOMAIN_BY_ID.get(guideId) ?? null
}
