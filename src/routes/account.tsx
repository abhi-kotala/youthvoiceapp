import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, LogOut, ShieldCheck } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { getAccountProfile, updateAccountProfile } from "@/lib/account.functions";

export const Route = createFileRoute("/account")({
  component: AccountPage,
  head: () => ({
    meta: [
      { title: "Account — YouthVoice" },
      { name: "description", content: "Create an optional YouthVoice account to keep your Civic Impact Points across devices." },
      { property: "og:title", content: "Account — YouthVoice" },
      { property: "og:description", content: "Save your YouthVoice Impact Points across devices." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AccountPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) return;
    getAccountProfile()
      .then((profile) => setDisplayName(profile?.display_name ?? ""))
      .catch(() => {});
  }, [session]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    if (mode === "signup" && !displayName.trim()) {
      setError("Add a display name.");
      setBusy(false);
      return;
    }
    const result = mode === "signup"
      ? await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName.trim() },
          },
        })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (result.error) setError(result.error.message);
    else if (mode === "signup" && !result.data.session) {
      setMessage("Check your email and confirm your account. Your points will connect when you sign in.");
    }
    setBusy(false);
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await updateAccountProfile({ data: { displayName } });
      setMessage("Your profile was saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  async function sendReset() {
    if (!email.trim()) {
      setError("Enter your email first.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (resetError) setError(resetError.message);
    else setMessage("Check your email for a password reset link.");
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
        <div className="mb-6">
          <p className="text-sm font-semibold text-primary">Optional account</p>
          <h1 className="mt-1 font-display text-3xl font-bold">Keep your impact with you</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Your anonymous points stay on this device without an account. Sign in to keep them when you switch phones or computers.
          </p>
        </div>

        {message && <Alert className="mb-4 border-primary/40 bg-primary/10"><CheckCircle2 /><AlertDescription>{message}</AlertDescription></Alert>}
        {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}

        {loading ? (
          <div className="h-64 animate-pulse rounded-lg border bg-card" />
        ) : session ? (
          <div className="space-y-5 rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold">Impact Points are synced</h2>
                <p className="mt-1 break-all text-sm text-muted-foreground">{session.user.email}</p>
              </div>
            </div>
            <form onSubmit={saveProfile} className="space-y-3">
              <Label htmlFor="profile-name">Display name</Label>
              <Input id="profile-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} required />
              <Button type="submit" disabled={busy}>Save profile</Button>
            </form>
            <div className="border-t pt-4">
              <Button type="button" variant="outline" onClick={signOut} disabled={busy}><LogOut />Sign out</Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="mb-5 grid grid-cols-2 rounded-md bg-secondary p-1">
              <Button type="button" variant={mode === "signin" ? "default" : "ghost"} onClick={() => { setMode("signin"); setError(null); }}>Sign in</Button>
              <Button type="button" variant={mode === "signup" ? "default" : "ghost"} onClick={() => { setMode("signup"); setError(null); }}>Create account</Button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && <div className="space-y-2"><Label htmlFor="display-name">Display name</Label><Input id="display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} autoComplete="nickname" required /></div>}
              <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></div>
              <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required /></div>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</Button>
              {mode === "signin" && <Button type="button" variant="link" className="w-full" onClick={sendReset} disabled={busy}>Forgot password?</Button>}
            </form>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}