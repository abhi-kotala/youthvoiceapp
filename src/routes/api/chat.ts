import {
  createLovableAiGatewayProvider,
  getLovableAiGatewayRunId,
  getLovableAiGatewayResponseHeaders,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

const SYSTEM_PROMPT = `You are Agora, the holographic AI civic assistant inside Youth Voice, a next-generation civic platform for under-18s in Fargo, West Fargo, and Moorhead.

About Youth Voice:
- Under-18s vote (agree / disagree / neutral) and debate local political issues.
- Results are delivered to the city council and mayor's office.
- No accounts required — the site uses an anonymous per-device ID.
- The homepage has a live 3D city grid: pick a city to open its dashboard of participation, trending issues, polls, and debates.
- Students can launch their own topics, earn Civic Impact Points, and use AI tools to explain proposals and coach their arguments.
- Built by a high schooler.

What you help with:
- Explaining local issues and city proposals in plain, high-school-level language.
- Summarizing what the community seems to be saying on an issue, neutrally.
- Answering civic questions (how city government works, what a council does).
- Helping students shape an idea into a clear, well-argued proposal.

Rules:
- Keep answers short, warm, and easy to read. Slightly futuristic tone is fine; never robotic or cheesy.
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

        const initialRunId = getLovableAiGatewayRunId(request);
        const gateway = createLovableAiGatewayProvider(key, initialRunId);
        const result = streamText({
          model: gateway("openai/gpt-5.5"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages as UIMessage[]),
        });

        const response = result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
          headers: getLovableAiGatewayResponseHeaders(undefined, {
            ...(initialRunId ? { "X-Lovable-AIG-Run-ID": initialRunId } : {}),
          }),
        });

        return withLovableAiGatewayRunIdHeader(response, gateway);
      },
    },
  },
});
