// Supabase Edge Function: troca o code do OAuth Meta por token, busca páginas/IG e salva em instagram_accounts.
// Requer secrets: META_APP_ID, META_APP_SECRET (e SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY já fornecidos pelo Supabase).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const META_GRAPH = "https://graph.facebook.com/v21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MetaTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: { message: string; code: number };
}

interface MetaAccountsResponse {
  data?: Array<{ id: string; access_token: string; name?: string }>;
  error?: { message: string };
}

interface MetaPageIgResponse {
  instagram_business_account?: { id: string };
  access_token?: string;
  id?: string;
  error?: { message: string };
}

interface MetaIgUserResponse {
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
        JSON.stringify({ error: "Meta app not configured (META_APP_ID / META_APP_SECRET)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1) Trocar code por access_token (curto)
    const tokenUrl = `${META_GRAPH}/oauth/access_token?client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&redirect_uri=${encodeURIComponent(redirect_uri)}&code=${encodeURIComponent(code)}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData: MetaTokenResponse = await tokenRes.json();
    if (tokenData.error || !tokenData.access_token) {
      return new Response(
        JSON.stringify({ error: tokenData.error?.message ?? "Failed to get access token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let userAccessToken = tokenData.access_token;

    // 2) Opcional: trocar por long-lived user token (≈60 dias)
    const longLivedUrl = `${META_GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(userAccessToken)}`;
    const longLivedRes = await fetch(longLivedUrl);
    const longLivedData: MetaTokenResponse = await longLivedRes.json();
    if (longLivedData.access_token) userAccessToken = longLivedData.access_token;

    // 3) Listar páginas do usuário
    const accountsUrl = `${META_GRAPH}/me/accounts?fields=id,name,access_token`;
    const accountsRes = await fetch(accountsUrl + "&access_token=" + encodeURIComponent(userAccessToken));
    const accountsData: MetaAccountsResponse = await accountsRes.json();
    if (accountsData.error || !accountsData.data?.length) {
      return new Response(
        JSON.stringify({ error: accountsData.error?.message ?? "No Facebook Pages found. Connect a Page to an Instagram Business/Creator account." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const existingIgIds = new Set<string>();
    const { data: existing } = await supabase
      .from("instagram_accounts")
      .select("instagram_user_id")
      .eq("user_id", user.id);
    for (const row of existing ?? []) {
      existingIgIds.add(row.instagram_user_id);
    }

    let added = 0;
    for (const page of accountsData.data) {
      const pageFieldsUrl = `${META_GRAPH}/${page.id}?fields=instagram_business_account,access_token&access_token=${encodeURIComponent(userAccessToken)}`;
      const pageRes = await fetch(pageFieldsUrl);
      const pageData: MetaPageIgResponse = await pageRes.json();
      if (pageData.error || !pageData.instagram_business_account?.id) continue;

      const igId = pageData.instagram_business_account.id;
      if (existingIgIds.has(igId)) continue;

      const pageToken = pageData.access_token ?? page.access_token;
      if (!pageToken) continue;

      const igUserUrl = `${META_GRAPH}/${igId}?fields=username,profile_picture_url&access_token=${encodeURIComponent(pageToken)}`;
      const igRes = await fetch(igUserUrl);
      const igData: MetaIgUserResponse = await igRes.json();
      if (igData.error) continue;

      const { error: insertErr } = await supabase.from("instagram_accounts").insert({
        user_id: user.id,
        instagram_user_id: igId,
        username: igData.username ?? "instagram",
        profile_picture_url: igData.profile_picture_url ?? null,
        access_token: pageToken,
        page_id: page.id,
        page_access_token: pageToken,
        status: "active",
      });
      if (!insertErr) {
        existingIgIds.add(igId);
        added++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, added }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
