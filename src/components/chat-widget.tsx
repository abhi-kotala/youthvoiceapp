import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Send, X, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "youthvoice_chat_messages_v1";

const QUICK_PROMPTS = [
  "Explain a city issue simply",
  "What are people saying?",
  "Help me write a proposal",
];

function loadMessages(): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as UIMessage[]) : [];
  } catch {
    return [];
  }
}

function partsToText(parts: UIMessage["parts"]): string {
  return parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

/** Holographic AI orb */
function CivvyOrb({ size = 56, busy = false }: { size?: number; busy?: boolean }) {
  return (
    <span
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className="absolute inset-0 rounded-full bg-primary/30 blur-lg animate-orb" />
      <span className="absolute inset-0 rounded-full border border-primary/50" />
      <span
        className="absolute inset-[14%] rounded-full bg-gradient-to-br from-primary via-primary/50 to-accent"
        style={{ animation: busy ? "yv-pulse 1s ease-in-out infinite" : undefined }}
      />
      <span className="absolute inset-[26%] rounded-full bg-background/50 backdrop-blur-sm" />
      <span className="absolute inset-[38%] rounded-full bg-primary shadow-[0_0_18px_var(--primary)]" />
      <span
        className="absolute inset-[4%] rounded-full border border-accent/45"
        style={{ transform: "rotate(28deg) scaleY(0.35)" }}
      />
      <span
        className="absolute inset-[4%] rounded-full border border-primary/35"
        style={{ transform: "rotate(-42deg) scaleY(0.28)" }}
      />
    </span>
  );
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setInitialMessages(loadMessages());
    setHydrated(true);
  }, []);

  const { messages, sendMessage, status, setMessages, error } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      /* ignore */
    }
  }, [messages, hydrated]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, status]);

  const isBusy = status === "submitted" || status === "streaming";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isBusy) return;
    sendMessage({ text });
    setInput("");
  };

  const clearChat = () => {
    setMessages([]);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-full border border-primary/30 bg-card/70 py-2 pl-2 pr-4 backdrop-blur-xl transition hover:-translate-y-0.5 glow-ring"
          aria-label="Open Civvy, the AI civic assistant"
        >
          <CivvyOrb size={44} />
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-bold leading-tight">Civvy</span>
            <span className="block text-[11px] leading-tight text-muted-foreground">
              Ask me anything civic
            </span>
          </span>
        </button>
      )}

      {open && (
        <div className="glass fixed bottom-5 right-5 z-50 flex h-[580px] max-h-[85vh] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-3xl">
          <div className="flex items-center justify-between border-b border-primary/15 px-4 py-3">
            <div className="flex items-center gap-3">
              <CivvyOrb size={38} busy={isBusy} />
              <div>
                <div className="text-sm font-bold">Civvy</div>
                <div className="text-[11px] text-muted-foreground">
                  {isBusy ? "Processing…" : "Holographic civic assistant"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clearChat}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                  aria-label="Clear conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                aria-label="Close Civvy"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 text-sm leading-relaxed text-foreground">
                  I'm <span className="font-semibold text-primary">Civvy</span>. I can break down a
                  local issue in plain English, summarize what the community is saying, answer civic
                  questions, or help you turn an idea into a real proposal.
                </div>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => sendMessage({ text: p })}
                      className="rounded-full border border-primary/25 px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/60 hover:text-primary"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => {
              const text = partsToText(m.parts);
              const isUser = m.role === "user";
              return (
                <div key={m.id} className={isUser ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={[
                      "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed",
                      isUser
                        ? "bg-primary text-primary-foreground"
                        : "border border-primary/15 bg-background/50 text-foreground",
                    ].join(" ")}
                  >
                    {text || <span className="opacity-60">…</span>}
                  </div>
                </div>
              );
            })}
            {status === "submitted" && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-primary/15 bg-background/50 px-3 py-2 text-sm text-primary">
                  Thinking…
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                Something went wrong. Please try again.
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2 border-t border-primary/15 p-3"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Ask Civvy…"
              rows={1}
              className="max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              disabled={isBusy}
            />
            <button
              type="submit"
              disabled={isBusy || !input.trim()}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
