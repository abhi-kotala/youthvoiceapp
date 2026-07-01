import { Link } from "@tanstack/react-router";
import { NotificationsButton } from "@/components/notifications-button";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="text-xl font-bold tracking-tight">CivicVoice</span>
          <span className="hidden text-xs uppercase tracking-widest opacity-70 sm:inline">
            Under-18 Poll
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <NotificationsButton />
          <Link
            to="/about"
            className="hidden text-sm font-medium underline-offset-4 hover:underline sm:inline"
          >
            About
          </Link>
          <Link
            to="/"
            className="text-sm font-medium underline-offset-4 hover:underline"
          >
            Issues
          </Link>
        </div>

      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-secondary">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground">
        <p>
          Built by a high schooler. Results from each poll are delivered to our
          city council and mayor's office. No accounts required — your voice
          still counts.
        </p>
        <Link to="/admin" className="text-xs opacity-60 hover:underline">
          Admin
        </Link>
      </div>
    </footer>
  );
}
