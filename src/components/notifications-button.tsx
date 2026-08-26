import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { requestPushToken } from "@/lib/firebase";
import { registerPushToken } from "@/lib/push.functions";
import { getDeviceId } from "@/lib/device-id";
import { toast } from "sonner";

type State = "idle" | "unsupported" | "denied" | "granted" | "loading";

export function NotificationsButton() {
  const [state, setState] = useState<State>("idle");
  const register = useServerFn(registerPushToken);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "granted") setState("granted");
    else if (Notification.permission === "denied") setState("denied");
  }, []);

  if (state === "unsupported" || state === "granted") return null;

  async function handleClick() {
    setState("loading");
    try {
      const token = await requestPushToken();
      if (!token) {
        setState(Notification.permission === "denied" ? "denied" : "idle");
        toast.error("Notifications blocked. Enable them in your browser settings.");
        return;
      }
      await register({ data: { deviceId: getDeviceId(), token } });
      setState("granted");
      toast.success("You'll be notified when new issues are posted.");
    } catch (e) {
      console.error(e);
      setState("idle");
      toast.error("Couldn't enable notifications.");
    }
  }

  const label =
    state === "loading" ? "Enabling…" : state === "denied" ? "Notifications blocked" : "Notify me";

  return (
    <button
      onClick={handleClick}
      disabled={state === "loading" || state === "denied"}
      aria-label={label}
      title={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary transition hover:bg-primary/20 disabled:opacity-50 sm:h-auto sm:w-auto sm:gap-1.5 sm:rounded-full sm:px-3 sm:py-1.5 sm:text-xs sm:font-medium"
    >
      <Bell className="h-4 w-4 shrink-0" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
