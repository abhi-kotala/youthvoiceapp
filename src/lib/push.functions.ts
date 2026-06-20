import { createServerFn } from "@tanstack/react-start";

export const registerPushToken = createServerFn({ method: "POST" })
  .inputValidator((d: { deviceId: string; token: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        {
          device_id: data.deviceId,
          fcm_token: data.token,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "fcm_token" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
