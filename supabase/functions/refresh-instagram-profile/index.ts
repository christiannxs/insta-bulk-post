// Edge Function: Atualiza username e profile_picture_url de uma conta Instagram já conectada.
// Usa o access_token salvo para chamar a Graph API e atualiza a linha em instagram_accounts.
// Útil quando as contas foram conectadas com nome genérico ("instagram") e precisam exibir o @ correto.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const INSTAGRAM_GRAPH = "https://graph.instagram.com/v24.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IgMeResponse {
  user_id?: string;
  username?: string;
  profile_picture_url?: string;
  id?: string;
  error?: { message?: string; type?: string; code?: number };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.slice(7);

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user?.id) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const accountId = (body as { account_id?: string }).account_id;
    if (!accountId) {
      return new Response(
        JSON.stringify({ error: "Missing account_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: account, error: fetchError } = await supabase
      .from("instagram_accounts")
      .select("id, instagram_user_id, access_token")
      .eq("id", accountId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError || !account) {
      return new Response(
        JSON.stringify({ error: "Conta não encontrada ou sem permissão" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = account.access_token;
    const igUserId = account.instagram_user_id;
    if (!accessToken || !igUserId) {
      return new Response(
        JSON.stringify({ error: "Conta sem token. Reconecte a conta." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fields = "id,user_id,username,profile_picture_url";
    const meUrl = `${INSTAGRAM_GRAPH}/me?fields=${fields}&access_token=${encodeURIComponent(accessToken)}`;
    const meRes = await fetch(meUrl);
    let meData: IgMeResponse = {};
    try {
      meData = (await meRes.json()) as IgMeResponse;
    } catch {
      return new Response(
        JSON.stringify({ error: "Resposta inválida do Instagram (não é JSON)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const igErrorMsg = meData.error?.message ?? (meData as { error_message?: string }).error_message;
    if (!meRes.ok || igErrorMsg) {
      const msg = String(igErrorMsg ?? "Resposta inválida do Instagram").trim();
      const isTokenError = /token|expired|invalid|permission|190|code/i.test(msg) || (meData.error as { code?: number })?.code === 190;
      return new Response(
        JSON.stringify({
          error: isTokenError
            ? "Token do Instagram expirado ou inválido. Clique em \"Reconectar\" na conta."
            : msg,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!meData.username && igUserId) {
      const byIdUrl = `${INSTAGRAM_GRAPH}/${igUserId}?fields=username,profile_picture_url&access_token=${encodeURIComponent(accessToken)}`;
      const byIdRes = await fetch(byIdUrl);
      let byIdData: IgMeResponse = {};
      try {
        byIdData = (await byIdRes.json()) as IgMeResponse;
      } catch {
        return new Response(
          JSON.stringify({ error: "Resposta inválida do Instagram ao buscar por ID." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const byIdErr = byIdData.error?.message ?? (byIdData as { error_message?: string }).error_message;
      if (!byIdRes.ok || byIdErr) {
        const msg = String(byIdErr ?? "Não foi possível buscar o perfil pelo ID").trim();
        const isTokenError = /token|expired|invalid|permission|190|code/i.test(msg) || (byIdData.error as { code?: number })?.code === 190;
        return new Response(
          JSON.stringify({
            error: isTokenError
              ? "Token do Instagram expirado ou inválido. Clique em \"Reconectar\" na conta."
              : msg,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (byIdData.username || byIdData.profile_picture_url) {
        meData.username = meData.username ?? byIdData.username ?? undefined;
        meData.profile_picture_url = meData.profile_picture_url ?? byIdData.profile_picture_url ?? undefined;
      }
    }

    const username =
      (meData.username && String(meData.username).trim()) ||
      meData.user_id ||
      meData.id ||
      String(igUserId) ||
      "instagram";
    const profilePictureUrl = meData.profile_picture_url ?? null;

    const { error: updateErr } = await supabase
      .from("instagram_accounts")
      .update({
        username,
        profile_picture_url: profilePictureUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id)
      .eq("user_id", user.id);

    if (updateErr) {
      return new Response(
        JSON.stringify({ error: updateErr.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, username, profile_picture_url: profilePictureUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
