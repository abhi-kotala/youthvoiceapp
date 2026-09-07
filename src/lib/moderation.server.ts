import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

export type ModerationResult = {
  allowed: boolean;
  reason: string;
};

const BLOCKED_PATTERNS: { re: RegExp; reason: string }[] = [
  {
    re: /\b(fuck|shit|bitch|cunt|asshole|dick|nigg(a|er)|fag(got)?|whore|slut|retard)\b/i,
    reason: "It contains language that isn't allowed here. Please rewrite it without slurs or profanity.",
  },
  {
    re: /\b(kill|shoot|stab|beat up|hurt)\s+(you|him|her|them|yourself|everyone|all)\b/i,
    reason: "It reads as a threat of violence. Please make your point without threatening anyone.",
  },
  {
    re: /\b(kys|kill yourself)\b/i,
    reason: "It reads as a threat or self-harm encouragement. Please rewrite it respectfully.",
  },
];

function quickCheck(text: string): ModerationResult | null {
  for (const p of BLOCKED_PATTERNS) {
    if (p.re.test(text)) return { allowed: false, reason: p.reason };
  }
  return null;
}

const SYSTEM = `You moderate a civic discussion app used by high school students.
Decide whether a submission may be published.

BLOCK only if it contains: profanity or slurs, harassment or personal attacks,
hate speech, sexual content, threats or violence, encouragement of self-harm,
doxxing or personal contact info, spam/advertising, or content that is pure
nonsense/gibberish with no civic meaning.

ALLOW strong, one-sided, or controversial political opinions. Disagreement is
not a reason to block.

Reply with JSON only: {"allowed": true|false, "reason": "one short sentence addressed to the writer"}`;

/**
 * Checks user-submitted text before it is stored.
 * Falls back to allowing the post if the AI service is unavailable,
 * but the keyword screen above always applies.
 */
export async function moderateText(
  text: string,
  kind: "comment" | "topic",
): Promise<ModerationResult> {
  const clean = (text ?? "").trim();
  if (!clean) return { allowed: false, reason: "Write something first." };

  const quick = quickCheck(clean);
  if (quick) return quick;

  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return { allowed: true, reason: "" };

  try {
    const provider = createLovableAiGatewayProvider(key);
    const { text: raw } = await generateText({
      model: provider("google/gemini-2.5-flash-lite"),
      system: SYSTEM,
      prompt: `Submission type: ${kind}\n\n"""${clean.slice(0, 4000)}"""`,
      temperature: 0,
    });
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { allowed: true, reason: "" };
    const parsed = JSON.parse(match[0]) as { allowed?: boolean; reason?: string };
    if (parsed.allowed === false) {
      return {
        allowed: false,
        reason:
          (parsed.reason ?? "").trim().slice(0, 220) ||
          "This doesn't follow the community rules. Please rewrite it respectfully.",
      };
    }
    return { allowed: true, reason: "" };
  } catch (e) {
    console.error("moderateText failed", e);
    return { allowed: true, reason: "" };
  }
}
