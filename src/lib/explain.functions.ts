import { createServerFn } from "@tanstack/react-start";

export type PolicyExplanation = {
  title: string;
  tldr: string;
  plainEnglish: string[];
  pros: string[];
  cons: string[];
  affected: { group: string; how: string }[];
  whatYouCanDo: string[];
};

type ExplainInput = {
  text?: string;
  file?: { name: string; mimeType: string; dataBase64: string };
};

const PROMPT = `You explain city council agendas, ordinances, and proposals to high school students in the Fargo–Moorhead area.

Read the document or text provided and reply with ONLY a json object matching this shape:
{
  "title": short plain-language name of the proposal (max 70 chars),
  "tldr": one sentence a 9th grader can read in 10 seconds,
  "plainEnglish": array of 3-5 short sentences explaining what it actually does,
  "pros": array of 2-4 short arguments in favor,
  "cons": array of 2-4 short arguments against,
  "affected": array of 2-4 objects { "group": who, "how": one short sentence },
  "whatYouCanDo": array of 2-3 short concrete actions a student could take
}
Rules: high school reading level, no jargon, stay neutral, never invent facts that are not in the document. If the text is not a policy document, still summarize what it is.`;

export const explainPolicy = createServerFn({ method: "POST" })
  .inputValidator((d: ExplainInput) => d)
  .handler(async ({ data }): Promise<PolicyExplanation> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured yet.");

    const text = (data.text ?? "").trim();
    if (!text && !data.file) {
      throw new Error("Paste some text or upload a document first.");
    }

    const content: Array<Record<string, unknown>> = [{ type: "text", text: PROMPT }];
    if (text) {
      content.push({ type: "text", text: `Document text:\n${text.slice(0, 120000)}` });
    }
    if (data.file) {
      if (data.file.mimeType.startsWith("image/")) {
        content.push({
          type: "image_url",
          image_url: {
            url: `data:${data.file.mimeType};base64,${data.file.dataBase64}`,
          },
        });
      } else {
        content.push({
          type: "file",
          file: {
            filename: data.file.name,
            file_data: `data:${data.file.mimeType};base64,${data.file.dataBase64}`,
          },
        });
      }
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [{ role: "user", content }],
        response_format: { type: "json_object" },
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      if (res.status === 429) throw new Error("Too many requests right now — try again in a minute.");
      if (res.status === 402) throw new Error("AI credits are exhausted. Ask the site owner to add credits.");
      throw new Error(`AI request failed (${res.status}): ${await res.text()}`);
    }

    // Accumulate the SSE stream server-side; only the final text is needed.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let out = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload);
          const delta = json?.choices?.[0]?.delta?.content;
          if (typeof delta === "string") out += delta;
        } catch {
          // ignore keep-alive / partial frames
        }
      }
    }

    const cleaned = out.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    let parsed: Partial<PolicyExplanation>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("The AI response could not be read. Try again.");
    }

    const arr = (v: unknown) =>
      Array.isArray(v) ? v.filter((x) => typeof x === "string").map(String) : [];

    return {
      title: typeof parsed.title === "string" ? parsed.title : "Policy summary",
      tldr: typeof parsed.tldr === "string" ? parsed.tldr : "",
      plainEnglish: arr(parsed.plainEnglish),
      pros: arr(parsed.pros),
      cons: arr(parsed.cons),
      affected: Array.isArray(parsed.affected)
        ? parsed.affected
            .filter((a): a is { group: string; how: string } => !!a && typeof a === "object")
            .map((a) => ({ group: String(a.group ?? ""), how: String(a.how ?? "") }))
        : [],
      whatYouCanDo: arr(parsed.whatYouCanDo),
    };
  });
