import { createFileRoute } from "@tanstack/react-router";

/**
 * Weekly cron endpoint: closes expired topics and publishes new AI-drafted ones.
 * Safe to call publicly — it never deletes data and refuses to generate more
 * than once per 24 hours.
 */
export const Route = createFileRoute("/api/public/rotate-topics")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { closeExpiredTopics, generateTopics } = await import(
            "@/lib/topic-generation.server"
          );
          const closed = await closeExpiredTopics();
          const result = await generateTopics({ count: 3 });
          return Response.json({
            ok: true,
            closed,
            created: result.created.length,
            skipped: result.skipped ?? null,
          });
        } catch (e) {
          console.error("rotate-topics failed", e);
          return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
        }
      },
      GET: async () => {
        try {
          const { closeExpiredTopics } = await import("@/lib/topic-generation.server");
          const closed = await closeExpiredTopics();
          return Response.json({ ok: true, closed });
        } catch (e) {
          return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
