/**
 * Fluxo OAuth Google para acessar o Drive e listar vídeos por link.
 * Requer VITE_GOOGLE_CLIENT_ID no .env e app configurado no Google Cloud Console (Drive API, redirect URI).
 */

const GOOGLE_SCOPES = "https://www.googleapis.com/auth/drive.readonly";
const STATE_KEY = "google_drive_connect_state";

function setStateStorage(value: string) {
  if (typeof sessionStorage !== "undefined") sessionStorage.setItem(STATE_KEY, value);
  if (typeof localStorage !== "undefined") localStorage.setItem(STATE_KEY, value);
}

function getAndClearStateStorage(): string | null {
  let s: string | null = null;
  if (typeof sessionStorage !== "undefined") {
    s = sessionStorage.getItem(STATE_KEY);
    sessionStorage.removeItem(STATE_KEY);
  }
  if (s) {
    if (typeof localStorage !== "undefined") localStorage.removeItem(STATE_KEY);
    return s;
  }
  if (typeof localStorage !== "undefined") {
    s = localStorage.getItem(STATE_KEY);
    localStorage.removeItem(STATE_KEY);
  }
  return s;
}

export function isGoogleDriveConfigured(): boolean {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  return Boolean(id);
}

export function getGoogleDriveRedirectUri(): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/new-post/drive/callback`;
}

export function getGoogleConnectUrl(): string | null {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  if (!clientId) return null;
  const redirectUri = getGoogleDriveRedirectUri();
  const state = crypto.randomUUID();
  setStateStorage(state);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES,
    state,
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function getStoredGoogleState(): string | null {
  return getAndClearStateStorage();
}

export function googleStateMatches(expected: string | null): boolean {
  const stored = getAndClearStateStorage();
  return Boolean(stored && expected && stored === expected);
}

export type ParsedDriveLink = { type: "folder"; id: string } | { type: "file"; id: string };

/**
 * Extrai folder_id ou file_id de um link do Google Drive.
 * Suporta:
 * - Pasta: .../drive/folders/FOLDER_ID ou .../drive/u/0/folders/FOLDER_ID
 * - Arquivo: .../file/d/FILE_ID/view ou .../open?id=FILE_ID
 */
export function parseDriveLink(input: string): ParsedDriveLink | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (!url.hostname.includes("google.com")) return null;
    const path = url.pathname;
    // Pasta: /drive/folders/ID ou /drive/u/0/folders/ID
    const folderMatch = path.match(/\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) return { type: "folder", id: folderMatch[1] };
    // Arquivo: /file/d/ID/...
    const fileMatch = path.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) return { type: "file", id: fileMatch[1] };
    // ?id=FILE_ID (comum em links de compartilhamento)
    const idParam = url.searchParams.get("id");
    if (idParam) return { type: "file", id: idParam };
    return null;
  } catch {
    return null;
  }
}

export function buildDriveDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}
