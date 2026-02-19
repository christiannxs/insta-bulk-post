import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase, getSupabaseEdgeFunctionConfig } from "@/integrations/supabase/client";
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
        // Atualiza a sessão antes de chamar a Edge Function (evita 401 após redirect do Instagram)
        const { data: { session: refreshedSession }, error: sessionError } = await supabase.auth.refreshSession();
        if (cancelled) return;
        if (sessionError || !refreshedSession?.access_token) {
          setStatus("error");
          setMessage("Sessão expirada. Faça login novamente e tente conectar a conta.");
          setTimeout(() => !cancelled && navigate("/login", { replace: true }), 2500);
          return;
        }
        // Usar sessão recém-atualizada (evita race após redirect)
        const session = refreshedSession;

        const { url: supabaseUrl, anonKey } = getSupabaseEdgeFunctionConfig();
        if (!supabaseUrl || !anonKey) {
          setStatus("error");
          setMessage("Configuração do Supabase faltando (URL ou chave). Verifique o .env e as variáveis no Vercel.");
          setTimeout(() => !cancelled && navigate("/accounts?error=config", { replace: true }), 2500);
          return;
        }

        const res = await fetch(`${supabaseUrl}/functions/v1/instagram-connect`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
            apikey: anonKey,
          },
          body: JSON.stringify({ code, redirect_uri: getInstagramConnectRedirectUri() }),
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string; added?: number; updated?: boolean };

        if (cancelled) return;
        if (!res.ok) {
          let detail = body?.error ?? res.statusText ?? "Erro ao conectar.";
          if (res.status === 401) {
            detail = body?.error?.includes("session") ? detail : "Sessão inválida ou expirada. Faça login novamente e tente conectar o Instagram.";
            detail += " Se persistir, faça o deploy com: npx supabase functions deploy instagram-connect --no-verify-jwt (veja docs/META_SETUP.md).";
          }
          setStatus("error");
          setMessage(detail);
          setTimeout(() => !cancelled && navigate("/accounts?error=" + encodeURIComponent(detail), { replace: true }), 2500);
          return;
        }

        const added = body?.added ?? 0;
        const updated = body?.updated ?? false;
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
