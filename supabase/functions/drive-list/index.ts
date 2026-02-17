// Edge Function: lista vídeos de uma pasta ou um arquivo do Google Drive.
// Requer usuário autenticado e google_tokens preenchido (conectar Google no app).
// Body: { folder_id?: string, file_id?: string } — um dos dois.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const VIDEO_MIME = "mimeType contains 'video/'";

interface DriveFile {
  id: string;
  name: string;
  mimeType?: string;
  size?: string;
}

async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error_description ?? data.error);
  return { access_token: data.access_token, expires_in: data.expires_in ?? 3600 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
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
      return json({ error: "Sessão inválida ou expirada" }, 401);
    }

    const { data: row, error: tokenError } = await supabase
      .from("google_tokens")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", user.id)
      .single();
    if (tokenError || !row) {
      return json({ error: "Conecte sua conta Google em Novo Post (link do Drive)." }, 400);
    }

    let accessToken = row.access_token;
    const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
    if (Date.now() >= expiresAt - 60_000 && row.refresh_token) {
      const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
      const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
      if (clientId && clientSecret) {
        const refreshed = await refreshAccessToken(clientId, clientSecret, row.refresh_token);
        accessToken = refreshed.access_token;
        await supabase
          .from("google_tokens")
          .update({
            access_token: refreshed.access_token,
            expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
      }
    }

    const body = await req.json().catch(() => ({}));
    const { folder_id, file_id } = body as { folder_id?: string; file_id?: string };
    if (folder_id) {
      const q = `'${folder_id}' in parents and trashed = false and (${VIDEO_MIME})`;
      const listRes = await fetch(
        `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size)&orderBy=name`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const listData = await listRes.json();
      if (listData.error) {
        return json({ error: listData.error.message ?? "Erro ao listar pasta" }, 400);
      }
      const files: DriveFile[] = listData.files ?? [];
      return json({ files, download_base: "https://drive.google.com/uc?export=download&id=" });
    }
    if (file_id) {
      const fileRes = await fetch(
        `${DRIVE_API}/files/${file_id}?fields=id,name,mimeType,size`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const fileData = await fileRes.json();
      if (fileData.error) {
        return json({ error: fileData.error.message ?? "Arquivo não encontrado" }, 400);
      }
      const mime = (fileData.mimeType ?? "") as string;
      if (!mime.startsWith("video/")) {
        return json({ error: "O arquivo não é um vídeo." }, 400);
      }
      const files: DriveFile[] = [{ id: fileData.id, name: fileData.name, mimeType: fileData.mimeType, size: fileData.size }];
      return json({ files, download_base: "https://drive.google.com/uc?export=download&id=" });
    }
    return json({ error: "Envie folder_id ou file_id no body." }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});
