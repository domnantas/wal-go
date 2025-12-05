import { useSystem } from "@/lib/powersync/system";
import { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

export function useAuth() {
  const system = useSystem();
  const [session, setSession] = useState<Session | null>(null);
  const supabase = system.supabaseConnector.client;

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const userId = session?.user?.id ?? null;

  return {
    supabase,
    session,
    userId,
    isSignedIn: !!session,
    signOut,
  };
}
