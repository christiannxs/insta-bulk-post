#!/usr/bin/env node
/**
 * Automatiza a verificação e sincronização de segredos do Google com o Supabase.
 * Lê o .env local e define GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no Supabase via CLI,
 * em seguida faz o deploy da função google-connect.
 *
 * Uso: node scripts/sync-google-secrets-to-supabase.mjs
 * ou:  npm run google:secrets
 *
 * Requer: .env com VITE_GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET; Supabase CLI logado e projeto linkado.
 */

import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.resolve(__dirname, "..", ".env");

function getEnvVar(name) {
  if (!existsSync(ENV_PATH)) {
    console.error("❌ Arquivo .env não encontrado na raiz do projeto.");
    process.exit(1);
  }
  const content = readFileSync(ENV_PATH, "utf-8");
  const match = content.match(new RegExp(`^${name}=(.*)$`, "m"));
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
}

function sync() {
  console.log("🚀 Iniciando sincronização de segredos com o Supabase...");

  const clientId = getEnvVar("VITE_GOOGLE_CLIENT_ID");
  const clientSecret = getEnvVar("GOOGLE_CLIENT_SECRET");

  if (!clientId) {
    console.error("❌ VITE_GOOGLE_CLIENT_ID não encontrada no .env");
    process.exit(1);
  }

  if (!clientSecret) {
    console.warn("⚠️ GOOGLE_CLIENT_SECRET não encontrada no .env local.");
    console.log("Dica: Adicione GOOGLE_CLIENT_SECRET=\"sua_chave\" ao seu .env para sincronizar automaticamente.");
    process.exit(1);
  }

  try {
    console.log("📡 Definindo segredos no Supabase...");
    const command = `npx supabase secrets set GOOGLE_CLIENT_ID='${clientId}' GOOGLE_CLIENT_SECRET='${clientSecret}'`;
    execSync(command, { stdio: "inherit" });

    console.log("✅ Segredos definidos com sucesso!");
    console.log("📦 Fazendo deploy da função google-connect...");

    execSync("npx supabase functions deploy google-connect --no-verify-jwt", { stdio: "inherit" });

    console.log("\n✨ Tudo pronto! Tente conectar novamente no app.");
  } catch (error) {
    console.error("❌ Erro ao sincronizar:", error.message);
    console.log("\nCertifique-se de que você está logado no Supabase CLI (npx supabase login) e o projeto está linkado.");
    process.exit(1);
  }
}

sync();
