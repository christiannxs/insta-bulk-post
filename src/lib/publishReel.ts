/**
 * Chama a Edge Function publish-reel via fetch para garantir que a mensagem
 * de erro retornada (body JSON) seja lida e exibida na UI quando o status não é 2xx.
 * O supabase.functions.invoke nem sempre expõe o body em error.context, gerando
 * apenas "Edge Function returned a non-2xx status code".
 */

import { getSupabaseEdgeFunctionConfig } from "@/integrations/supabase/client";

export type PublishReelParams = {
  account_id: string;
  video_url: string;
  caption: string | null;
};

export type PublishReelResult =
  | { data: { success: true; media_id?: string; username?: string }; error: null }
  | { data: null; error: string };

export async function invokePublishReel(
  accessToken: string,
  params: PublishReelParams
): Promise<PublishReelResult> {
  const { url, anonKey } = getSupabaseEdgeFunctionConfig();
  const res = await fetch(`${url}/functions/v1/publish-reel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
    },
    body: JSON.stringify({
      account_id: params.account_id,
      video_url: params.video_url.trim(),
      caption: params.caption,
    }),
  });

  let body: { error?: string; success?: boolean; media_id?: string; username?: string };
  try {
    body = await res.json();
  } catch {
    return { data: null, error: res.ok ? "Resposta inválida" : `Erro ${res.status}` };
  }

  if (!res.ok) {
    const msg = body?.error ?? `Erro ${res.status}`;
    return { data: null, error: res.status === 401 ? `401: ${msg}` : msg };
  }

  if (body?.error) {
    return { data: null, error: body.error };
  }

  return {
    data: {
      success: true,
      media_id: body.media_id,
      username: body.username,
    },
    error: null,
  };
}
