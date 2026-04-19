import { getAdminDb } from '@/lib/api/admin-sdk';

type RateLimitParams = {
  uid: string;
  scope: string;
  limit: number;
  windowMs: number;
};

type RateLimitDoc = {
  scope: string;
  uid: string;
  bucket: string;
  count: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
};

function buildBucket(windowMs: number, nowMs: number): string {
  const bucketStartMs = Math.floor(nowMs / windowMs) * windowMs;
  return new Date(bucketStartMs).toISOString().slice(0, 16);
}

export async function checkRateLimitOrThrow({
  uid,
  scope,
  limit,
  windowMs,
}: RateLimitParams): Promise<void> {
  const db = getAdminDb();
  const nowMs = Date.now();
  const now = new Date(nowMs);
  const expiresAt = new Date(nowMs + windowMs);
  const bucket = buildBucket(windowMs, nowMs);
  const docId = `${scope}__${uid}__${bucket}`;
  const docRef = db.collection('_rateLimits').doc(docId);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef);

    if (!snapshot.exists) {
      const newDoc: RateLimitDoc = {
        scope,
        uid,
        bucket,
        count: 1,
        createdAt: now,
        updatedAt: now,
        expiresAt,
      };
      transaction.set(docRef, newDoc);
      return;
    }

    const currentCount = typeof snapshot.data()?.count === 'number'
      ? snapshot.data()!.count
      : 0;

    if (currentCount >= limit) {
      throw new Error('RATE_LIMITED');
    }

    transaction.update(docRef, {
      count: currentCount + 1,
      updatedAt: now,
      expiresAt,
    });
  });
}
