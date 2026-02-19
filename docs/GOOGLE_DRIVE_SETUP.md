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

O deploy das Edge Functions é feito **no Supabase** (não via GitHub/Vercel). Use `--no-verify-jwt` nas três funções para evitar erro de sessão (o JWT é validado dentro de cada função).

```bash
npx supabase functions deploy google-connect --no-verify-jwt
npx supabase functions deploy drive-status --no-verify-jwt
npx supabase functions deploy drive-list --no-verify-jwt --no-verify-jwt
```

A função **drive-status** é usada pela tela "Novo Post" para exibir "Conectado ao Google" ou "Não conectado". Sem ela, ou se o gateway rejeitar o JWT, pode aparecer o aviso "Não foi possível confirmar a conexão" — nesse caso faça o deploy com `--no-verify-jwt`: `npx supabase functions deploy drive-status --no-verify-jwt`.

Se o projeto for remoto: `npx supabase login` e `npx supabase link --project-ref SEU_PROJECT_ID` antes, se ainda não tiver linkado.

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

Se, ao voltar da tela de autorização do Google, aparecer **"Sessão expirada ou inválida. Faça login no app (ou logout e login de novo) e tente conectar o Google outra vez."**:

1. **Deploy com `--no-verify-jwt`** (causa mais comum): o gateway do Supabase pode rejeitar o JWT antes da sua função rodar. Faça o deploy da função assim:
   ```bash
   npx supabase functions deploy google-connect --no-verify-jwt
   ```
   A função continua segura: ela valida o token internamente com `getUser(token)`. Depois teste de novo (login → Conectar Google → autorizar e voltar).

2. **Faça logout e login de novo** no app e tente conectar o Google Drive outra vez.

3. **Use uma única aba**: abra o app, clique em Conectar Google na mesma aba; evite abrir o link do Google em outra aba ou janela, para a sessão não se perder.

4. **Mesmo projeto**: confira que o frontend (`.env`: `VITE_SUPABASE_URL` e chave anon) e a Edge Function `google-connect` usam o **mesmo** projeto Supabase. No Dashboard, veja o project ref e a URL do projeto.

5. **Diagnóstico**: no Supabase Dashboard → Edge Functions → Logs da `google-connect`. Se no horário do erro **não houver nenhuma execução**, o 401 veio do gateway → use o passo 1. Se a função foi invocada e ainda assim 401, o log mostrará o motivo (ex.: "jwt expired", "invalid signature").

6. **Secrets**: verifique se a função está com os secrets corretos (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).

---

## 6.1 Erro "The OAuth client was not found"

Se, ao voltar da tela de autorização do Google, aparecer **"The OAuth client was not found"** (ou "Cliente OAuth não encontrado"):

1. **Google Cloud Console – cliente existe?**  
   Acesse **https://console.cloud.google.com/apis/credentials**, selecione o projeto correto e confira se o **ID do cliente OAuth** que você está usando ainda existe. Se você criou outro projeto ou apagou o cliente, crie um novo (tipo **Aplicativo da Web**) e use o novo ID e a nova chave secreta em todo lugar.

2. **Mesmo ID em todo lugar**  
   O **mesmo** ID do cliente deve estar em:
   - **Frontend**: `.env` → `VITE_GOOGLE_CLIENT_ID=...` (e em produção, nas variáveis de ambiente do Vercel).
   - **Supabase**: Settings → Edge Functions → Secrets → `GOOGLE_CLIENT_ID=...` (exatamente o mesmo valor).  
   Se um estiver com valor antigo ou de outro projeto, o Google devolve "OAuth client was not found".

3. **Chave secreta no Supabase**  
   Em **Supabase → Secrets**, defina também `GOOGLE_CLIENT_SECRET` com a **Chave secreta do cliente** do mesmo cliente OAuth (Credenciais → clique no nome do cliente → copiar chave secreta).  
   Depois faça o deploy de novo:  
   `npx supabase functions deploy google-connect --no-verify-jwt`

4. **Redirect URI exata**  
   No Google Cloud Console → Credenciais → seu cliente OAuth → **URIs de redirecionamento autorizados** deve conter **exatamente** a URL de callback do app, por exemplo:
   - Local: `http://localhost:5173/new-post/drive/callback`
   - Produção: `https://reelspro-eight.vercel.app/new-post/drive/callback`  
   Sem barra no final e com o protocolo correto (https em produção).

5. **Projeto correto no Console**  
   No topo do Google Cloud Console, confirme que o projeto selecionado é o que tem o cliente OAuth que você está usando. Se você tiver vários projetos, é fácil estar no projeto errado.

