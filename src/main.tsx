import { createRoot } from "react-dom/client";
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
      background: #0f161e;
      color: #e8ecf1;
      text-align: center;
    ">
      <h1 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">Não foi possível carregar o sistema</h1>
      <p style="max-width: 28rem; margin-bottom: 1rem; color: #94a3b8;">${message}</p>
      <p style="font-size: 0.875rem; color: #64748b;">
        Configure no painel do deploy (ex.: Vercel) as variáveis de ambiente:
        <code style="background: #1e293b; padding: 0.125rem 0.375rem; border-radius: 0.25rem;">VITE_SUPABASE_URL</code> e
        <code style="background: #1e293b; padding: 0.125rem 0.375rem; border-radius: 0.25rem;">VITE_SUPABASE_PUBLISHABLE_KEY</code>,
        depois faça um novo deploy.
      </p>
      ${detail ? `<pre style="font-size: 0.75rem; color: #475569; margin-top: 1rem; overflow: auto;">${String(detail)}</pre>` : ""}
    </div>
  `;
}

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const supabaseKey = String(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? ""
).trim();
const missingEnv = !supabaseUrl || !supabaseKey || !supabaseUrl.startsWith("https://");

async function bootstrap() {
  let rootEl = document.getElementById("root");
  // Alguns deploys ou páginas de erro podem servir HTML sem #root; criar o elemento evita "root not found"
  if (!rootEl && document.body) {
    rootEl = document.createElement("div");
    rootEl.id = "root";
    rootEl.style.minHeight = "100vh";
    document.body.appendChild(rootEl);
  }
  if (!rootEl) {
    document.write(
      '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui;background:#0f161e;color:#e8ecf1;text-align:center;padding:1rem">' +
        "<h1>Elemento #root não encontrado</h1></div>"
    );
    return;
  }
  if (missingEnv) {
    showBootstrapError(
      "Variáveis de ambiente do Supabase não configuradas neste deploy.",
      "Trocar o link ou domínio não resolve: as variáveis são por projeto no Vercel. No projeto que serve este site: Vercel → Project Settings → Environment Variables → adicione VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY (valores em Supabase Dashboard → Project Settings → API). Depois faça um novo deploy (Redeploy no Vercel)."
    );
    return;
  }
  try {
    const { default: App } = await import("./App.tsx");
    createRoot(rootEl).render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
  } catch (err) {
    console.error("Bootstrap error:", err);
    showBootstrapError(
      "Erro ao iniciar a aplicação. Verifique as variáveis de ambiente no deploy.",
      err instanceof Error ? err.message : String(err)
    );
  }
}

bootstrap();
