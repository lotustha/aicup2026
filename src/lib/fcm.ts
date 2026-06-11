import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
  type App,
} from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

/**
 * Firebase Admin (FCM) sender. Credentials come from FIREBASE_SERVICE_ACCOUNT
 * (service-account JSON as a single-line string) or GOOGLE_APPLICATION_CREDENTIALS
 * (file path). Used by the poller (auto goal/kickoff alerts) and the admin
 * dashboard (manual broadcasts).
 */

let app: App | null = null;

function adminApp(): App {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0]!;
    return app;
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw && raw.trim().length > 0) {
    const svc = JSON.parse(raw);
    app = initializeApp({ credential: cert(svc) });
  } else {
    // Falls back to GOOGLE_APPLICATION_CREDENTIALS if set.
    app = initializeApp({ credential: applicationDefault() });
  }
  return app;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Arbitrary string data delivered to the app (e.g. fixtureId, messageId, type). */
  data?: Record<string, string>;
}

/**
 * Send a push to many device tokens. Automatically chunks to FCM's 500-token
 * limit. Returns the count of successful sends and the tokens FCM reported as
 * invalid (caller should delete these from the DB).
 */
export async function sendPush(
  tokens: string[],
  payload: PushPayload
): Promise<{ successCount: number; failureCount: number; invalidTokens: string[] }> {
  const valid = [...new Set(tokens.filter(Boolean))];
  if (valid.length === 0) {
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  const messaging = getMessaging(adminApp());
  let successCount = 0;
  let failureCount = 0;
  const invalidTokens: string[] = [];

  for (let i = 0; i < valid.length; i += 500) {
    const batch = valid.slice(i, i + 500);
    const res = await messaging.sendEachForMulticast({
      tokens: batch,
      notification: { title: payload.title, body: payload.body },
      data: payload.data ?? {},
      android: { priority: "high" },
    });
    successCount += res.successCount;
    failureCount += res.failureCount;
    res.responses.forEach((r, idx) => {
      if (!r.success) {
        const code = r.error?.code ?? "";
        if (
          code.includes("registration-token-not-registered") ||
          code.includes("invalid-registration-token") ||
          code.includes("invalid-argument")
        ) {
          invalidTokens.push(batch[idx]);
        }
      }
    });
  }

  return { successCount, failureCount, invalidTokens };
}
