import { useEffect, useState } from "react";
import { getDeviceId } from "@/lib/device-id";
import { computeBadges, levelFor, type ImpactStats } from "@/lib/impact";
import { getMyImpact } from "@/lib/impact.functions";
import { getAccountImpact } from "@/lib/account.functions";
import { useAuth } from "@/lib/auth-context";

export function ImpactProgressCard() {
  const { session, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<ImpactStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    const deviceId = getDeviceId();
    const request = session ? getAccountImpact() : getMyImpact({ data: { deviceId } });
    request
      .then((r) => setStats({ points: r.points, counts: r.counts as ImpactStats["counts"] }))
      .catch(() => setStats({ points: 0, counts: {} }))
      .finally(() => setLoading(false));
  }, [authLoading, session]);

  if (loading) {
    return (
      <div className="rounded-2xl border bg-card p-6 shadow-sm animate-pulse h-48" />
    );
  }
  const s = stats ?? { points: 0, counts: {} };
  const { current, next, progress } = levelFor(s.points);
  const badges = computeBadges(s);
  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Your Civic Impact
          </div>
          <div className="mt-1 text-2xl font-bold">
            Level {current.level} — {current.name}
          </div>
          <div className="text-sm text-muted-foreground">{current.tagline}</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-extrabold text-primary">{s.points}</div>
          <div className="text-xs text-muted-foreground">Impact Points</div>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Level {current.level}</span>
          <span>
            {next ? `${next.min - s.points} pts to Level ${next.level} — ${next.name}` : "Max level reached"}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold mb-2">
          Badges {earnedCount > 0 && <span className="text-muted-foreground font-normal">({earnedCount}/{badges.length})</span>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {badges.map((b) => (
            <div
              key={b.id}
              className={`rounded-xl border p-3 text-center transition ${
                b.earned ? "bg-primary/10 border-primary/40" : "bg-muted/30 opacity-60"
              }`}
              title={b.description}
            >
              <div className="text-2xl">{b.emoji}</div>
              <div className="mt-1 text-xs font-medium leading-tight">{b.name}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground leading-tight">
                {b.earned ? "Earned" : b.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
