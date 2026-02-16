import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getMetaConnectRedirectUri, metaStateMatches } from "@/lib/metaOAuth";

export default function MetaConnectCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("Conectando à Meta...");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const errorFromMeta = searchParams.get("error");

    if (errorFromMeta) {
      const desc = searchParams.get("error_description") ?? "Acesso negado ou cancelado.";
      setStatus("error");
      setMessage(desc);
      setTimeout(() => navigate("/accounts?error=" + encodeURIComponent(desc), { replace: true }), 2500);
      return;
    }

    if (!code || !state || !metaStateMatches(state)) {
      setStatus("error");
      setMessage("Link inválido ou expirado. Tente conectar novamente.");
      setTimeout(() => navigate("/accounts?error=invalid_callback", { replace: true }), 2500);
      return;
    }

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setStatus("error");
          setMessage("Faça login novamente e tente conectar a conta.");
          setTimeout(() => navigate("/login", { replace: true }), 2500);
          return;
        }

        const { data, error } = await supabase.functions.invoke("meta-connect", {
          body: { code, redirect_uri: getMetaConnectRedirectUri() },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (error) {
          setStatus("error");
          setMessage(error.message ?? "Erro ao conectar.");
          setTimeout(() => navigate("/accounts?error=" + encodeURIComponent(error.message ?? "unknown"), { replace: true }), 2500);
          return;
        }

        const added = (data as { added?: number })?.added ?? 0;
        setStatus("ok");
        setMessage(added > 0 ? `Conta(s) conectada(s): ${added}. Redirecionando...` : "Nenhuma conta nova. Redirecionando...");
        navigate("/accounts?connected=" + (added > 0 ? "1" : "0"), { replace: true });
      } catch (e) {
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Erro inesperado.");
        setTimeout(() => navigate("/accounts?error=unknown", { replace: true }), 2500);
      }
    })();
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
