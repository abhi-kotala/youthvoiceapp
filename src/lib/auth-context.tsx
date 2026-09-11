import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/device-id";
import { connectCurrentDevice } from "@/lib/account.functions";

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue>({ session: null, loading: true });

async function connectDevice(session: Session) {
  const metadataName = session.user.user_metadata?.display_name;
  const fallbackName = session.user.email?.split("@")[0] || "YouthVoice member";
  await connectCurrentDevice({
    data: {
      deviceId: getDeviceId(),
      displayName: typeof metadataName === "string" ? metadataName : fallbackName,
    },
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
      if (data.session) connectDevice(data.session).catch(console.error);
    });
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setSession(nextSession);
      setLoading(false);
      if (nextSession && event !== "SIGNED_OUT") connectDevice(nextSession).catch(console.error);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ session, loading }), [session, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}