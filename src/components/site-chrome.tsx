import { Link } from "@tanstack/react-router";
import { NotificationsButton } from "@/components/notifications-button";
import { MobileNav } from "@/components/mobile-nav";
import { AccountButton } from "@/components/account-button";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/explore", label: "Explore" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/insights", label: "Insights" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex min-w-0 items-baseline gap-2">
          <span className="font-display text-xl font-extrabold tracking-tight text-accent sm:text-2xl">
            Youth<span className="text-primary">Voice</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <div className="ml-2 flex items-center gap-2">
            <NotificationsButton />
            <AccountButton />
            <Link
              to="/bring-youth-voice"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Bring Youth Voice to Your Community
            </Link>
          </div>
        </nav>

        {/* Mobile nav */}
        <div className="flex items-center gap-2 sm:hidden">
          <NotificationsButton />
          <AccountButton />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}

const FOOTER_LINKS = [
  { to: "/about", label: "About" },
  { to: "/explore", label: "Explore Communities" },
  { to: "/bring-youth-voice", label: "Request Your City" },
  { to: "/about", label: "Privacy" },
  { to: "/about", label: "Contact" },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <Link to="/" className="font-display text-lg font-extrabold tracking-tight text-accent">
              Youth<span className="text-primary">Voice</span>
            </Link>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Built by a student. Results from each poll are delivered to local decision-makers.
              No account required — your voice still counts.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="text-sm text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-8 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Youth Voice. Made for Fargo, West Fargo, and Moorhead.
        </div>
      </div>
    </footer>
  );
}
