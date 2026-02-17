import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getGoogleDriveRedirectUri, googleStateMatches } from "@/lib/googleDrive";

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
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!session?.access_token) {
          setStatus("error");
          setMessage("Faça login no app e tente conectar o Google novamente.");
          setTimeout(() => !cancelled && navigate("/login", { replace: true }), 2500);
          return;
        }

        const { data, error } = await supabase.functions.invoke("google-connect", {
          body: { code, redirect_uri: getGoogleDriveRedirectUri() },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (cancelled) return;

        let errMsg: string | undefined;
        if (error instanceof FunctionsHttpError && error.context) {
          try {
            const body = await error.context.json() as { error?: string };
            errMsg = body?.error;
          } catch {
            /* ignorar se não conseguir parsear */
          }
        }
        errMsg ??= (data as { error?: string } | null)?.error;

        if (error) {
          setStatus("error");
          setMessage(errMsg ?? error.message ?? "Erro ao conectar.");
          setTimeout(() => !cancelled && navigate("/new-post", { replace: true }), 2500);
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
        setMessage(e instanceof Error ? e.message : "Erro inesperado.");
        setTimeout(() => !cancelled && navigate("/new-post", { replace: true }), 2500);
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
