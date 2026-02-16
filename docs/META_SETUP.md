# Passo a passo: configurar o app Meta (PHD) para conectar Instagram

Use este guia depois de criar o app no [Painel de Desenvolvedores da Meta](https://developers.facebook.com).

---

## 1. Pegar o App ID e o App Secret

1. No menu à esquerda, clique em **Configurações do app** (App settings).
2. Na página que abrir, em **Básico** (Basic), anote:
   - **ID do app** → você vai usar no `.env` como `VITE_META_APP_ID`
   - **Chave secreta do app** → você vai usar **só no Supabase** (secrets da Edge Function), **nunca** no frontend

Guarde a chave secreta em um lugar seguro; você vai precisar no passo 6.

---

## 2. Configurar o produto "Facebook Login"

1. No menu à esquerda, em **Produtos** (ou em **Facebook Login para...**), abra **Facebook Login**.
2. Clique em **Configurações** (Settings).
3. Em **URIs de redirecionamento OAuth válidos** (Valid OAuth Redirect URIs), adicione **uma linha por URL**:

   **Desenvolvimento (localhost):**
   ```
   http://localhost:5173/accounts/connect/callback
   ```

   **Produção (quando tiver o domínio do app):**
   ```
   https://SEU-DOMINIO.com/accounts/connect/callback
   ```

   Exemplo se for Vercel/Netlify:
   ```
   https://insta-bulk-post.vercel.app/accounts/connect/callback
   ```

4. Em **Modo de uso** (se existir), deixe em **Web**.
5. Clique em **Salvar alterações**.

---

## 3. Garantir permissões do Instagram (Graph API)

Na interface atual do Painel da Meta **não existe mais um item “Instagram” no menu à esquerda**. O produto Instagram é adicionado pelos **Casos de uso** ou pelo Painel principal.

### Opção A — Pelo Painel (recomendado)

1. No menu à esquerda, clique em **Painel** (Dashboard).
2. Na página do Painel, clique no botão **Adicionar casos de uso** (no canto superior direito).
3. No filtro à esquerda, escolha **Gerenciamento de conteúdo**. Na lista, marque **Gerenciar mensagens e conteúdo no Instagram** (publicar posts, stories, responder comentários e mensagens com a API do Instagram). Clique em **Salvar**.
4. Se aparecer um card do produto **Instagram** na própria página do Painel (ao rolar), clique em **Configurar** ou **Set up** nesse card.

### Opção B — Pelo menu Casos de uso

1. No menu à esquerda, clique em **Casos de uso** (Use cases).
2. Clique em **Adicionar casos de uso** ou edite os existentes.
3. Adicione ou personalize o caso de uso que dá acesso à **API do Instagram** (publicar conteúdo, gerenciar comentários, etc.). Associe ao **Facebook Login** se for pedido.

### Permissões necessárias

Para publicar Reels e conteúdo, o app precisa pedir estas permissões no login:

- `pages_show_list` — lista de páginas do Facebook
- `instagram_basic` — dados básicos do perfil Instagram
- `instagram_content_publish` — publicar conteúdo (Reels, fotos, etc.)

O nosso código já envia essas permissões na URL de login (`src/lib/metaOAuth.ts`). Você **não** precisa configurar nada extra no código.

### Como as permissões são concedidas

1. **No painel da Meta**  
   Ao adicionar o caso de uso **“Gerenciar mensagens e conteúdo no Instagram”** (passo 3), o app fica autorizado a *pedir* essas permissões. Não existe uma tela separada para “ativar” cada permissão uma a uma — o caso de uso já as inclui.

2. **Quem concede é o usuário**  
   As permissões são concedidas **no momento do login**: quando a pessoa clica em **Conectar Conta** no seu app, é redirecionada para o Facebook, que mostra uma tela pedindo acesso às páginas e ao Instagram (incluindo publicar conteúdo). Ao clicar em **Continuar** / **Permitir**, a Meta associa essas permissões ao token do seu app.

3. **Onde conferir no painel (opcional)**  
   No menu à esquerda: **Revisão do app** (App Review) → **Permissões e recursos** (Permissions and Features). Lá aparecem as permissões que o app pode solicitar e o status (acesso padrão em desenvolvimento ou acesso avançado após revisão). Em **modo de desenvolvimento**, apenas administradores, desenvolvedores e usuários de teste do app conseguem fazer o login e conceder as permissões.

4. **Produção**  
   Para usuários que não são admin/dev/testador, é preciso **Publicar** o app e, para algumas permissões, passar pela **Revisão do app** da Meta.

---

## 4. Configurar o `.env` no projeto (frontend)

1. Na raiz do projeto (pasta onde está o `package.json`), abra ou crie o arquivo **`.env`**.
2. Adicione a linha com o **ID do app** (não use a chave secreta aqui):

   ```env
   VITE_META_APP_ID=SEU_APP_ID_AQUI
   ```

   Exemplo (com número fictício):

   ```env
   VITE_META_APP_ID=1234567890123456
   ```

3. Salve o arquivo e **reinicie o servidor** se ele estiver rodando:

   ```bash
   npm run dev
   ```

---

## 5. URIs de redirecionamento no app Meta (revisão)

No app **PHD** → **Facebook Login** → **Configurações**:

- Confirme que está salvo exatamente:
  - `http://localhost:5173/accounts/connect/callback` (para desenvolvimento)
- A URL deve ser **igual** à que o navegador usa ao voltar da Meta (mesmo protocolo, domínio e caminho). Sem barra no final.

---

## 6. Configurar secrets e publicar a Edge Function no Supabase

A troca do `code` por token usa a **chave secreta** do app. Isso só pode rodar no servidor (Edge Function), nunca no frontend.

1. Abra o terminal na raiz do projeto.
2. Faça login no Supabase (se ainda não fez):

   ```bash
   npx supabase login
   ```

3. Vincule o projeto (substitua pelo ID do seu projeto no Supabase):

   ```bash
   npx supabase link --project-ref SEU_PROJECT_REF
   ```

   O **Project Ref** está em: Supabase Dashboard → Project Settings → General → **Reference ID**.

4. Defina os secrets da Edge Function (use o **ID do app** e a **chave secreta** do app PHD):

   ```bash
   npx supabase secrets set META_APP_ID=SEU_APP_ID META_APP_SECRET=SUA_CHAVE_SECRETA
   ```

   Exemplo (valores fictícios):

   ```bash
   npx supabase secrets set META_APP_ID=1234567890123456 META_APP_SECRET=abc123def456...
   ```

5. Faça o deploy da função `meta-connect`:

   ```bash
   npx supabase functions deploy meta-connect
   ```

6. Se aparecer erro de região ou projeto, confira o `project_id` em `supabase/config.toml` e o `supabase link`.

---

## 7. Testar a conexão no app

1. Com o `.env` configurado e o servidor rodando (`npm run dev`), acesse o app e faça **login** (Supabase).
2. Vá em **Contas** (ou **Contas Instagram**).
3. Clique em **Conectar Conta**.
4. Você deve ser redirecionado para o login da **Meta/Facebook**.
5. Faça login e autorize o app **PHD** (permissões de páginas e Instagram).
6. Ao terminar, a Meta redireciona de volta para:
   `http://localhost:5173/accounts/connect/callback?code=...&state=...`
7. O frontend chama a Edge Function com esse `code`; a função troca por token, busca páginas e contas Instagram e grava em `instagram_accounts`.
8. Você deve voltar para **Contas** e ver a(s) conta(s) Instagram listada(s).

**Requisito:** a conta Instagram precisa ser **Business ou Creator** e estar **vinculada a uma Página do Facebook** que você administra. Se não tiver página vinculada, a Meta não retorna conta Instagram e a função pode responder “No Facebook Pages found” ou similar.

---

## 8. Modo de desenvolvimento vs publicação

- Em **modo de desenvolvimento**, só contas que são **administradores, desenvolvedores ou testadores** do app **PHD** conseguem usar o login.
- Para qualquer usuário usar em produção, é preciso **Publicar** o app e, para algumas permissões, passar pela **Revisão do app** (e, se pedido, “Tornar-se um Provedor de Tecnologia” e verificação de acesso).

Para testar agora, use uma conta Facebook que seja **admin/dev/tester** do app PHD e uma conta Instagram Business/Creator ligada a uma página dessa conta.

---

## Resumo rápido

| Onde | O que fazer |
|------|-------------|
| Meta – Configurações do app | Copiar **ID do app** e **Chave secreta** |
| Meta – Facebook Login → Configurações | Adicionar `http://localhost:5173/accounts/connect/callback` em URIs de redirecionamento |
| Projeto – `.env` | `VITE_META_APP_ID=SEU_APP_ID` |
| Terminal | `npx supabase secrets set META_APP_ID=... META_APP_SECRET=...` |
| Terminal | `npx supabase functions deploy meta-connect` |
| Navegador | Login no app → Contas → Conectar Conta → autorizar no Facebook |

Se em algum passo aparecer uma mensagem de erro (Meta, Supabase ou no app), copie a mensagem e a etapa em que parou para podermos ajustar o próximo passo.
