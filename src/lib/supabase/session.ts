/**
 * Helper central para obter token de acesso válido antes de chamar Edge Functions.
 * Reduz 401 por token expirado: sempre faz refresh e retorna o token da resposta.
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Obtém um access_token fresco (faz refresh da sessão).
 * Use isto antes de qualquer chamada a Edge Functions para evitar 401 por token expirado.
 * @returns access_token ou null se não houver sessão ou refresh falhar
 */
export async function getValidAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) {
    if (import.meta.env.DEV) {
      console.warn("[session] refresh falhou:", error.message, "- Faça login novamente.");
    }
    await supabase.auth.signOut();
    return null;
  }
  const token = data?.session?.access_token ?? null;
  if (!token && import.meta.env.DEV) {
    console.warn("[session] Sem token após refresh - usuário precisa fazer login.");
  }
  return token;
}
