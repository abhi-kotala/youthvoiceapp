import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ORG_TYPES, STATE_CODES, submitCityRequest } from "@/lib/community-requests.functions";
import { getDeviceId } from "@/lib/device-id";

export const Route = createFileRoute("/request-city")({
  head: () => ({
    meta: [
      { title: "Bring YouthVoice to your city" },
      { name: "description", content: "Apply to bring YouthVoice to your city, youth council, school, or organization. Every application is reviewed by hand." },
      { property: "og:title", content: "Bring YouthVoice to your city" },
      { property: "og:description", content: "Cities, youth councils, and community groups can apply to run YouthVoice polls and debates. Applications are reviewed by hand." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RequestCityPage,
});

const empty = {
  cityName: "", stateCode: "", orgType: "", organization: "", contactName: "",
  contactEmail: "", contactPhone: "", message: "", engagementPlan: "", website: "",
};

function RequestCityPage() {
  const send = useServerFn(submitCityRequest);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const sel = "h-10 w-full rounded-md border border-input bg-background px-2 text-sm";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await send({ data: { ...form, deviceId: getDeviceId() } });
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
          Cities, youth councils, schools, and community organizations can apply. Each application is reviewed by hand.
          Applying does not create a partnership, and no city is listed as an Official Partner until it's verified.
        </p>
        {done ? (
          <div className="mt-8 rounded-xl border border-primary/30 bg-card/60 p-6">
            <h2 className="font-display text-xl font-bold">Application received</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Thanks! We'll review it and reach out at the email you gave. Nothing goes public until it's approved.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="grid grid-cols-[1fr_6rem] gap-3">
              <div className="space-y-2">
                <Label htmlFor="city">City or community</Label>
                <Input id="city" value={form.cityName} onChange={set("cityName")} maxLength={80} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <select id="state" value={form.stateCode} onChange={set("stateCode")} required className={sel}>
                  <option value="">—</option>
                  {STATE_CODES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Organization type</Label>
              <select id="type" value={form.orgType} onChange={set("orgType")} required className={sel}>
                <option value="">Choose…</option>
                {Object.entries(ORG_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="org">Organization name (optional)</Label>
              <Input id="org" value={form.organization} onChange={set("organization")} maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Contact person</Label>
              <Input id="name" value={form.contactName} onChange={set("contactName")} maxLength={100} required />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Work or school email</Label>
                <Input id="email" type="email" value={form.contactEmail} onChange={set("contactEmail")} maxLength={200} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Work phone (optional)</Label>
                <Input id="phone" type="tel" value={form.contactPhone} onChange={set("contactPhone")} maxLength={25} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Students: please use a teacher's, parent's, or school contact.</p>
            <div className="space-y-2">
              <Label htmlFor="msg">Why do you want to join YouthVoice?</Label>
              <Textarea id="msg" rows={4} value={form.message} onChange={set("message")} maxLength={1000} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan">How will you engage young people?</Label>
              <Textarea id="plan" rows={4} value={form.engagementPlan} onChange={set("engagementPlan")} maxLength={1000} required />
            </div>
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="website">Website</label>
              <input id="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
            </div>
            <div className="rounded-lg border border-border bg-card/40 p-3 text-xs text-muted-foreground">
              <b>Privacy:</b> your contact details are only seen by the YouthVoice platform admin, are never shown publicly,
              and are only used to follow up on this application. Contact details on closed applications are removed after one year.
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full">{busy ? "Sending…" : "Send application"}</Button>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
