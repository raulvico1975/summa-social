import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import {
  fetchWeeklyRelevantCommits,
} from "./github-weekly-commits";
import {
  runWeeklyProductUpdateJob,
  type PublishProductUpdateRequest,
} from "../../../src/lib/product-updates/weekly-product-update-runner";

type PublishEndpointResponse =
  | {
      success: true;
      id: string;
      url: string | null;
      alreadyExists?: boolean;
      created?: boolean;
    }
  | {
      success: false;
      error: string;
      details?: string[];
    };

const DEFAULT_APP_BASE_URL = "https://summasocial.app";

function getAppBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || DEFAULT_APP_BASE_URL;
}

async function readJsonResponse<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text.trim()) return null;
  return JSON.parse(text) as T;
}

async function callPublishRoute(
  payload: PublishProductUpdateRequest
): Promise<
  | { status: "success" }
  | { status: "duplicate" }
  | { status: "error"; errorMessage: string }
> {
  const publishSecret = process.env.PRODUCT_UPDATES_PUBLISH_SECRET?.trim();
  if (!publishSecret) {
    throw new Error("Missing PRODUCT_UPDATES_PUBLISH_SECRET");
  }

  const response = await fetch(`${getAppBaseUrl().replace(/\/+$/, "")}/api/product-updates/publish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${publishSecret}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await readJsonResponse<PublishEndpointResponse>(response);
  if (response.ok && body?.success === true) {
    if (body.alreadyExists === true || body.created === false) {
      return { status: "duplicate" };
    }
    return { status: "success" };
  }

  return {
    status: "error",
    errorMessage:
      body && "success" in body && body.success === false
        ? body.details?.join("; ") || body.error
        : `Publish route failed (${response.status})`,
  };
}

async function hasExistingExternalId(externalId: string): Promise<boolean> {
  const snapshot = await admin.firestore().doc(`productUpdates/${externalId}`).get();
  return snapshot.exists;
}

async function verifyPublishedProductUpdate(args: { externalId: string }): Promise<boolean> {
  const snapshot = await admin.firestore().doc(`productUpdates/${args.externalId}`).get();
  if (!snapshot.exists) return false;

  const data = snapshot.data() as Record<string, unknown> | undefined;
  if (!data) return false;

  const web = typeof data.web === "object" && data.web !== null
    ? data.web as Record<string, unknown>
    : null;

  return (
    data.isActive === true &&
    data.locale === "ca" &&
    typeof data.title === "string" &&
    data.title.trim().length > 0 &&
    typeof data.description === "string" &&
    data.description.trim().length > 0 &&
    typeof data.contentLong === "string" &&
    data.contentLong.trim().length > 0 &&
    data.publishedAt !== undefined &&
    web?.enabled === true &&
    typeof web.slug === "string" &&
    web.slug.trim().length > 0 &&
    typeof web.content === "string" &&
    web.content.trim().length > 0 &&
    !hasUndefinedDeep(data)
  );
}

function hasUndefinedDeep(value: unknown): boolean {
  if (value === undefined) return true;
  if (value === null) return false;
  if (Array.isArray(value)) return value.some(hasUndefinedDeep);
  if (typeof value !== "object") return false;

  for (const nested of Object.values(value as Record<string, unknown>)) {
    if (hasUndefinedDeep(nested)) return true;
  }

  return false;
}

export const runWeeklyProductUpdates = functions
  .region("europe-west1")
  .runWith({
    timeoutSeconds: 540,
    memory: "1GB",
    secrets: ["GITHUB_TOKEN", "PRODUCT_UPDATES_PUBLISH_SECRET"],
  })
  .pubsub.schedule("0 8 * * 1")
  .timeZone("Europe/Madrid")
  .onRun(async () => {
    const githubToken = process.env.GITHUB_TOKEN?.trim();
    if (!githubToken) {
      functions.logger.error("weekly_product_updates.error", {
        status: "error",
        errorMessage: "Missing GITHUB_TOKEN",
      });
      throw new Error("Missing GITHUB_TOKEN");
    }

    await runWeeklyProductUpdateJob({
      timeZone: "Europe/Madrid",
      listRelevantCommits: ({ weekStart, weekEnd }) =>
        fetchWeeklyRelevantCommits({
          token: githubToken,
          owner: "raulvico1975",
          repo: "summa-social",
          branch: "main",
          since: weekStart,
          until: weekEnd,
        }),
      hasExistingExternalId,
      publishProductUpdate: callPublishRoute,
      verifyPublishedProductUpdate,
      logger: {
        info: (event, payload) => functions.logger.info(event, payload),
        error: (event, payload) => functions.logger.error(event, payload),
      },
    });

    return null;
  });
