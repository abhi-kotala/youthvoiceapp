import { createFileRoute } from "@tanstack/react-router";

/**
 * Hourly cron endpoint: closes topics whose closing date has passed and then
 * publishes one fresh AI-drafted replacement for each topic that just closed.
 * If nothing closed, nothing is generated (no AI credits used).
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
          if (closed.length === 0) {
            return Response.json({
              ok: true,
              closed: 0,
              created: 0,
              skipped: "No topics closed — nothing to replace.",
            });
          }
          const result = await generateTopics({
            count: Math.min(closed.length, 5),
            cities: closed.map((c) => c.city),
            force: true,
          });
          return Response.json({
            ok: true,
            closed: closed.length,
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
          return Response.json({ ok: true, closed: closed.length });
        } catch (e) {
          return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
