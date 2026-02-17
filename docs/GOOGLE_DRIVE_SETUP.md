# Google Drive – link da pasta ou vídeo para publicar Reels

O app permite colar um **link do Google Drive** (pasta ou vídeo) e carregar os vídeos automaticamente para publicar ou agendar no Instagram.

---

## 1. Passo a passo no Google Cloud Console

### 1.1 Entrar e criar/selecionar o projeto

1. Abra o navegador e acesse: **https://console.cloud.google.com**
2. Faça login na conta Google que você quer usar (pode ser a mesma do Drive).
3. No topo da página, clique no **seletor de projeto** (onde está escrito o nome do projeto atual).
4. Clique em **NOVO PROJETO**.
5. Dê um nome (ex.: `insta-bulk-post`), escolha a organização se aparecer e clique em **Criar**.
6. Aguarde alguns segundos e selecione esse projeto no seletor do topo (se não estiver já selecionado).

---

### 1.2 Ativar a Google Drive API

1. No menu da esquerda (☰), vá em **APIs e serviços** → **Biblioteca** (ou acesse direto: **https://console.cloud.google.com/apis/library**).
2. Na busca, digite: **Google Drive API**.
3. Clique no resultado **Google Drive API** (ícone do Drive).
4. Clique no botão **ATIVAR**.
5. Quando ativar, você será levado à página da API; pode voltar ao menu principal.

---

### 1.3 Configurar a tela de consentimento OAuth

1. No menu da esquerda: **APIs e serviços** → **Tela de consentimento OAuth** (ou: **https://console.cloud.google.com/apis/credentials/consent**).
2. Se for a primeira vez, escolha o **Tipo de usuário**:
   - **Externo** – qualquer pessoa com conta Google pode usar (recomendado para seu próprio uso ou para outros usuários).
   - **Interno** – só contas do seu domínio (Google Workspace). Se não tiver Workspace, use **Externo**.
3. Clique em **CRIAR**.
4. **Página 1 – Informações do app**:
   - **Nome do app**: ex. `Insta Bulk Post` (ou o nome que quiser).
   - **E-mail de suporte do usuário**: seu e-mail (obrigatório).
   - **Logotipo do app**: opcional; pode pular.
   - Clique em **SALVAR E CONTINUAR**.
5. **Página 2 – Escopos**:
   - Clique em **ADICIONAR OU REMOVER ESCOPOS**.
   - Na lista, procure por **Google Drive API**.
   - Marque o escopo: **Ver e gerenciar seus arquivos e documentos no Google Drive** (ou algo como “See and manage your files in Google Drive”). O valor do escopo deve ser: `https://www.googleapis.com/auth/drive.readonly`.
   - Se não achar pelo nome, use o filtro e adicione manualmente o escopo: `https://www.googleapis.com/auth/drive.readonly` (somente leitura).
   - Clique em **ATUALIZAR** e depois **SALVAR E CONTINUAR**.
6. **Página 3 – Usuários de teste** (só aparece se o tipo for **Externo**):
   - Enquanto o app estiver em “Teste”, só contas listadas aqui podem usar. Clique em **+ ADICIONAR USUÁRIOS** e adicione seu e-mail (e de quem for testar).
   - Clique em **SALVAR E CONTINUAR**.
7. **Página 4 – Resumo**: revise e clique em **VOLTAR AO PAINEL**.

---

### 1.4 Criar as credenciais OAuth (ID e chave secreta)

1. No menu da esquerda: **APIs e serviços** → **Credenciais** (ou: **https://console.cloud.google.com/apis/credentials**).
2. Clique em **+ CRIAR CREDENCIAIS** no topo.
3. Escolha **ID do cliente OAuth**.
4. Em **Tipo de aplicativo**, selecione **Aplicativo da Web**.
5. Dê um **Nome** (ex.: `Insta Bulk Post – Web`).
6. Em **URIs de redirecionamento autorizados**:
   - Clique em **+ ADICIONAR URI**.
   - Adicione exatamente (uma por linha):
     - Para desenvolvimento (Vite padrão):  
       `http://localhost:5173/new-post/drive/callback`
     - Se o Vite usar outra porta (ex.: 5174), adicione também:  
       `http://localhost:5174/new-post/drive/callback`
     - Para produção (Vercel deste projeto):  
       `https://reelspro-eight.vercel.app/new-post/drive/callback`
   - Não adicione barras no final e não use `http` em produção.
7. Deixe **Origens JavaScript autorizadas** em branco (não é obrigatório para esse fluxo).
8. Clique em **CRIAR**.
9. Na janela que abrir, você verá:
   - **ID do cliente** (algo como `123456789-xxxx.apps.googleusercontent.com`)  
     → use no `.env` como `VITE_GOOGLE_CLIENT_ID`.
   - **Chave secreta do cliente**  
     → use **apenas** nos secrets do Supabase, nunca no frontend.
10. Você pode copiar a chave secreta na hora ou depois em **Credenciais** → clicar no nome do cliente OAuth que você criou. Guarde os dois em local seguro.

---

### 1.5 Resumo do que você precisa depois

| Onde usar | Valor |
|-----------|--------|
| Arquivo `.env` do projeto (frontend) | `VITE_GOOGLE_CLIENT_ID=` + **ID do cliente** |
| Supabase (secrets) | `GOOGLE_CLIENT_ID=` + **ID do cliente** e `GOOGLE_CLIENT_SECRET=` + **Chave secreta** |

---

## 2. Variáveis no projeto

**Frontend (`.env` na raiz):**

```env
VITE_GOOGLE_CLIENT_ID=SEU_CLIENT_ID.apps.googleusercontent.com
```

Use apenas o **ID do cliente**. A chave secreta **nunca** vai no frontend.

**Supabase (secrets das Edge Functions):**

```bash
npx supabase secrets set GOOGLE_CLIENT_ID=SEU_CLIENT_ID GOOGLE_CLIENT_SECRET=SUA_CHAVE_SECRETA
```

---

## 3. Deploy das Edge Functions

```bash
npx supabase functions deploy google-connect
npx supabase functions deploy drive-list
```

---

## 4. Fluxo no app

1. Em **Novo Post**, clique em **Conectar Google** (uma vez) e autorize o app a acessar o Drive (somente leitura).
2. Cole o link de uma **pasta** do Drive (ex.: `https://drive.google.com/drive/folders/XXXX`) ou de um **vídeo** (ex.: `https://drive.google.com/file/d/XXXX/view`).
3. Clique em **Carregar vídeos**. O sistema lista os vídeos da pasta ou o vídeo do link.
4. Marque os vídeos que deseja publicar, escolha as contas e a legenda.
5. Use **Publicar Agora** ou **Agendar**.

---

## 5. Compartilhamento dos arquivos

Para a **Meta (Instagram)** conseguir baixar o vídeo e publicar, o arquivo ou a pasta precisa estar compartilhado com **"Qualquer pessoa com o link"** (ou pelo menos a opção que permite "Qualquer pessoa com o link pode ver/baixar").  
Links apenas para "Pessoas específicas" ou só para você não funcionam na publicação.

---

## 6. Erro "Sessão expirada ou inválida" ao conectar o Google

Se, ao voltar da tela de autorização do Google, aparecer **"Sessão expirada ou inválida. Faça login novamente e tente conectar o Google."**:

1. **Faça logout e login de novo** no app e tente conectar o Google Drive outra vez.
2. Use **uma única aba**: abra o app, clique em Conectar Google na mesma aba; evite abrir o link do Google em outra aba ou janela, para a sessão não se perder.
3. Se o erro continuar, no Supabase Dashboard verifique se a Edge Function `google-connect` está com os secrets corretos (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) e se o projeto usa a mesma configuração de JWT do frontend.

---

## 7. Erro "Failed to send a request" ou "Edge Function returned a non-2xx status code"

Se ao colar o link do Drive e clicar em **Carregar vídeos** aparecer **"Erro no Drive"** com uma dessas mensagens:

1. **Conecte o Google antes**: clique em **Conectar Google** na tela Novo Post, autorize o app no Google e só depois cole o link e clique em Carregar vídeos.
2. **Confirme que as Edge Functions estão publicadas** no mesmo projeto Supabase que o app usa:
   ```bash
   npx supabase functions deploy google-connect
   npx supabase functions deploy drive-list
   ```
3. **Confira o `.env`**: `VITE_SUPABASE_URL` deve ser a URL do projeto (ex.: `https://SEU_PROJECT_ID.supabase.co`).
4. Se o projeto for **remoto** (Supabase na nuvem), faça login antes do deploy: `npx supabase login` e depois `npx supabase link --project-ref SEU_PROJECT_ID` na pasta do projeto.

---

## 8. Resumo rápido

| Onde | O que fazer |
|------|-------------|
| Google Cloud | Ativar Drive API, tela de consentimento, credenciais OAuth (Web), redirect URI |
| `.env` | `VITE_GOOGLE_CLIENT_ID=...` |
| Supabase secrets | `GOOGLE_CLIENT_ID=...` e `GOOGLE_CLIENT_SECRET=...` |
| Terminal | `npx supabase functions deploy google-connect` e `drive-list` |
| App | Novo Post → Conectar Google → colar link → Carregar vídeos → publicar/agendar |
