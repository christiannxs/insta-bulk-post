import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);
  const recoverInProgress = useRef(false);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    let cancelled = false;

    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        initialLoadDone.current = true;
        setLoading(false);
      }
    }, 5000);

    const applySession = (session: { user: User } | null) => {
      if (!cancelled) setUser(session?.user ?? null);
    };

    const finishInitialLoad = () => {
      if (!cancelled && !initialLoadDone.current) {
        initialLoadDone.current = true;
        setLoading(false);
        clearTimeout(timeoutId);
      }
    };

    // 1) Sessão inicial apenas por getSession (evita race com INITIAL_SESSION)
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!cancelled) {
          applySession(session);
          finishInitialLoad();
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          finishInitialLoad();
        }
      });

    // 2) Um único listener em todo o app; se vier null, tenta refresh antes de deslogar
    try {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (cancelled) return;
        if (event === "INITIAL_SESSION" && !initialLoadDone.current) return;

        if (session != null) {
          applySession(session);
          finishInitialLoad();
          recoverInProgress.current = false;
          return;
        }

        if (initialLoadDone.current && !recoverInProgress.current) {
          recoverInProgress.current = true;
          supabase.auth
            .refreshSession()
            .then(({ data: { session: newSession } }) => {
              if (!cancelled) applySession(newSession);
            })
            .catch(() => {
              if (!cancelled) applySession(null);
            })
            .finally(() => {
              recoverInProgress.current = false;
            });
          return;
        }

        if (!recoverInProgress.current) applySession(session);
        finishInitialLoad();
      });
      subscription = data.subscription;
    } catch {
      if (!cancelled) finishInitialLoad();
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

  const signOut = useCallback(() => supabase.auth.signOut(), []);

  const value: AuthContextValue = { user, loading, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx == null) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return ctx;
}
