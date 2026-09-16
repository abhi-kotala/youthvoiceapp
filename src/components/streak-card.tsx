import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { getDeviceId } from "@/lib/device-id";
import { useAuth } from "@/lib/auth-context";
import { getAccountStreak, getDeviceStreak } from "@/lib/leaderboard.functions";

export function StreakCard() {
  const { session, loading: authLoading } = useAuth();
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) return;
    const request = session
      ? getAccountStreak()
      : getDeviceStreak({ data: { deviceId: getDeviceId() } });
    request
      .then((r) => setStreak(r.streak))
      .catch(() => setStreak(0));
  }, [authLoading, session]);

  const value = streak ?? 0;

  return (
    <div className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm">
      <span
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${
          value > 0 ? "bg-orange-500/15 text-orange-500" : "bg-muted text-muted-foreground"
        }`}
      >
        <Flame className="h-7 w-7" />
      </span>
      <div className="min-w-0">
        <div className="text-2xl font-extrabold">
          {streak === null ? "—" : `${value} day${value === 1 ? "" : "s"}`}
        </div>
        <p className="text-sm text-muted-foreground">
          {value > 1
            ? "Current streak — take part again today to keep it alive."
            : value === 1
              ? "Streak started today. Come back tomorrow to build it."
              : "No streak yet. Vote or join a discussion to start one."}
        </p>
      </div>
    </div>
  );
}
