import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    let cancelled = false;

    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        initialLoadDone.current = true;
        setLoading(false);
      }
    }, 5000);

    // 1) Primeiro obtém a sessão atual (fonte confiável na carga da página)
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!cancelled) {
          setUser(session?.user ?? null);
          initialLoadDone.current = true;
          setLoading(false);
          clearTimeout(timeoutId);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          initialLoadDone.current = true;
          setLoading(false);
          clearTimeout(timeoutId);
        }
      });

    // 2) Depois escuta mudanças; evita aplicar INITIAL_SESSION null antes do getSession()
    try {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (cancelled) return;
        // Na carga inicial, ignora INITIAL_SESSION para não sobrescrever com null
        // (getSession já define o user; o listener pode disparar antes do storage estar pronto)
        if (event === "INITIAL_SESSION" && !initialLoadDone.current) return;
        setUser(session?.user ?? null);
        if (!initialLoadDone.current) {
          initialLoadDone.current = true;
          setLoading(false);
          clearTimeout(timeoutId);
        }
      });
      subscription = data.subscription;
    } catch {
      if (!cancelled) {
        initialLoadDone.current = true;
        setLoading(false);
        clearTimeout(timeoutId);
      }
      return () => {
        cancelled = true;
        clearTimeout(timeoutId);
      };
    }

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      subscription?.unsubscribe?.();
    };
  }, []);

  const signOut = () => supabase.auth.signOut();

  return { user, loading, signOut };
}
