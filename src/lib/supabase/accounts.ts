import { supabase, getSupabaseEdgeFunctionConfig } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type InstagramAccount = Tables<"instagram_accounts">;

export async function fetchInstagramAccounts(userId: string): Promise<InstagramAccount[]> {
  const { data, error } = await supabase
    .from("instagram_accounts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function deleteInstagramAccount(id: string): Promise<void> {
  const { error } = await supabase.from("instagram_accounts").delete().eq("id", id);
  if (error) throw error;
}

/** Atualiza nome e foto do perfil da conta no Instagram (chama a Graph API e atualiza o banco). */
export async function refreshInstagramProfile(accountId: string): Promise<{ username: string; profile_picture_url: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Faça login para atualizar o perfil.");
  const { url, anonKey } = getSupabaseEdgeFunctionConfig();
  const res = await fetch(`${url}/functions/v1/refresh-instagram-profile`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      apikey: anonKey,
    },
    body: JSON.stringify({ account_id: accountId }),
  });
  const rawText = await res.text();
  let body: { error?: string | { message?: string }; username?: string; profile_picture_url?: string | null } = {};
  try {
    body = rawText ? (JSON.parse(rawText) as typeof body) : {};
  } catch {
    // resposta não é JSON (ex.: 502 com HTML)
  }
  if (!res.ok) {
    const err =
      typeof body?.error === "string"
        ? body.error
        : (body?.error as { message?: string })?.message;
    const status = res.status;
    const fallback =
      status === 0
        ? "Falha de rede ou CORS. Verifique se a URL do Supabase no .env está correta e se a função está publicada."
        : status === 404
          ? "Função não encontrada. No terminal: npx supabase functions deploy refresh-instagram-profile"
          : status >= 500
            ? "Falha no servidor. Tente de novo em instantes."
            : `Erro ao atualizar perfil. (HTTP ${status})`;
    const message = err?.trim() || res.statusText?.trim() || fallback;
    if (import.meta.env.DEV || status === 0 || status === 404) {
      console.error("[refresh-instagram-profile]", status, res.statusText, body || rawText?.slice(0, 300));
    }
    throw new Error(message);
  }
  return { username: body.username ?? "instagram", profile_picture_url: body.profile_picture_url ?? null };
}
