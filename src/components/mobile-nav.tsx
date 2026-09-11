import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { NotificationsButton } from "@/components/notifications-button";

const NAV_LINKS = [
  { to: "/", label: "Issues" },
  { to: "/submit", label: "Submit topic" },
  { to: "/explain", label: "Explain a policy" },
  { to: "/map", label: "Map" },
  { to: "/my-impact", label: "My Impact" },
  { to: "/newsletter", label: "Newsletter" },
  { to: "/about", label: "About" },
  { to: "/account", label: "Account" },
];

export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary transition hover:bg-primary/20"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-[280px] flex-col">
        <div className="mt-8 flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <SheetClose key={link.to} asChild>
              <Link
                to={link.to}
                className="rounded-lg px-3 py-3 text-base font-medium text-foreground transition hover:bg-secondary"
              >
                {link.label}
              </Link>
            </SheetClose>
          ))}
          <SheetClose asChild>
            <Link
              to="/admin"
              className="rounded-lg px-3 py-3 text-base font-medium text-muted-foreground transition hover:bg-secondary"
            >
              Admin
            </Link>
          </SheetClose>
        </div>

        <div className="mt-auto border-t border-border pt-4">
          <div className="flex items-center justify-between px-3">
            <span className="text-sm font-medium text-muted-foreground">Notifications</span>
            <NotificationsButton />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
