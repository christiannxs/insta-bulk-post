#!/bin/bash
# Configura os secrets da Meta no Supabase para a Edge Function instagram-connect (conexão direta Instagram).
# Use: ./scripts/setup-meta-secrets.sh
#
# Você precisa do App ID e App Secret do app Meta (developers.facebook.com).
# O App ID deve estar também no .env como VITE_META_APP_ID.

set -e
echo "Configurando secrets da Meta no Supabase..."
echo ""

if [ -z "$META_APP_ID" ] || [ -z "$META_APP_SECRET" ]; then
  echo "Defina as variáveis META_APP_ID e META_APP_SECRET antes de executar:"
  echo ""
  echo "  META_APP_ID=seu_app_id META_APP_SECRET=sua_chave_secreta ./scripts/setup-meta-secrets.sh"
  echo ""
  echo "Ou exporte-as no terminal:"
  echo "  export META_APP_ID=seu_app_id"
  echo "  export META_APP_SECRET=sua_chave_secreta"
  echo "  ./scripts/setup-meta-secrets.sh"
  exit 1
fi

npx supabase secrets set META_APP_ID="$META_APP_ID" META_APP_SECRET="$META_APP_SECRET"
echo ""
echo "Secrets configurados. Faça o deploy da Edge Function (use --no-verify-jwt para evitar erro de sessão no callback):"
echo "  npx supabase functions deploy instagram-connect --no-verify-jwt"
