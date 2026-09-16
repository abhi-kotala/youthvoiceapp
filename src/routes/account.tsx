import { useEffect, useRef, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, Camera, LogOut, Sparkles } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  getAccountImpact,
  getAccountProfile,
  updateAccountProfile,
} from "@/lib/account.functions";
import { levelForPoints } from "@/lib/impact";

export const Route = createFileRoute("/account")({
  component: AccountPage,
  head: () => ({
    meta: [
      { title: "Your profile — YouthVoice" },
      {
        name: "description",
        content:
          "Your YouthVoice profile: photo, handle, Civic Impact Points and the day you joined.",
      },
      { property: "og:title", content: "Your profile — YouthVoice" },
      {
        property: "og:description",
        content: "Set your photo and handle, and keep your Impact Points across devices.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type ProfileState = {
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  memberSince: string | null;
};

function AccountPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [profile, setProfile] = useState<ProfileState>({
    displayName: "",
    handle: "",
    avatarUrl: null,
    memberSince: null,
  });
  const [points, setPoints] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function loadProfile() {
    const data = await getAccountProfile();
    if (!data) return;
    setDisplayName(data.display_name ?? "");
    setHandle(data.handle ?? "");
    setProfile({
      displayName: data.display_name ?? "",
      handle: data.handle ?? "",
      avatarUrl: data.avatar_url,
      memberSince: data.member_since,
    });
  }

  useEffect(() => {
    if (!session) return;
    loadProfile().catch(() => {});
    getAccountImpact()
      .then((res) => setPoints(res.points))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setMessage(null);
    try {
      await updateAccountProfile({ data: { displayName, handle: handle || null } });
      await loadProfile();
      setMessage("Your profile was saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setBusy(false);
    }
  }

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !session) return;
    if (!file.type.startsWith("image/")) {
      setError("Pick an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Photos need to be under 2 MB.");
      return;
    }
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${session.user.id}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw new Error(uploadError.message);
      await updateAccountProfile({
        data: { displayName: displayName || "YouthVoice member", handle: handle || null, avatarPath: path },
      });
      await loadProfile();
      setMessage("Profile photo updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload that photo.");
    } finally {
      setUploading(false);
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

  const initials = (profile.displayName || session?.user.email || "Y")
    .trim()
    .slice(0, 1)
    .toUpperCase();
  const memberSince = profile.memberSince
    ? new Date(profile.memberSince).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;
  const level = points === null ? null : levelForPoints(points);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
        <div className="mb-6">
          <p className="text-sm font-semibold text-primary">Your profile</p>
          <h1 className="mt-1 font-display text-3xl font-bold">
            {session ? "Your YouthVoice profile" : "Keep your impact with you"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {session
              ? "Your photo and handle show up on the topics you post. Your points follow you on every device."
              : "Your anonymous points stay on this device without a profile. Sign in to keep them when you switch phones or computers."}
          </p>
        </div>

        {message && <Alert className="mb-4 border-primary/40 bg-primary/10"><CheckCircle2 /><AlertDescription>{message}</AlertDescription></Alert>}
        {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}

        {loading ? (
          <div className="h-64 animate-pulse rounded-lg border bg-card" />
        ) : session ? (
          <div className="space-y-6">
            <section className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt="Your profile photo"
                      className="h-20 w-20 rounded-full border-2 border-primary/30 object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/30 bg-secondary font-display text-2xl font-bold text-primary">
                      {initials}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    aria-label="Change profile photo"
                    className="absolute -bottom-1 -right-1 rounded-full bg-primary p-2 text-primary-foreground shadow disabled:opacity-60"
                  >
                    <Camera size={14} />
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={onPickPhoto}
                    className="hidden"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-display text-xl font-bold">
                    {profile.displayName || "YouthVoice member"}
                  </p>
                  {profile.handle && (
                    <p className="truncate text-sm text-primary">@{profile.handle}</p>
                  )}
                  <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
                </div>
              </div>
              {uploading && (
                <p className="mt-3 text-xs text-muted-foreground">Uploading photo…</p>
              )}

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border bg-secondary/50 p-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Sparkles size={13} /> Impact Points
                  </div>
                  <p className="mt-1 font-display text-2xl font-bold">
                    {points === null ? "—" : points}
                  </p>
                  {level && (
                    <p className="text-xs text-muted-foreground">
                      {level.emoji} {level.name}
                    </p>
                  )}
                </div>
                <div className="rounded-xl border bg-secondary/50 p-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <CalendarDays size={13} /> Member since
                  </div>
                  <p className="mt-1 text-sm font-semibold">
                    {memberSince ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">YouthVoice member</p>
                </div>
              </div>
            </section>

            <form onSubmit={saveProfile} className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Display name</Label>
                <Input id="profile-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-handle">Handle</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">@</span>
                  <Input
                    id="profile-handle"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                    maxLength={20}
                    placeholder="yourhandle"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  3–20 letters, numbers or underscores. Shown on topics you post.
                </p>
              </div>
              <Button type="submit" disabled={busy}>Save profile</Button>
            </form>

            <div className="rounded-2xl border bg-card p-6 shadow-sm">
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
