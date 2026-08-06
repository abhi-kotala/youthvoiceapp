import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

export type CoachFeedback = {
  score: number;
  tone: "respectful" | "needs-work" | "harsh";
  strengths: string[];
  evidence: string[];
  fallacies: { name: string; why: string }[];
  respect: string[];
  rewrite: string;
};

type CoachInput = {
  draft: string;
  stance: "agree" | "disagree" | "neutral";
  issueTitle: string;
};

const EMPTY: CoachFeedback = {
  score: 0,
  tone: "needs-work",
  strengths: [],
  evidence: [],
  fallacies: [],
  respect: [],
  rewrite: "",
};

function extractJson(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced?.[1] ?? text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

function asStrings(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((s) => s.trim().slice(0, 220))
    .slice(0, max);
}

export const coachComment = createServerFn({ method: "POST" })
  .inputValidator((d: CoachInput) => d)
  .handler(async ({ data }): Promise<CoachFeedback> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured");

    const draft = String(data.draft ?? "").trim().slice(0, 2000);
    if (draft.length < 15) {
      throw new Error("Write a bit more first — at least a sentence or two.");
    }

    const gateway = createLovableAiGatewayProvider(key);
    const { text } = await generateText({
      model: gateway("google/gemini-3.6-flash"),
      system:
        "You are a debate coach for high school students in a civic app. You coach the argument, never take a political side. Be encouraging and specific. Never insult the student. Reply with JSON only.",
      prompt: `Issue being debated: "${data.issueTitle}"
Student's stance: ${data.stance}
Student's draft comment:
"""
${draft}
"""

Return ONLY a JSON object with these keys:
{
  "score": number 1-10 for how clear and constructive the argument is,
  "tone": one of "respectful", "needs-work", "harsh",
  "strengths": array of up to 2 short sentences on what works,
  "evidence": array of up to 3 short, concrete suggestions for stronger evidence or specifics they could add (local data, personal experience, examples). Do not invent statistics — suggest what kind of evidence to look for,
  "fallacies": array of up to 3 objects {"name": short fallacy name, "why": one short sentence explaining where it shows up}. Empty array if none,
  "respect": array of up to 3 short notes on respectful language, or an empty array if the tone is already respectful,
  "rewrite": a stronger version of their comment in their own voice, same stance, under 120 words
}
Keep every string short and plain-spoken. No markdown, no preamble.`,
    });

    const parsed = extractJson(text) as Record<string, unknown> | null;
    if (!parsed) return { ...EMPTY, rewrite: "" };

    const rawScore = Number(parsed["score"]);
    const tone = parsed["tone"];
    const fallacies = Array.isArray(parsed["fallacies"])
      ? (parsed["fallacies"] as unknown[])
          .map((f) => {
            const o = f as Record<string, unknown>;
            return {
              name: String(o?.["name"] ?? "").slice(0, 60),
              why: String(o?.["why"] ?? "").slice(0, 220),
            };
          })
          .filter((f) => f.name)
          .slice(0, 3)
      : [];

    return {
      score: Number.isFinite(rawScore) ? Math.min(10, Math.max(1, Math.round(rawScore))) : 5,
      tone:
        tone === "respectful" || tone === "harsh" || tone === "needs-work"
          ? tone
          : "needs-work",
      strengths: asStrings(parsed["strengths"], 2),
      evidence: asStrings(parsed["evidence"], 3),
      fallacies,
      respect: asStrings(parsed["respect"], 3),
      rewrite: String(parsed["rewrite"] ?? "").trim().slice(0, 1200),
    };
  });
