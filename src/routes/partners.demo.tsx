import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { submitDemoRequest } from "@/lib/partners.functions";
import { STATE_CODES } from "@/lib/community-requests.functions";
import { getDeviceId } from "@/lib/device-id";

export const Route = createFileRoute("/partners/demo")({
  head: () => ({
    meta: [
      { title: "Request a YouthVoice demo" },
      { name: "description", content: "Ask for a walkthrough of YouthVoice for your city, youth council, school or organization." },
      { property: "og:title", content: "Request a YouthVoice demo" },
      { property: "og:description", content: "See how youth civic polls and privacy-protected results work." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Demo,
});

function Demo() {
  const send = useServerFn(submitDemoRequest);
  const [f, setF] = useState({ name: "", organization: "", email: "", stateCode: "", message: "", website: "" });
  const [busy, setBusy] = useState(false); const [done, setDone] = useState(false); const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try { await send({ data: { ...f, deviceId: getDeviceId() } }); setDone(true); } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-10">
        <h1 className="font-display text-3xl font-extrabold">Request a demo</h1>
        {done ? (
          <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-5 text-sm">Thanks! Your request was received, and the founder will reply personally by email. Sending a request doesn't create a partnership. <Link to="/partners" className="text-primary underline">Back to partners</Link></div>
        ) : (
          <form onSubmit={submit} className="mt-6 grid gap-4">
            <div><Label htmlFor="n">Your name</Label><Input id="n" value={f.name} onChange={set("name")} maxLength={100} required /></div>
            <div><Label htmlFor="o">Organization</Label><Input id="o" value={f.organization} onChange={set("organization")} maxLength={120} required /></div>
            <div><Label htmlFor="e">Work email</Label><Input id="e" type="email" value={f.email} onChange={set("email")} maxLength={200} required /></div>
            <div><Label htmlFor="s">State (optional)</Label><select id="s" value={f.stateCode} onChange={set("stateCode")} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"><option value="">—</option>{STATE_CODES.map((s) => <option key={s}>{s}</option>)}</select></div>
            <div><Label htmlFor="m">What would you like to see? (optional)</Label><Textarea id="m" rows={4} value={f.message} onChange={set("message")} maxLength={1000} /></div>
            <input type="text" tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} className="hidden" aria-hidden />
            <p className="text-xs text-muted-foreground">We use these details only to reply to you. We never sell or share them, and we won't add you to a mailing list.</p>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <Button type="submit" disabled={busy}>{busy ? "Sending…" : "Send request"}</Button>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
