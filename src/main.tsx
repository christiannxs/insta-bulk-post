import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./index.css";

function showBootstrapError(message: string, detail?: unknown) {
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = `
    <div style="
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      font-family: system-ui, sans-serif;
      background: #0d0d0d;
      color: #e5e5e5;
      text-align: center;
    ">
      <h1 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">Não foi possível carregar o sistema</h1>
      <p style="max-width: 28rem; margin-bottom: 1rem; color: #a3a3a3;">${message}</p>
      <p style="font-size: 0.875rem; color: #737373;">
        Configure no painel do deploy (ex.: Vercel) as variáveis de ambiente:
        <code style="background: #262626; padding: 0.125rem 0.375rem; border-radius: 0.25rem;">VITE_SUPABASE_URL</code> e
        <code style="background: #262626; padding: 0.125rem 0.375rem; border-radius: 0.25rem;">VITE_SUPABASE_PUBLISHABLE_KEY</code>,
        depois faça um novo deploy.
      </p>
      ${detail ? `<pre style="font-size: 0.75rem; color: #525252; margin-top: 1rem; overflow: auto;">${String(detail)}</pre>` : ""}
    </div>
  `;
}

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const supabaseKey = String(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? ""
).trim();
const isProd = import.meta.env.PROD;
const missingEnv = !supabaseUrl || !supabaseKey || !supabaseUrl.startsWith("https://");

try {
  const rootEl = document.getElementById("root");
  if (!rootEl) {
    showBootstrapError("Elemento #root não encontrado.");
  } else if (isProd && missingEnv) {
    showBootstrapError(
      "Variáveis de ambiente do Supabase não configuradas neste deploy.",
      "No painel da Vercel: Project Settings → Environment Variables → adicione VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY, depois faça um novo deploy."
    );
  } else {
    createRoot(rootEl).render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
  }
} catch (err) {
  console.error("Bootstrap error:", err);
  showBootstrapError(
    "Erro ao iniciar a aplicação. Verifique as variáveis de ambiente no deploy.",
    err instanceof Error ? err.message : err
  );
}
