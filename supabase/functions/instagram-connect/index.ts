// Edge Function: Instagram Login (sem Facebook). Troca code por token, obtém perfil e salva em instagram_accounts.
// Requer: META_APP_ID, META_APP_SECRET nos secrets do Supabase (mesmo app com "Instagram API with Instagram Login").
// Redirect URI: /accounts/connect/instagram/callback deve estar em App Dashboard > Instagram > Business login > OAuth redirect URIs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const INSTAGRAM_OAUTH = "https://api.instagram.com/oauth/access_token";
const INSTAGRAM_GRAPH = "https://graph.instagram.com/v24.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InstagramTokenResponse {
  data?: Array<{
    access_token: string;
    user_id: string;
    permissions?: string;
  }>;
  error_type?: string;
  code?: number;
  error_message?: string;
}

interface LongLivedResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
}

interface IgMeResponse {
  user_id?: string;
  username?: string;
  profile_picture_url?: string;
  id?: string;
  error?: { message: string };
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
    const { code, redirect_uri } = body as { code?: string; redirect_uri?: string };
    if (!code || !redirect_uri) {
      return new Response(
        JSON.stringify({ error: "Missing code or redirect_uri" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appId = Deno.env.get("META_APP_ID");
    const appSecret = Deno.env.get("META_APP_SECRET");
    if (!appId || !appSecret) {
      return new Response(
        JSON.stringify({ error: "Instagram app not configured (META_APP_ID / META_APP_SECRET)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1) Trocar code por short-lived access token (POST form)
    const form = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri,
      code: code.replace(/#_$/, ""), // strip #_ if present
    });
    const tokenRes = await fetch(INSTAGRAM_OAUTH, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const tokenData: InstagramTokenResponse = await tokenRes.json();

    if (tokenData.error_message || tokenData.error_type) {
      const raw = tokenData.error_message ?? "Failed to get access token";
      const isClientError =
        String(raw).toLowerCase().includes("client") ||
        String(raw).toLowerCase().includes("not found") ||
        tokenData.error_type === "OAuthException";
      const friendly = isClientError
        ? "App Instagram não encontrado ou inválido. Confira no Supabase (secrets) META_APP_ID e META_APP_SECRET e no app Meta se a Redirect URI está correta (Instagram → Set up business login → OAuth redirect URIs)."
        : raw;
      return new Response(
        JSON.stringify({ error: friendly }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const first = tokenData.data?.[0];
    if (!first?.access_token || !first?.user_id) {
      return new Response(
        JSON.stringify({ error: "Invalid token response from Instagram" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let accessToken = first.access_token;
    const igUserId = first.user_id;

    // 2) Trocar por long-lived token (60 dias)
    const longLivedUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(appSecret)}&access_token=${encodeURIComponent(accessToken)}`;
    const longLivedRes = await fetch(longLivedUrl);
    const longLivedData: LongLivedResponse = await longLivedRes.json();
    if (longLivedData.access_token) accessToken = longLivedData.access_token;

    const expiresIn = longLivedData.expires_in ?? 5183944;
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // 3) Dados do perfil (username, foto)
    const meUrl = `${INSTAGRAM_GRAPH}/me?fields=user_id,username,profile_picture_url&access_token=${encodeURIComponent(accessToken)}`;
    const meRes = await fetch(meUrl);
    const meData: IgMeResponse = await meRes.json();
    const username = meData.username ?? meData.user_id ?? "instagram";
    const profilePictureUrl = meData.profile_picture_url ?? null;

    // 4) Evitar duplicata
    const { data: existing } = await supabase
      .from("instagram_accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("instagram_user_id", igUserId)
      .maybeSingle();

    if (existing) {
      const { error: updateErr } = await supabase
        .from("instagram_accounts")
        .update({
          access_token: accessToken,
          token_expires_at: tokenExpiresAt,
          profile_picture_url: profilePictureUrl,
          username,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (updateErr) {
        return new Response(
          JSON.stringify({ error: updateErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ success: true, added: 0, updated: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: insertErr } = await supabase.from("instagram_accounts").insert({
      user_id: user.id,
      instagram_user_id: igUserId,
      username,
      profile_picture_url: profilePictureUrl,
      access_token: accessToken,
      token_expires_at: tokenExpiresAt,
      page_id: null,
      page_access_token: null,
      status: "active",
    });

    if (insertErr) {
      return new Response(
        JSON.stringify({ error: insertErr.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, added: 1 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
