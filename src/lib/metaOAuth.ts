/**
 * Fluxo OAuth Meta (Facebook Login) para conectar contas Instagram.
 * Requer VITE_META_APP_ID no .env.
 */

const META_STATE_KEY = "meta_connect_state";
const META_SCOPES = "pages_show_list,instagram_basic,instagram_content_publish";

export function isMetaConfigured(): boolean {
  const id = import.meta.env.VITE_META_APP_ID;
  return Boolean(typeof id === "string" && id.trim().length > 0);
}

export function getMetaConnectRedirectUri(): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/accounts/connect/callback`;
}

/**
 * Gera a URL para redirecionar o usuário ao diálogo de login da Meta.
 * Guarda `state` em sessionStorage para validar no callback.
 */
export function getMetaConnectUrl(): string | null {
  const appId = import.meta.env.VITE_META_APP_ID?.trim();
  if (!appId) return null;

  const redirectUri = getMetaConnectRedirectUri();
  const state = crypto.randomUUID();
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(META_STATE_KEY, state);
  }

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: META_SCOPES,
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
}

export function getStoredMetaState(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  const state = sessionStorage.getItem(META_STATE_KEY);
  sessionStorage.removeItem(META_STATE_KEY);
  return state;
}

export function metaStateMatches(expected: string | null): boolean {
  const stored = getStoredMetaState();
  return Boolean(stored && expected && stored === expected);
}
