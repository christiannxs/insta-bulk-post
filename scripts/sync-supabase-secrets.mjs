import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const ENV_PATH = path.resolve(process.cwd(), ".env");

function getEnvVar(name) {
  if (!existsSync(ENV_PATH)) return null;
  const content = readFileSync(ENV_PATH, "utf-8");
  // Regex melhorada para aceitar espaços, aspas e diferentes formatos
  const lines = content.split('\n');
  for (let line of lines) {
    const [key, ...valueParts] = line.split('=');
    if (key && key.trim() === name) {
      return valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
    }
  }
  return null;
}

async function sync() {
  console.log("🚀 Iniciando sincronização robusta...");
  const clientId = getEnvVar("VITE_GOOGLE_CLIENT_ID");
  const clientSecret = getEnvVar("GOOGLE_CLIENT_SECRET");

  if (!clientId) {
    console.error("❌ VITE_GOOGLE_CLIENT_ID não encontrada no .env");
    process.exit(1);
  }

  if (!clientSecret) {
    console.log("💡 GOOGLE_CLIENT_SECRET não está no .env (Client Secret fica só no Supabase).");
    console.log("   Se ainda não configurou, defina no Dashboard: Supabase → Project Settings → Edge Functions → Secrets.");
  }

  try {
    console.log("📡 Enviando para o Supabase...");
    const secretsCmd = clientSecret
      ? `npx supabase secrets set GOOGLE_CLIENT_ID='${clientId}' GOOGLE_CLIENT_SECRET='${clientSecret}'`
      : `npx supabase secrets set GOOGLE_CLIENT_ID='${clientId}'`;
    execSync(secretsCmd, { stdio: "inherit" });
    console.log("📦 Fazendo deploy...");
    execSync("npx supabase functions deploy google-connect --no-verify-jwt", { stdio: "inherit" });
    console.log("\n✅ SUCESSO! Agora tente conectar o Google no seu navegador.");
  } catch (error) {
    console.error("❌ Erro:", error.message);
  }
}
sync();
