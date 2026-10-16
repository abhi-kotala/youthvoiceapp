import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { STATE_CODES, submitCityRequest } from "@/lib/community-requests.functions";

export const Route = createFileRoute("/request-city")({
  head: () => ({
    meta: [
      { title: "Bring YouthVoice to your city" },
      { name: "description", content: "Request YouthVoice for your city, town, or school community. Every request is reviewed before a city goes live." },
      { property: "og:title", content: "Bring YouthVoice to your city" },
      { property: "og:description", content: "Ask for YouthVoice polls and debates in your community. Requests are reviewed by hand." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RequestCityPage,
});

function RequestCityPage() {
  const send = useServerFn(submitCityRequest);
  const [form, setForm] = useState({ cityName: "", stateCode: "", requesterRole: "student", organization: "", contactEmail: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await send({ data: form });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-10">
        <h1 className="font-display text-3xl font-extrabold">Bring YouthVoice to your city</h1>
        <p className="mt-3 text-muted-foreground">
          Want polls and debates for young people where you live? Send a request. Each one is reviewed by hand.
          Sending a request doesn't mean your city government is involved or has partnered with YouthVoice.
        </p>
        {done ? (
          <div className="mt-8 rounded-xl border border-primary/30 bg-card/60 p-6">
            <h2 className="font-display text-xl font-bold">Request received</h2>
            <p className="mt-2 text-sm text-muted-foreground">Thanks! We'll reach out at the email you gave if your city moves forward.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div className="space-y-2">
                <Label htmlFor="city">City or town</Label>
                <Input id="city" value={form.cityName} onChange={set("cityName")} maxLength={80} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <select id="state" value={form.stateCode} onChange={set("stateCode")} required className="h-10 rounded-md border border-input bg-background px-2 text-sm">
                  <option value="">—</option>
                  {STATE_CODES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">I am a…</Label>
              <select id="role" value={form.requesterRole} onChange={set("requesterRole")} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="student">Student</option>
                <option value="teacher">Teacher or school staff</option>
                <option value="parent">Parent or guardian</option>
                <option value="youth_org">Youth organization</option>
                <option value="city_staff">City or government staff</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="org">School or organization (optional)</Label>
              <Input id="org" value={form.organization} onChange={set("organization")} maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Contact email</Label>
              <Input id="email" type="email" value={form.contactEmail} onChange={set("contactEmail")} required />
              <p className="text-xs text-muted-foreground">Students: a parent's, teacher's, or school email is a good choice. It's only used to follow up about this request.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="msg">Why your community? (optional)</Label>
              <Textarea id="msg" rows={4} value={form.message} onChange={set("message")} maxLength={1000} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full">{busy ? "Sending…" : "Send request"}</Button>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
