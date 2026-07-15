import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

const SYSTEM_PROMPT = `You are the Youth Voice assistant, a friendly helper for a civic polling app made for under-18s in Fargo, West Fargo, and Moorhead.

About Youth Voice:
- Under-18s vote (agree / disagree / neutral) and comment on local political issues.
- Results are delivered to the city council and mayor's office.
- No accounts required — the site uses an anonymous per-device ID.
- Users can browse issues by city, open an issue to vote and see discussion, and view results.
- Built by a high schooler.

Rules:
- Keep answers short, warm, and easy to read.
- If asked something you don't know about the app, say so honestly.
- Don't invent features that don't exist. Don't give political opinions — stay neutral.
- If someone asks how to vote in real elections, remind them this app is for under-18 input only.`;

type ChatRequestBody = { messages?: unknown };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("openai/gpt-5.5"),
          system: SYSTEM_PROMPT,
          messages: convertToModelMessages(messages as UIMessage[]),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});
