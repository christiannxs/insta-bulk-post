import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    let cancelled = false;

    const setLoadingFalse = () => {
      if (!cancelled) setLoading(false);
    };

    const timeoutId = setTimeout(setLoadingFalse, 8000);

    try {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        setLoadingFalse();
      });
      subscription = data.subscription;
    } catch {
      setLoadingFalse();
      clearTimeout(timeoutId);
      return () => {};
    }

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!cancelled) setUser(session?.user ?? null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        setLoadingFalse();
        clearTimeout(timeoutId);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      subscription?.unsubscribe?.();
    };
  }, []);

  const signOut = () => supabase.auth.signOut();

  return { user, loading, signOut };
}
