import test from "node:test";
import assert from "node:assert/strict";
import * as admin from "firebase-admin";
import { sanitizeFirestoreWritePayload } from "./payload-utils";

test("sanitizeFirestoreWritePayload elimina undefined en objectes niuats", () => {
  const payload = {
    checks: {
      A: {
        count: 1,
        details: undefined,
        nested: {
          keep: "ok",
          remove: undefined,
        },
      },
    },
    items: [
      {
        id: "one",
        meta: undefined,
      },
      undefined,
      {
        id: "two",
      },
    ],
  };

  assert.deepEqual(sanitizeFirestoreWritePayload(payload), {
    checks: {
      A: {
        count: 1,
        nested: {
          keep: "ok",
        },
      },
    },
    items: [
      {
        id: "one",
      },
      {
        id: "two",
      },
    ],
  });
});

test("sanitizeFirestoreWritePayload preserva sentinelles de Firestore", () => {
  const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();
  const timestamp = admin.firestore.Timestamp.fromDate(new Date("2026-03-13T00:00:00.000Z"));

  const payload = sanitizeFirestoreWritePayload({
    createdAt: serverTimestamp,
    runAt: timestamp,
  });

  assert.equal(payload.createdAt, serverTimestamp);
  assert.equal(payload.runAt, timestamp);
});
