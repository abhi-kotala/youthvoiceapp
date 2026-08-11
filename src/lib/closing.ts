export type ClosingInfo = {
  closed: boolean;
  label: string | null;
  urgent: boolean;
};

/** Human-friendly closing state for a topic. */
export function getClosingInfo(
  closesAt?: string | null,
  status?: string | null,
): ClosingInfo {
  if (status === "closed") return { closed: true, label: "Voting closed", urgent: false };
  if (!closesAt) return { closed: false, label: null, urgent: false };

  const end = new Date(closesAt).getTime();
  if (Number.isNaN(end)) return { closed: false, label: null, urgent: false };

  const ms = end - Date.now();
  if (ms <= 0) return { closed: true, label: "Voting closed", urgent: false };

  const hours = Math.floor(ms / 3600_000);
  if (hours < 1) return { closed: false, label: "Closes in under an hour", urgent: true };
  if (hours < 24)
    return { closed: false, label: `Closes in ${hours}h`, urgent: true };

  const days = Math.round(hours / 24);
  return {
    closed: false,
    label: `Closes in ${days} ${days === 1 ? "day" : "days"}`,
    urgent: days <= 3,
  };
}

export function formatCloseDate(closesAt?: string | null): string | null {
  if (!closesAt) return null;
  const d = new Date(closesAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
