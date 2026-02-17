// Edge Function: publica posts agendados (scheduled_at <= now() e status = pending).
// Chamada por cron (ex.: a cada 5 min). Opcional: header x-cron-secret = CRON_SECRET.
// Usa service role para ler scheduled_posts e post_publish_logs e publicar via API Instagram.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const INSTAGRAM_GRAPH = "https://graph.instagram.com/v24.0";
const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 40;

interface ContainerStatus {
  status_code?: "EXPIRED" | "ERROR" | "IN_PROGRESS" | "FINISHED" | "PUBLISHED";
  status?: string;
  error?: { message: string };
}

interface AccountRow {
  id: string;
  instagram_user_id: string;
  access_token: string;
  username: string;
  status: string;
}

async function publishReelForAccount(
  account: AccountRow,
  videoUrl: string,
  caption: string
): Promise<{ success: boolean; media_id?: string; error?: string }> {
  if (account.status !== "active") {
    return { success: false, error: "Conta inativa ou expirada" };
  }
  const accessToken = account.access_token;
  const igUserId = account.instagram_user_id;
  const captionStr = typeof caption === "string" ? caption.trim().slice(0, 2200) : "";

  const createParams = new URLSearchParams({
    media_type: "REELS",
    video_url: videoUrl.trim(),
    access_token: accessToken,
  });
  if (captionStr) createParams.set("caption", captionStr);

  const createRes = await fetch(`${INSTAGRAM_GRAPH}/${igUserId}/media?${createParams.toString()}`, { method: "POST" });
  const createData = await createRes.json();
  if (createData.error) {
    const msg = createData.error.message ?? createData.error.error_user_msg ?? "Erro ao criar mídia";
    return { success: false, error: msg };
  }
  const containerId = createData.id;
  if (!containerId) return { success: false, error: "Resposta da API sem ID do container" };

  let statusCode: string | undefined;
  for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const statusRes = await fetch(
      `${INSTAGRAM_GRAPH}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(accessToken)}`
    );
    const statusData: ContainerStatus = await statusRes.json();
    statusCode = statusData.status_code;
    if (statusData.error) return { success: false, error: statusData.error.message ?? "Erro ao verificar status" };
    if (statusCode === "FINISHED" || statusCode === "PUBLISHED") break;
    if (statusCode === "ERROR" || statusCode === "EXPIRED") {
      return { success: false, error: statusCode === "EXPIRED" ? "Container expirado" : (statusData.status ?? "Falha no processamento") };
    }
  }
  if (statusCode !== "FINISHED" && statusCode !== "PUBLISHED") {
    return { success: false, error: "Vídeo demorou para processar" };
  }

  const publishParams = new URLSearchParams({
    creation_id: containerId,
    access_token: accessToken,
  });
  const publishRes = await fetch(`${INSTAGRAM_GRAPH}/${igUserId}/media_publish?${publishParams.toString()}`, { method: "POST" });
  const publishData = await publishRes.json();
  if (publishData.error) {
    const msg = publishData.error.message ?? publishData.error.error_user_msg ?? "Erro ao publicar";
    return { success: false, error: msg };
  }
  return { success: true, media_id: publishData.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-cron-secret, content-type" } });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const now = new Date().toISOString();
  const { data: posts, error: postsError } = await supabase
    .from("scheduled_posts")
    .select("id, user_id, video_url, caption, scheduled_at")
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true });

  if (postsError) {
    return new Response(JSON.stringify({ error: postsError.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  if (!posts?.length) {
    return new Response(JSON.stringify({ ok: true, processed: 0, message: "Nenhum post pendente para publicar" }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  let totalOk = 0;
  let totalFail = 0;

  for (const post of posts) {
    if (!post.video_url?.trim()) {
      await supabase.from("scheduled_posts").update({ status: "failed" }).eq("id", post.id);
      totalFail++;
      continue;
    }

    const { data: logs, error: logsError } = await supabase
      .from("post_publish_logs")
      .select("id, account_id")
      .eq("post_id", post.id)
      .eq("status", "pending");

    if (logsError || !logs?.length) {
      await supabase.from("scheduled_posts").update({ status: "failed" }).eq("id", post.id);
      totalFail++;
      continue;
    }

    await supabase.from("scheduled_posts").update({ status: "publishing" }).eq("id", post.id);

    let postOk = 0;
    let postFail = 0;
    for (const log of logs) {
      const { data: account, error: accErr } = await supabase
        .from("instagram_accounts")
        .select("id, instagram_user_id, access_token, username, status")
        .eq("id", log.account_id)
        .eq("user_id", post.user_id)
        .single();

      if (accErr || !account) {
        await supabase.from("post_publish_logs").update({ status: "failed", error_message: "Conta não encontrada" }).eq("id", log.id);
        postFail++;
        continue;
      }

      const result = await publishReelForAccount(account as AccountRow, post.video_url, post.caption ?? "");
      if (result.success) {
        await supabase.from("post_publish_logs").update({
          status: "published",
          ig_media_id: result.media_id ?? null,
          published_at: new Date().toISOString(),
        }).eq("id", log.id);
        postOk++;
      } else {
        await supabase.from("post_publish_logs").update({
          status: "failed",
          error_message: result.error ?? "Erro ao publicar",
        }).eq("id", log.id);
        postFail++;
      }
    }

    const postStatus = postFail === logs.length ? "failed" : "published";
    await supabase.from("scheduled_posts").update({ status: postStatus }).eq("id", post.id);
    totalOk += postOk;
    totalFail += postFail;
  }

  return new Response(
    JSON.stringify({
      ok: true,
      processed: posts.length,
      totalOk,
      totalFail,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
