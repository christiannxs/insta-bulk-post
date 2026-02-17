/**
 * CORS headers para Edge Functions invocadas pelo browser.
 * Deve incluir todos os headers e métodos usados pelo Supabase SDK.
 * Ref: https://supabase.com/docs/guides/functions/cors
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};
