import { STATUS_LABEL, STATUS_HELP, type CityStatus } from "@/lib/cities";
import { cn } from "@/lib/utils";

const STYLE: Record<CityStatus, string> = {
  official: "border-primary/50 bg-primary/15 text-primary",
  pilot: "border-accent/50 bg-accent/15 text-accent-foreground",
  listed: "border-border bg-muted text-muted-foreground",
  pending: "border-border bg-secondary text-secondary-foreground",
};

export function CityStatusBadge({ status, className }: { status: CityStatus; className?: string }) {
  return (
    <span
      title={STATUS_HELP[status]}
      className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", STYLE[status], className)}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
