# Configurar o app Meta para conectar Instagram (API oficial)

O sistema usa **apenas** a conexão direta com o Instagram: **Instagram API with Instagram Login**. Não é necessário Facebook nem Página do Facebook.

Use este guia depois de criar o app no [Painel de Desenvolvedores da Meta](https://developers.facebook.com).

---

## 1. App ID e App Secret

1. No menu à esquerda, clique em **Configurações do app** (App settings).
2. Em **Básico** (Basic), anote:
   - **ID do app** → use no `.env` como `VITE_META_APP_ID`
   - **Chave secreta do app** → use **somente no Supabase** (secrets da Edge Function), nunca no frontend

Guarde a chave secreta em local seguro; você vai precisar no passo 5.

---

## 2. Instagram API with Instagram Login

1. No menu à esquerda, vá em **Instagram** → **API setup with Instagram business login** (ou **Configuração da API com login empresarial do Instagram**).
2. Em **Set up business login** / **Configurar login empresarial**, abra **Business login settings**.
3. Em **OAuth redirect URIs**, adicione **uma URL por linha**:

   **Desenvolvimento (localhost):**
   ```
   http://localhost:5173/accounts/connect/instagram/callback
   ```

   **Produção (quando tiver o domínio):**
   ```
   https://SEU-DOMINIO.com/accounts/connect/instagram/callback
   ```

   Exemplo Vercel:
   ```
   https://insta-bulk-post.vercel.app/accounts/connect/instagram/callback
   ```

4. Use o **mesmo** App ID e App Secret do app em todo o fluxo (`VITE_META_APP_ID` no frontend e `META_APP_ID` / `META_APP_SECRET` nos secrets do Supabase).

---

## 3. Permissões (scopes)

O app pede estes scopes na tela de autorização do Instagram (já configurados em `src/lib/instagramOAuth.ts`):

- `instagram_business_basic` — dados básicos do perfil
- `instagram_business_content_publish` — publicar conteúdo (Reels, fotos, etc.)

Não é necessário configurar permissões de Facebook nem Página.

**Requisito:** a conta Instagram deve ser **Business ou Creator** (conta profissional). Não é necessário ter Página do Facebook vinculada.

---

## 4. `.env` no projeto (frontend)

1. Na raiz do projeto, abra ou crie o arquivo **`.env`**.
2. Adicione (use apenas o **ID do app**; não coloque a chave secreta aqui):

   ```env
   VITE_META_APP_ID=SEU_APP_ID_AQUI
   ```

   Exemplo (número fictício):

   ```env
   VITE_META_APP_ID=1234567890123456
   ```

3. Salve e reinicie o servidor se estiver rodando:

   ```bash
   npm run dev
   ```

---

## 5. Secrets e Edge Function no Supabase

A troca do `code` por token usa a **chave secreta** do app e só pode rodar no servidor (Edge Function).

1. No terminal, na raiz do projeto:

   ```bash
   npx supabase login
   npx supabase link --project-ref SEU_PROJECT_REF
   ```

   O **Project Ref** está em: Supabase Dashboard → Project Settings → General → **Reference ID**.

2. Defina os secrets (use o **ID do app** e a **chave secreta** do app Meta):

   ```bash
   npx supabase secrets set META_APP_ID=SEU_APP_ID META_APP_SECRET=SUA_CHAVE_SECRETA
   ```

3. Faça o deploy das Edge Functions **instagram-connect**, **publish-reel** e **publish-scheduled** (agendados):

   ```bash
   npx supabase functions deploy instagram-connect
   npx supabase functions deploy publish-reel
   npx supabase functions deploy publish-scheduled
   ```

4. **(Opcional)** Para o cron publicar posts no horário, defina o secret e configure um cron que chame a função:

   ```bash
   npx supabase secrets set CRON_SECRET=uma_senha_forte_aqui
   ```

   Depois, no Supabase Dashboard → **Database** → **Cron Jobs** (ou via SQL com `pg_cron`), agende uma chamada HTTP periódica (ex.: a cada 5 minutos) para a URL da função `publish-scheduled`, com o header `x-cron-secret: uma_senha_forte_aqui`. A URL está em **Edge Functions** → **publish-scheduled** → **Invoke URL**.

---

## 6. Testar a conexão

1. Com o `.env` configurado e o servidor rodando (`npm run dev`), faça **login** no app (Supabase).
2. Vá em **Contas**.
3. Clique em **Conectar Instagram**.
4. Você será redirecionado para a tela de permissões do **Instagram** (não do Facebook).
5. Autorize o app. Ao terminar, volta para o app em **Contas** com a conta listada.

**Erro "Não foi possível se conectar ao Instagram" no localhost**

- Confira se a **Redirect URI** está **exatamente** igual no Meta (Instagram → Set up business login → OAuth redirect URIs). O app usa a origem atual (ex.: `http://localhost:5173`). A URL exata aparece na tela Contas (embaixo do botão).
- Se o Vite usar outra porta (ex.: 5174), adicione também `http://localhost:5174/accounts/connect/instagram/callback` no Meta.
- O código já envia `hl=en` na URL para evitar bug na tela em português. Se ainda falhar, teste em janela anônima ou com o navegador em inglês.
- Em **modo de desenvolvimento** no Meta, só contas que são **admin, desenvolvedor ou testador** do app conseguem concluir o login.

---

## 7. Modo de desenvolvimento vs produção

- Em **modo de desenvolvimento**, apenas administradores, desenvolvedores e testadores do app no Meta conseguem usar o login.
- Para qualquer usuário em produção, é preciso **Publicar** o app e, para algumas permissões, passar pela **Revisão do app** da Meta.

---

## 8. Deploy na Vercel (produção)

O Vite usa as variáveis de ambiente **no momento do build**. O `.env` local não vai para a Vercel.

**Opção A – Script (recomendado)**  
Com o `.env` na raiz preenchido (incluindo `VITE_META_APP_ID`):

```bash
npm run vercel:env
```

Depois faça um novo deploy (Redeploy no painel ou `npx vercel --prod`).

**Opção B – Manual**  
1. Vercel Dashboard → projeto → **Settings** → **Environment Variables**.  
2. Adicione `VITE_META_APP_ID` com o valor do App ID da Meta.  
3. Marque **Production** (e Preview se quiser).  
4. Salve e faça **Redeploy**.

**Redirect URI em produção**  
No app Meta → **Instagram** → **Set up business login** → **OAuth redirect URIs**, adicione:

```
https://seu-dominio.vercel.app/accounts/connect/instagram/callback
```

---

## Resumo rápido

| Onde | O que fazer |
|------|-------------|
| Meta – Configurações do app | Copiar **ID do app** e **Chave secreta** |
| Meta – Instagram → Business login | Adicionar `http://localhost:5173/accounts/connect/instagram/callback` e a URL de produção |
| Projeto – `.env` | `VITE_META_APP_ID=SEU_APP_ID` |
| Terminal | `npx supabase secrets set META_APP_ID=... META_APP_SECRET=...` |
| Terminal | `npx supabase functions deploy instagram-connect`, `publish-reel` e `publish-scheduled` |
| Deploy Vercel | `npm run vercel:env` ou adicionar `VITE_META_APP_ID` e dar Redeploy |
| Navegador | Login no app → Contas → Conectar Instagram → autorizar no Instagram |

Se aparecer erro em algum passo, anote a mensagem e a etapa para ajustar o próximo passo.
