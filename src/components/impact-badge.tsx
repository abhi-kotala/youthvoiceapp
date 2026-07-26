import { cn } from "@/lib/utils";

export type ImpactStatus =
  | "none"
  | "discussing"
  | "under_review"
  | "implemented";

const CONFIG: Record<
  ImpactStatus,
  { label: string; icon: string; className: string }
> = {
  none: {
    label: "Awaiting response",
    icon: "⏳",
    className: "bg-muted text-muted-foreground",
  },
  discussing: {
    label: "Being discussed",
    icon: "🔵",
    className: "bg-[oklch(0.92_0.05_240)] text-[oklch(0.35_0.15_240)]",
  },
  under_review: {
    label: "Under review",
    icon: "🟡",
    className: "bg-[oklch(0.94_0.09_85)] text-[oklch(0.35_0.15_65)]",
  },
  implemented: {
    label: "Implemented",
    icon: "🟢",
    className: "bg-[oklch(0.9_0.09_155)] text-[oklch(0.28_0.12_155)]",
  },
};

export function ImpactBadge({
  status,
  className,
  showLabel = true,
}: {
  status: string | null | undefined;
  className?: string;
  showLabel?: boolean;
}) {
  const key = (status ?? "none") as ImpactStatus;
  const cfg = CONFIG[key] ?? CONFIG.none;
  if (key === "none" && !className) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        cfg.className,
        className,
      )}
    >
      <span aria-hidden>{cfg.icon}</span>
      {showLabel && <span>{cfg.label}</span>}
    </span>
  );
}

export const IMPACT_STATUSES: {
  value: ImpactStatus;
  label: string;
}[] = [
  { value: "none", label: "No update" },
  { value: "discussing", label: "🔵 Being discussed" },
  { value: "under_review", label: "🟡 Under review" },
  { value: "implemented", label: "🟢 Implemented" },
];