6. **Usar o “Detalhe do Google” para diagnosticar**  
   Depois de tentar conectar de novo, a mensagem de erro no app pode mostrar **“Detalhe do Google”** com o código e a descrição exatos que o Google devolveu:
   - **`redirect_uri_mismatch`** → a URL de callback que o app enviou não está igual à que está nas “URIs de redirecionamento autorizados” no Console. Copie a **“Redirect URI usada”** que aparece no erro e adicione essa URL exata no Google Cloud Console (Credenciais → seu cliente → URIs de redirecionamento).
   - **`invalid_client`** ou “OAuth client was not found” → em geral é ID do cliente ou chave secreta errados (ou de outro projeto). Confira que o ID nos secrets do Supabase é o mesmo do .env e do Console; confira que a chave secreta é a do mesmo cliente (e sem espaços/linhas extras ao colar).
   Nos **logs da Edge Function** (Supabase → Edge Functions → google-connect → Logs) você também vê a `redirect_uri` que foi enviada ao Google e o início do `client_id`, para conferir com o que está configurado.

---

## 6.2 Erro "Erro 401 ao chamar o Drive"

Se ao colar o link do Drive e clicar em **Carregar vídeos** aparecer **"Erro no Drive"** com **"Erro 401 ao chamar o Drive"** (ou "Sessão inválida ou expirada"):

1. **Muitas vezes é consequência do "OAuth client was not found"**  
   Se antes você viu "The OAuth client was not found" ao conectar o Google, corrija primeiro o cliente OAuth (seção 6.1). Depois faça **Conectar Google** de novo, autorize o app e só então use **Carregar vídeos**.

2. **Sessão do app expirada**  
   Faça **logout e login** no app e, em seguida, **Conectar Google** de novo na tela Novo Post. Só então cole o link e clique em Carregar vídeos.

3. **Secrets da drive-list**  
   A Edge Function `drive-list` também usa `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` para renovar o access token do Drive. Confira em **Supabase → Settings → Edge Functions → Secrets** se os dois estão definidos e corretos. Depois:
   ```bash
   npx supabase functions deploy drive-list --no-verify-jwt
   ```

4. **Conecte o Google antes de carregar**  
   É obrigatório ter clicado em **Conectar Google** e autorizado o app pelo menos uma vez antes de carregar vídeos. Se não tiver, a API retorna 401/400.

---

## 7. Erro "Failed to send a request" ou "Edge Function returned a non-2xx status code"

O app agora exibe a **mensagem real** retornada pela Edge Function (ex.: "Conta inativa", "Sessão inválida", erro da API do Instagram). Se ainda aparecer só "Edge Function returned a non-2xx status code", veja os logs em **Supabase Dashboard → Edge Functions → publish-reel → Logs**.

**Se o erro for ao carregar vídeos** (link do Drive):

1. **Conecte o Google antes**: clique em **Conectar Google** na tela Novo Post, autorize o app no Google e só depois cole o link e clique em Carregar vídeos.
2. **Confirme que as Edge Functions estão publicadas** no mesmo projeto Supabase que o app usa:
   ```bash
   npx supabase functions deploy google-connect --no-verify-jwt
   npx supabase functions deploy drive-list --no-verify-jwt
   ```
3. **Confira o `.env`**: `VITE_SUPABASE_URL` deve ser a URL do projeto (ex.: `https://SEU_PROJECT_ID.supabase.co`).
4. Se o projeto for **remoto** (Supabase na nuvem), faça login antes do deploy: `npx supabase login` e depois `npx supabase link --project-ref SEU_PROJECT_ID` na pasta do projeto.

**Se o erro for ao clicar em "Publicar Agora"**:

- A **Meta/Instagram** precisa conseguir baixar o vídeo pela URL. A pasta/arquivo do Drive deve estar compartilhado com **"Qualquer pessoa com o link"** (pode ver). Se a URL não for acessível publicamente, a API da Meta falha.
- Confira em **Supabase → Edge Functions → publish-reel** se está publicada: `npx supabase functions deploy publish-reel`.
- Veja os **Logs** da função no horário da publicação: o corpo do erro (ex.: mensagem da API do Instagram) aparece lá.

---

## 8. Resumo rápido

| Onde | O que fazer |
|------|-------------|
| Google Cloud | Ativar Drive API, tela de consentimento, credenciais OAuth (Web), redirect URI |
| `.env` | `VITE_GOOGLE_CLIENT_ID=...` |
| Supabase secrets | `GOOGLE_CLIENT_ID=...` e `GOOGLE_CLIENT_SECRET=...` |
| Terminal | `npx supabase functions deploy google-connect --no-verify-jwt` e `drive-list` |
| App | Novo Post → Conectar Google → colar link → Carregar vídeos → publicar/agendar |
