import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getGoogleDriveRedirectUri, googleStateMatches } from "@/lib/googleDrive";

const SESSION_WAIT_MS = 6000;
const SESSION_POLL_MS = 300;
const MAX_401_RETRIES = 4;
const RETRY_DELAYS_MS = [400, 800, 1600, 3200];

/** Espera a sessão estar disponível após redirect e devolve sempre sessão refresada (evita 401 por token expirado). */
async function waitForSession(cancelled: () => boolean): Promise<Session | null> {
  const deadline = Date.now() + SESSION_WAIT_MS;
  while (Date.now() < deadline && !cancelled()) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      const { data: { session: refreshed }, error } = await supabase.auth.refreshSession();
      if (!cancelled() && !error && refreshed?.access_token) return refreshed;
      if (!cancelled() && error) return null;
      break;
    }
    await new Promise((r) => setTimeout(r, SESSION_POLL_MS));
  }
  const { data: { session }, error } = await supabase.auth.refreshSession();
  if (!error && session?.access_token) return session;
  return null;
}

export default function GoogleDriveCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("Conectando ao Google Drive...");

  useEffect(() => {
    let cancelled = false;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const errorFromGoogle = searchParams.get("error");

    if (errorFromGoogle) {
      setStatus("error");
      setMessage("Acesso negado ou cancelado.");
      const t = setTimeout(() => !cancelled && navigate("/new-post", { replace: true }), 2500);
      return () => clearTimeout(t);
    }

    if (!code || !state || !googleStateMatches(state)) {
      setStatus("error");
      setMessage("Link inválido ou expirado. Tente conectar novamente.");
      const t = setTimeout(() => !cancelled && navigate("/new-post", { replace: true }), 2500);
      return () => clearTimeout(t);
    }

    (async () => {
      try {
        const session = await waitForSession(() => cancelled);
        if (cancelled) return;
        if (!session?.access_token) {
          throw new Error("NO_SESSION");
        }

        const doRequest = async (): Promise<Response> => {
          const { data: { session: s }, error: sessionError } = await supabase.auth.refreshSession();
          if (sessionError || !s?.access_token) throw new Error("NO_SESSION");
          const token = s.access_token;
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
          const anonKey = (
            import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? ""
          ).trim();
          return fetch(`${supabaseUrl}/functions/v1/google-connect`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              apikey: anonKey,
            },
            body: JSON.stringify({ code, redirect_uri: getGoogleDriveRedirectUri() }),
          });
        };

        let res = await doRequest();
        if (cancelled) return;

        for (let i = 0; i < MAX_401_RETRIES && res.status === 401 && !cancelled; i++) {
          await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[i]));
          if (cancelled) return;
          res = await doRequest();
        }

        if (cancelled) return;

        const body = (await res.json().catch(() => ({}))) as { error?: string; success?: boolean };
        const errMsg = body?.error;

        if (!res.ok) {
          setStatus("error");
          const fallback =
            res.status === 401
              ? "Sessão expirada ou inválida. Faça login no app (ou logout e login de novo) e tente conectar o Google outra vez."
              : `Erro ${res.status}. Verifique os logs da Edge Function.`;
          setMessage(errMsg ?? fallback);
          setTimeout(() => !cancelled && navigate(res.status === 401 ? "/login" : "/new-post", { replace: true }), 2500);
          return;
        }
        if (errMsg) {
          setStatus("error");
          setMessage(errMsg);
          setTimeout(() => !cancelled && navigate("/new-post", { replace: true }), 2500);
          return;
        }
        setStatus("ok");
        setMessage("Google Drive conectado. Redirecionando...");
        navigate("/new-post", { replace: true });
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        const isNoSession = e instanceof Error && e.message === "NO_SESSION";
        setMessage(
          isNoSession
            ? "Sessão expirada. Faça login no app e tente conectar o Google novamente."
            : e instanceof Error ? e.message : "Erro inesperado."
        );
        setTimeout(
          () => !cancelled && navigate(isNoSession ? "/login" : "/new-post", { replace: true }),
          2500
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6">
      {status === "loading" && (
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      )}
      <p className="text-center text-muted-foreground">{message}</p>
    </div>
  );
}
