import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getInstagramConnectRedirectUri, instagramStateMatches } from "@/lib/instagramOAuth";

export default function InstagramConnectCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("Conectando ao Instagram...");

  useEffect(() => {
    let cancelled = false;

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const errorFromIg = searchParams.get("error");

    if (errorFromIg) {
      let desc = searchParams.get("error_description") ?? "Acesso negado ou cancelado.";
      if (/invalid platform app|invalid parameter/i.test(desc)) {
        desc = "App Meta não configurado para Instagram Login. Veja docs/META_SETUP.md: adicione o produto Instagram → Set up business login e as OAuth redirect URIs.";
      }
      setStatus("error");
      setMessage(desc);
      const t = setTimeout(() => !cancelled && navigate("/accounts?error=" + encodeURIComponent(desc), { replace: true }), 2500);
      return () => clearTimeout(t);
    }

    if (!code || !state || !instagramStateMatches(state)) {
      setStatus("error");
      setMessage("Link inválido ou expirado. Tente conectar novamente.");
      const t = setTimeout(() => !cancelled && navigate("/accounts?error=invalid_callback", { replace: true }), 2500);
      return () => clearTimeout(t);
    }

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!session?.access_token) {
          setStatus("error");
          setMessage("Faça login novamente e tente conectar a conta.");
          setTimeout(() => !cancelled && navigate("/login", { replace: true }), 2500);
          return;
        }

        const { data, error } = await supabase.functions.invoke("instagram-connect", {
          body: { code, redirect_uri: getInstagramConnectRedirectUri() },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (cancelled) return;
        if (error) {
          setStatus("error");
          setMessage(error.message ?? "Erro ao conectar.");
          setTimeout(() => !cancelled && navigate("/accounts?error=" + encodeURIComponent(error.message ?? "unknown"), { replace: true }), 2500);
          return;
        }

        const added = (data as { added?: number })?.added ?? 0;
        const updated = (data as { updated?: boolean })?.updated ?? false;
        setStatus("ok");
        if (added > 0) setMessage("Conta conectada. Redirecionando...");
        else if (updated) setMessage("Conta atualizada. Redirecionando...");
        else setMessage("Redirecionando...");
        navigate("/accounts?connected=" + (added > 0 || updated ? "1" : "0"), { replace: true });
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Erro inesperado.");
        setTimeout(() => !cancelled && navigate("/accounts?error=unknown", { replace: true }), 2500);
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
