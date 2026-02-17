/**
 * Fluxo OAuth oficial: Instagram API with Instagram Login.
 * Conecta contas Instagram profissional (Business/Creator) diretamente.
 * Requer o app Meta com "Instagram API with Instagram Login" e VITE_META_APP_ID no .env.
 * Redirect URI em: App Dashboard > Instagram > Set up business login > OAuth redirect URIs.
 */

const INSTAGRAM_STATE_KEY = "instagram_connect_state";
/** Scopes para perfil + publicar conteúdo (Reels, etc.). */
const INSTAGRAM_SCOPES = "instagram_business_basic,instagram_business_content_publish";

/** Meta/Instagram App IDs são numéricos, tipicamente 15–16 dígitos. */
const APP_ID_REGEX = /^\d{15,20}$/;

export function isInstagramLoginConfigured(): boolean {
  const id = import.meta.env.VITE_META_APP_ID?.trim();
  return Boolean(id && APP_ID_REGEX.test(id));
}

export function getInstagramConnectRedirectUri(): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/accounts/connect/instagram/callback`;
}

/**
 * Gera a URL para redirecionar o usuário ao diálogo de permissões do Instagram.
 * Abre a aba de permissões do Instagram (sem login no Facebook).
 * Guarda `state` em sessionStorage para validar no callback.
 */
export function getInstagramConnectUrl(): string | null {
  const appId = import.meta.env.VITE_META_APP_ID?.trim();
  if (!appId || !APP_ID_REGEX.test(appId)) return null;

  const redirectUri = getInstagramConnectRedirectUri();
  const state = crypto.randomUUID();
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(INSTAGRAM_STATE_KEY, state);
  }

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: INSTAGRAM_SCOPES,
    state,
    hl: "en", // evita bug na tela de login em PT ("Não foi possível se conectar")
  });
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

export function getStoredInstagramState(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  const state = sessionStorage.getItem(INSTAGRAM_STATE_KEY);
  sessionStorage.removeItem(INSTAGRAM_STATE_KEY);
  return state;
}

export function instagramStateMatches(expected: string | null): boolean {
  const stored = getStoredInstagramState();
  return Boolean(stored && expected && stored === expected);
}
