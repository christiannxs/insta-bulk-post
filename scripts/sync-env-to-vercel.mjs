#!/usr/bin/env node
/**
 * Lê o .env local e envia variáveis de build para o projeto Vercel vinculado:
 * VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_META_APP_ID.
 *
 * Uso: node scripts/sync-env-to-vercel.mjs
 * ou:  npm run vercel:env
 *
 * Requer: .env na raiz e projeto já linkado (vercel link).
 */

import { readFileSync, existsSync } from "fs";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env");

if (!existsSync(envPath)) {
  console.error("Arquivo .env não encontrado na raiz do projeto.");
  console.error("Crie um .env com VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY e VITE_META_APP_ID (veja .env.example).");
  process.exit(1);
}

const raw = readFileSync(envPath, "utf8");
const vars = {};
for (const line of raw.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  vars[key] = value;
}

const url = vars.VITE_SUPABASE_URL?.trim();
const key = (vars.VITE_SUPABASE_PUBLISHABLE_KEY || vars.VITE_SUPABASE_ANON_KEY || "").trim();

if (!url || !key) {
  console.error(".env precisa ter VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY (ou VITE_SUPABASE_ANON_KEY).");
  process.exit(1);
}

if (!url.startsWith("https://")) {
  console.error("VITE_SUPABASE_URL deve começar com https://");
  process.exit(1);
}

function runVercelEnvAdd(name, value, env = "production") {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["vercel", "env", "add", name, env], {
      cwd: root,
      stdio: ["pipe", "inherit", "inherit"],
    });
    child.stdin.write(value);
    child.stdin.end();
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))));
    child.on("error", reject);
  });
}

(async () => {
  console.log("Enviando variáveis do .env para o projeto Vercel...");
  try {
    await runVercelEnvAdd("VITE_SUPABASE_URL", url);
    console.log("  ✓ VITE_SUPABASE_URL");
  } catch (e) {
    console.error("  ✗ VITE_SUPABASE_URL:", e.message);
    process.exit(1);
  }
  try {
    await runVercelEnvAdd("VITE_SUPABASE_PUBLISHABLE_KEY", key);
    console.log("  ✓ VITE_SUPABASE_PUBLISHABLE_KEY");
  } catch (e) {
    console.error("  ✗ VITE_SUPABASE_PUBLISHABLE_KEY:", e.message);
    process.exit(1);
  }
  const metaAppId = (vars.VITE_META_APP_ID || "").trim();
  if (metaAppId) {
    try {
      await runVercelEnvAdd("VITE_META_APP_ID", metaAppId);
      console.log("  ✓ VITE_META_APP_ID");
    } catch (e) {
      console.error("  ✗ VITE_META_APP_ID:", e.message);
    }
  } else {
    console.log("  ⊘ VITE_META_APP_ID não está no .env (opcional para conectar Instagram)");
  }
  console.log("\nVariáveis configuradas. Faça um novo deploy para aplicar:");
  console.log("  npx vercel --prod");
  console.log("Ou no painel: Deployments → … → Redeploy");
})();
