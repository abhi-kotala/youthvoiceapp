import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Reset password — YouthVoice" },
      { name: "description", content: "Choose a new password for your YouthVoice account." },
      { property: "og:title", content: "Reset password — YouthVoice" },
      { property: "og:description", content: "Choose a new YouthVoice password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ResetPasswordPage() {
  const [recovery, setRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hashType = new URLSearchParams(window.location.hash.slice(1)).get("type");
    const queryType = new URLSearchParams(window.location.search).get("type");
    setRecovery(hashType === "recovery" || queryType === "recovery");
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) setError(updateError.message);
    else setMessage("Your password was updated. You can return to your account.");
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-12">
        <h1 className="font-display text-3xl font-bold">Reset your password</h1>
        <p className="mt-2 text-sm text-muted-foreground">Choose a new password for your YouthVoice account.</p>
        {message ? (
          <Alert className="mt-6 border-primary/40 bg-primary/10"><AlertDescription>{message} <Link to="/account" className="font-semibold underline">Go to account</Link></AlertDescription></Alert>
        ) : recovery ? (
          <form onSubmit={submit} className="mt-6 space-y-4 rounded-lg border bg-card p-6">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="space-y-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} autoComplete="new-password" required /></div>
            <div className="space-y-2"><Label htmlFor="confirm-password">Confirm password</Label><Input id="confirm-password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} autoComplete="new-password" required /></div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Updating…" : "Update password"}</Button>
          </form>
        ) : (
          <Alert className="mt-6"><AlertDescription>This reset link is missing or has expired. Request a new link from the account page.</AlertDescription></Alert>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}