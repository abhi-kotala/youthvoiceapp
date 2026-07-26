import { Link } from "@tanstack/react-router";
import { NotificationsButton } from "@/components/notifications-button";
import { MobileNav } from "@/components/mobile-nav";

const NAV_LINKS = [
  { to: "/", label: "Issues" },
  { to: "/newsletter", label: "Newsletter" },
  { to: "/about", label: "About" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:py-4">
        <Link to="/" className="flex min-w-0 items-baseline gap-2">
          <span className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">
            Youth<span className="text-accent">Voice</span>
          </span>
          <span className="hidden text-xs uppercase tracking-widest opacity-70 sm:inline">
            Under-18 Poll
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-md px-3 py-2 text-sm font-medium underline-offset-4 transition hover:bg-primary-foreground/10 hover:underline"
            >
              {link.label}
            </Link>
          ))}
          <div className="ml-2 flex items-center">
            <NotificationsButton />
          </div>
        </nav>

        {/* Mobile nav */}
        <div className="flex items-center gap-2 sm:hidden">
          <NotificationsButton />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-secondary">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-6 sm:grid-cols-2 sm:gap-8">
          <div>
            <Link to="/" className="font-display text-lg font-extrabold tracking-tight text-foreground">
              Youth<span className="text-accent">Voice</span>
            </Link>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Built by a student. Results from each poll are delivered
              to our city council and mayor's office. No accounts required — your
              voice still counts.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:justify-items-end">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Explore
              </h4>
              <ul className="mt-2 space-y-1.5">
                {NAV_LINKS.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Manage
              </h4>
              <ul className="mt-2 space-y-1.5">
                <li>
                  <Link
                    to="/admin"
                    className="text-sm text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Admin
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Youth Voice. Made for Fargo, West Fargo, and Moorhead.
        </div>
      </div>
    </footer>
  );
}
