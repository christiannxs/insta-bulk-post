// Edge Function: troca code do Google OAuth por tokens e salva em google_tokens.
// Requer: GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET nos secrets do Supabase.
// Redirect URI no Google Cloud Console deve bater com a origem do app (ex.: http://localhost:5173/new-post/drive/callback).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const json = (data: unknown, status: number) =>
    new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Missing or invalid Authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.slice(7);

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user?.id) {
      console.error("[google-connect] getUser failed:", userError?.message ?? (user ? "no user id" : "no user"));
      return json({ error: "Sessão inválida ou expirada" }, 401);
    }

    const clientId = (Deno.env.get("GOOGLE_CLIENT_ID") ?? "").trim();
    const clientSecret = (Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "").trim();
    if (!clientId || !clientSecret) {
      return json({ error: "Google OAuth não configurado (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const { code, redirect_uri: rawRedirectUri } = body as { code?: string; redirect_uri?: string };
    const redirect_uri = typeof rawRedirectUri === "string" ? rawRedirectUri.trim() : "";
    if (!code || !redirect_uri) {
      return json({ error: "Faltam code ou redirect_uri" }, 400);
    }

    // Log para diagnóstico (sem expor o code); confira nos logs da Edge Function no Supabase
    console.log("[google-connect] redirect_uri enviada ao Google:", redirect_uri);
    console.log("[google-connect] client_id (primeiros 20 chars):", clientId.slice(0, 20) + "...");

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri,
        grant_type: "authorization_code",
      }).toString(),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      const raw = tokenData.error_description ?? tokenData.error ?? "Falha ao trocar code por token";
      const googleErrorCode = tokenData.error ?? "";
      const googleErrorDesc = tokenData.error_description ?? "";
      const isClientError =
        tokenData.error === "invalid_client" ||
        String(raw).toLowerCase().includes("client") ||
        String(raw).toLowerCase().includes("not found");
      const friendly = isClientError
        ? "The OAuth client was not found. Confira: (1) No Google Cloud Console → Credenciais, o ID do cliente OAuth existe e é do tipo \"Aplicativo da Web\". (2) No Supabase → Settings → Edge Functions → Secrets: GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET são exatamente os mesmos desse cliente (mesmo ID no .env como VITE_GOOGLE_CLIENT_ID). (3) A Redirect URI no Console deve ser exatamente a URL de callback do app (ex.: https://seu-dominio.com/new-post/drive/callback). Veja docs/GOOGLE_DRIVE_SETUP.md."
        : raw;
      // Incluir erro real do Google para diagnóstico (ex.: redirect_uri_mismatch vs invalid_client)
      return json(
        {
          error: friendly,
          google_error: googleErrorCode,
          google_error_description: googleErrorDesc,
          redirect_uri_used: redirect_uri,
        },
        400
      );
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token ?? null;
    const expiresIn = tokenData.expires_in ?? 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const { error: upsertErr } = await supabase.from("google_tokens").upsert(
      {
        user_id: user.id,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (upsertErr) {
      return json({ error: upsertErr.message }, 400);
    }

    return json({ success: true }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});
