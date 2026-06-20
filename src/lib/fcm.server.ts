// FCM HTTP v1 sender. Worker-safe: signs OAuth JWT with Web Crypto (no firebase-admin).
// Never import this from client code.

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
  token_uri?: string;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

function getServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON not set");
  return JSON.parse(raw) as ServiceAccount;
}

function b64url(input: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof input === "string") {
    bytes = new TextEncoder().encode(input);
  } else if (input instanceof Uint8Array) {
    bytes = input;
  } else {
    bytes = new Uint8Array(input);
  }
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.value;

  const sa = getServiceAccount();
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: sa.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${b64url(sig)}`;

  const res = await fetch(claims.aud, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`OAuth token failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: now + json.expires_in };
  return json.access_token;
}

export async function sendPushToToken(args: {
  token: string;
  title: string;
  body: string;
  url?: string;
}): Promise<{ ok: boolean; status: number; invalidToken: boolean }> {
  const sa = getServiceAccount();
  const accessToken = await getAccessToken();
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: args.token,
          notification: { title: args.title, body: args.body },
          data: args.url ? { url: args.url } : undefined,
          webpush: {
            fcm_options: { link: args.url || "/" },
            notification: { icon: "/icon-192.png", badge: "/icon-192.png" },
          },
        },
      }),
    },
  );
  const invalidToken = res.status === 404 || res.status === 400;
  return { ok: res.ok, status: res.status, invalidToken };
}

export async function broadcastPush(args: {
  title: string;
  body: string;
  url?: string;
}): Promise<{ sent: number; removed: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("fcm_token");
  if (!subs || subs.length === 0) return { sent: 0, removed: 0 };

  let sent = 0;
  const invalid: string[] = [];
  await Promise.all(
    subs.map(async (s: { fcm_token: string }) => {
      try {
        const r = await sendPushToToken({ token: s.fcm_token, ...args });
        if (r.ok) sent++;
        else if (r.invalidToken) invalid.push(s.fcm_token);
      } catch (e) {
        console.error("push send error", e);
      }
    }),
  );
  if (invalid.length) {
    await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .in("fcm_token", invalid);
  }
  return { sent, removed: invalid.length };
}
