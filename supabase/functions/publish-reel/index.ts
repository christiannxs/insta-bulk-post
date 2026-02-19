// Edge Function: publica um Reel no Instagram via Content Publishing API.
// Requer conta conectada por Instagram Login (instagram-connect). Usa access_token de instagram_accounts.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const INSTAGRAM_GRAPH = "https://graph.instagram.com/v24.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 40; // ~2 min

interface ContainerStatus {
  id?: string;
  status_code?: "EXPIRED" | "ERROR" | "IN_PROGRESS" | "FINISHED" | "PUBLISHED";
  status?: string;
  error?: { message: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const json = (data: unknown, status: number) =>
    new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    console.log("[publish-reel] Request received");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("[publish-reel] Missing or invalid Authorization");
      return json({ error: "Missing or invalid Authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.slice(7);

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user?.id) {
      console.log("[publish-reel] Auth failed:", userError?.message ?? "no user");
      return json({ error: "Sessão inválida ou expirada" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const { account_id, video_url, caption } = body as { account_id?: string; video_url?: string; caption?: string };

    if (!account_id || !video_url?.trim()) {
      console.log("[publish-reel] Missing account_id or video_url");
      return json({ error: "Faltam account_id ou video_url" }, 400);
    }

    console.log("[publish-reel] User ok, fetching account", account_id);
    const { data: account, error: accountError } = await supabase
      .from("instagram_accounts")
      .select("id, instagram_user_id, access_token, username, status")
      .eq("id", account_id)
      .eq("user_id", user.id)
      .single();

    if (accountError || !account) {
      console.log("[publish-reel] Account not found:", accountError?.message);
      return json({ error: "Conta não encontrada ou sem permissão" }, 404);
    }
    if (account.status !== "active") {
      console.log("[publish-reel] Account not active:", account.status);
      return json({ error: "Conta inativa ou expirada. Reconecte em Contas." }, 400);
    }

    const igUserId = account.instagram_user_id;
    const accessToken = account.access_token;
    const captionStr = typeof caption === "string" ? caption.trim().slice(0, 2200) : "";

    // 1) Criar container Reels
    console.log("[publish-reel] Creating container, video_url length:", video_url.trim().length);
    const createParams = new URLSearchParams({
      media_type: "REELS",
      video_url: video_url.trim(),
      access_token: accessToken,
    });
    if (captionStr) createParams.set("caption", captionStr);

    const createRes = await fetch(`${INSTAGRAM_GRAPH}/${igUserId}/media?${createParams.toString()}`, {
      method: "POST",
    });
    const createData = await createRes.json();

    if (createData.error) {
      const msg = createData.error.message ?? createData.error.error_user_msg ?? "Erro ao criar mídia";
      console.log("[publish-reel] Instagram API error on create:", JSON.stringify(createData.error));
      return json({ error: msg, code: createData.error.code }, 400);
    }
    const containerId = createData.id;
    if (!containerId) {
      console.log("[publish-reel] No container id in response:", createData);
      return json({ error: "Resposta da API sem ID do container" }, 500);
    }
    console.log("[publish-reel] Container created:", containerId);

    // 2) Poll status até FINISHED (ou ERROR/EXPIRED)
    let statusCode: string | undefined;
    for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const statusRes = await fetch(
        `${INSTAGRAM_GRAPH}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(accessToken)}`
      );
      const statusData: ContainerStatus = await statusRes.json();
      statusCode = statusData.status_code;

      if (statusData.error) {
        console.log("[publish-reel] Status check error:", statusData.error);
        return json({ error: statusData.error.message ?? "Erro ao verificar status" }, 500);
      }
      if (statusCode === "FINISHED" || statusCode === "PUBLISHED") {
        console.log("[publish-reel] Container ready:", statusCode);
        break;
      }
      if (statusCode === "ERROR" || statusCode === "EXPIRED") {
        const errMsg = statusCode === "EXPIRED" ? "Container expirado" : (statusData.status ?? "Falha no processamento do vídeo");
        console.log("[publish-reel] Container failed:", statusCode, statusData.status);
        return json({ error: errMsg }, 400);
      }
    }

    if (statusCode !== "FINISHED" && statusCode !== "PUBLISHED") {
      return json({ error: "O vídeo demorou para processar. Tente novamente." }, 408);
    }

    // 3) Publicar container
    const publishParams = new URLSearchParams({
      creation_id: containerId,
      access_token: accessToken,
    });
    const publishRes = await fetch(`${INSTAGRAM_GRAPH}/${igUserId}/media_publish?${publishParams.toString()}`, {
      method: "POST",
    });
    const publishData = await publishRes.json();

    if (publishData.error) {
      const msg = publishData.error.message ?? publishData.error.error_user_msg ?? "Erro ao publicar";
      console.log("[publish-reel] Publish error:", publishData.error);
      return json({ error: msg }, 400);
    }

    console.log("[publish-reel] Success, media_id:", publishData.id);
    return json({
      success: true,
      media_id: publishData.id,
      username: account.username,
    }, 200);
  } catch (e) {
    console.error("[publish-reel] Exception:", e);
    return json(
      { error: e instanceof Error ? e.message : "Erro inesperado" },
      500
    );
  }
});
