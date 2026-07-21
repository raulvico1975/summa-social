import * as admin from 'firebase-admin';
import {
  buildProductUpdatesPipelineIncident,
  PRODUCT_UPDATES_PIPELINE_INCIDENT_ID,
} from '../../../src/lib/product-updates/pipeline-incident';

interface WeeklyProductUpdatesIncidentWindow {
  weekStart: string;
  weekEnd: string;
}

export async function upsertWeeklyProductUpdatesIncident(args: {
  db: FirebaseFirestore.Firestore;
  window: WeeklyProductUpdatesIncidentWindow;
  error: unknown;
}): Promise<void> {
  const ref = args.db.collection('systemIncidents').doc(PRODUCT_UPDATES_PIPELINE_INCIDENT_ID);
  const now = admin.firestore.Timestamp.now();
  const payload = buildProductUpdatesPipelineIncident({
    weekStart: args.window.weekStart,
    weekEnd: args.window.weekEnd,
    error: args.error,
  });
  const existing = await ref.get();

  if (existing.exists) {
    const current = existing.data() ?? {};
    const currentCount = typeof current.count === 'number' ? current.count : 1;
    const currentStatus = typeof current.status === 'string' ? current.status : 'OPEN';
    await ref.update({
      ...payload,
      count: currentCount + 1,
      lastSeenAt: now,
      status: currentStatus === 'RESOLVED' ? 'OPEN' : currentStatus,
    });
    return;
  }

  await ref.set({
    ...payload,
    count: 1,
    firstSeenAt: now,
    lastSeenAt: now,
  });
}

export async function resolveWeeklyProductUpdatesIncident(
  db: FirebaseFirestore.Firestore
): Promise<void> {
  const ref = db.collection('systemIncidents').doc(PRODUCT_UPDATES_PIPELINE_INCIDENT_ID);
  const existing = await ref.get();
  if (!existing.exists || existing.data()?.status === 'RESOLVED') return;

  await ref.update({
    status: 'RESOLVED',
    lastSeenAt: admin.firestore.Timestamp.now(),
  });
}
