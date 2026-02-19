# Configurar o app Meta para conectar Instagram (API oficial)

O sistema usa **apenas** a conexão direta com o Instagram: **Instagram API with Instagram Login**. Não é necessário Facebook nem Página do Facebook.

---

## Por que preciso do Facebook Developers? E o mlabs não pede…

**Quem precisa de conta no Facebook Developers** é quem **cria/mantém o app** que faz a conexão com o Instagram — ou seja, você (ou sua empresa), ao usar a API oficial.

**Quem só vai conectar a conta e publicar** não precisa ser desenvolvedor: basta ter uma conta Instagram **Creator** ou **Business**. O usuário final nunca precisa criar um app.

Ferramentas como o **mlabs** (e outras de agendamento/publicação) não pedem que *você* crie um app porque **elas já têm o próprio app** na Meta. Quando o usuário clica em “Conectar Instagram”, está autorizando o **app do mlabs** — não um app seu. Por isso, para o usuário, basta ser conta creator; o “custo” de ter um app é da ferramenta, não do usuário.

**Resumindo:**

| Cenário | Quem precisa de app no Facebook Developers? | Quem só conecta/publica |
|--------|---------------------------------------------|--------------------------|
| **Você desenvolve este sistema** | Você (criar 1 app e colocá-lo “ao vivo”) | Só conta Creator/Business |
| **Uso de ferramenta tipo mlabs** | A ferramenta (app deles) | Só conta Creator/Business |

**Existe forma oficial de não usar Facebook Developers?**

- **Não**, se você for **quem desenvolve** a integração. A API oficial da Meta exige que **algum** app esteja registrado — ou o seu, ou o de um serviço terceiro.
- **Alternativa:** usar um provedor “Instagram API as a service” (ex.: Late, ou similares) que já tem app aprovado. Aí o usuário conecta no app deles e você consome a API deles para publicar. Você não cria app na Meta, mas passa a depender (e pagar) esse provedor.

Neste projeto, a opção usada é a **oficial**: um app seu no Meta, uma vez configurado e colocado “ao vivo”, permite que **qualquer** conta Creator/Business conecte e publique, sem precisar de conta de desenvolvedor.

---

## Usar um app que você já tem

**Pode.** Se você já tem um app no Meta for Developers, use esse mesmo app. Em vez de criar um novo:

1. **Confirme** que o produto **Instagram** está ativado no app (menu esquerdo → Instagram).
2. Siga a partir do **Passo 3** (Redirect URIs), depois **Passo 4** (ID e chave secreta) e o restante.
3. Se aparecer **"Função de desenvolvedor é insuficiente"**, peça a um administrador do app para te adicionar como **Administrador** ou **Desenvolvedor** (Passo 5).

---

## Passo a passo: criar um novo app (opcional)

Se preferir criar um app do zero, siga na ordem. Assim você já fica como administrador e evita o erro **"Função de desenvolvedor é insuficiente"**.

### 1. Criar o app no Meta

1. Acesse **[developers.facebook.com](https://developers.facebook.com)** e faça login com sua conta Facebook.
2. Clique em **Meus apps** (My apps) → **Criar app** (Create app).
3. Escolha **Outro** (Other) como tipo de uso e **Criar**.
4. Selecione **Aplicativo de consumo** (Consumer) ou **Empresa** (Business) — ambos permitem Instagram. Clique **Avançar**.
5. Preencha:
   - **Nome do app:** ex. `Insta Bulk Post` (ou o que quiser).
   - **Email de contato:** seu email.
   - **Conta de negócios:** pode pular ou escolher uma se tiver.
6. Clique **Criar app**. O app será criado e você já será **Administrador** — por isso não terá erro de "função insuficiente".

---

### 2. Ativar o produto Instagram (casos de uso)

1. No **Painel** do app, procure a lista **"Personalização do app e requisitos"** (ou **Use cases**).
2. Clique no item pendente: **"Personalizar o caso de uso 'Gerenciar mensagens e conteúdo no Instagram'"** (ou similar).
3. No assistente, escolha o que o app faz (ex.: **publicar conteúdo**, **gerenciar conteúdo**) e confirme.
4. Isso ativa o produto **Instagram** e o **Instagram Login (Business login)**.

Se não aparecer essa lista, no menu à esquerda clique em **Adicionar produto** (Add Product), procure **Instagram** e adicione. Depois entre em **Instagram** → **API setup with Instagram business login**.

---

### 3. Configurar Redirect URIs (obrigatório)

1. No menu à **esquerda**, clique em **Instagram**.
2. Vá em **API setup with Instagram business login** (ou "Configuração da API com login empresarial do Instagram").
3. Em **Set up business login** → **Business login settings**, abra as configurações.
4. Em **OAuth redirect URIs**, adicione **uma URL por linha** (sem vírgula, sem espaço no fim):

   ```
   http://localhost:5173/accounts/connect/instagram/callback
   https://reelspro-eight.vercel.app/accounts/connect/instagram/callback
   ```

   (Troque a segunda URL se seu domínio de produção for outro.)

5. Clique **Salvar** (Save).

---

### 4. Copiar ID do app e Chave secreta

1. Menu à esquerda → **Configurações do app** (App settings).
2. Em **Básico** (Basic):
   - **ID do app** → copie (vai no `.env`).
   - **Chave secreta do app** → clique em **Mostrar**, copie e guarde em local seguro (só no Supabase, nunca no frontend).

---

### 5. Adicionar sua conta como função (se criou o app com outra conta)

Se **você** criou o app, já é Admin e pode pular este passo.

Se outra pessoa criou o app e você vai testar:

1. Menu à esquerda → **Configurações do app** → **Funções** (Roles) ou **App roles**.
2. Em **Administradores** ou **Desenvolvedores**, clique em **Adicionar** e informe o Facebook/Instagram que você usa para **Conectar Instagram**. Assim não aparece "Função de desenvolvedor é insuficiente".

---

### 6. Configurar o projeto (.env)

1. Na **raiz** do projeto (pasta do `package.json`), abra ou crie o arquivo **`.env`**.
2. Adicione ou atualize (use o **ID do app** que você copiou; **não** coloque a chave secreta aqui):

   ```env
   VITE_META_APP_ID=COLE_AQUI_O_ID_DO_APP
   ```

   Exemplo: `VITE_META_APP_ID=1234567890123456`

3. Salve. Se o servidor estiver rodando, reinicie:

   ```bash
   npm run dev
   ```

---

### 7. Secrets e Edge Function no Supabase

A troca do código OAuth por token usa a **chave secreta** e só pode rodar no servidor (Edge Function).

1. No terminal, na raiz do projeto:

   ```bash
   npx supabase login
   npx supabase link --project-ref SEU_PROJECT_REF
   ```

   O **Project Ref** está em: Supabase Dashboard → Project Settings → General → **Reference ID**.

2. Defina os secrets (use o **mesmo** ID e a **chave secreta** do app que você criou):

   ```bash
   npx supabase secrets set META_APP_ID=SEU_APP_ID META_APP_SECRET=SUA_CHAVE_SECRETA
   ```

3. Faça o deploy das Edge Functions:

   ```bash
   npx supabase functions deploy instagram-connect
   npx supabase functions deploy publish-reel
   npx supabase functions deploy publish-scheduled
   ```

---

### 8. Testar a conexão

1. Com o `.env` configurado e o servidor rodando (`npm run dev`), faça **login** no app (Supabase).
2. Vá em **Contas**.
3. Clique em **Conectar Instagram**.
4. Você será redirecionado para a tela de permissões do **Instagram** (não do Facebook). Autorize.
5. Ao voltar, a conta deve aparecer em **Contas**.

**Requisito:** a conta Instagram deve ser **Business ou Creator** (conta profissional).

---

## Passo a passo rápido (painel com "Casos de uso")

Se no **Painel** do seu app aparece a lista "Personalização do app e requisitos" com itens pendentes, siga nesta ordem:

### Passo 1 — Personalizar o caso de uso do Instagram

1. No **Painel**, na lista de requisitos, clique no item pendente:
   - **"Personalizar o caso de uso 'Gerenciar mensagens e conteúdo no Instagram'"**
2. Siga o assistente: escolha o que seu app faz (ex.: publicar conteúdo, gerenciar conteúdo) e confirme.
3. Isso ativa o produto **Instagram** no app e prepara o **Instagram Login (Business login)**.

### Passo 2 — Configurar o Instagram Login e a Redirect URI

1. No menu à **esquerda**, clique em **Instagram** (deve aparecer após o passo 1).
2. Vá em **API setup with Instagram business login** (ou "Configuração da API com login empresarial do Instagram").
3. Em **Set up business login** → **Business login settings**, abra as configurações.
4. Em **OAuth redirect URIs**, adicione **uma URL por linha** (sem vírgula, sem espaço no fim):
   - Desenvolvimento: `http://localhost:5173/accounts/connect/instagram/callback`
   - Produção (este projeto): `https://reelspro-eight.vercel.app/accounts/connect/instagram/callback`
5. Salve (**Save**).

### Passo 3 — Copiar ID do app e chave secreta

1. Menu à esquerda → **Configurações do app** (App settings).
2. Em **Básico** (Basic):
   - **ID do app** → copie (vai no `.env` como `VITE_META_APP_ID`).
   - **Chave secreta do app** → copie e guarde em local seguro (só no Supabase, nunca no frontend).

### Passo 4 — Configurar o projeto

1. No projeto, arquivo **`.env`** na raiz, adicione:
   ```env
   VITE_META_APP_ID=COLE_AQUI_O_ID_DO_APP
   ```
2. Reinicie o servidor (`npm run dev`) se estiver rodando.
3. No Supabase, defina os secrets e faça deploy da Edge Function (detalhes na seção 5 abaixo).

### Passo 5 — Testar

1. No app, faça login → **Contas** → **Conectar Instagram**.
2. Você deve ser redirecionado para a tela de permissões do Instagram (não do Facebook).
3. Autorize; ao voltar, a conta deve aparecer em Contas.

**Observação:** "Verificação da empresa" e "Análise do app" são necessárias para **publicar** o app e permitir qualquer usuário. Em **modo de desenvolvimento**, só administradores, desenvolvedores e testadores do app conseguem conectar a conta — isso já basta para testar.

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

   **Produção (este projeto, Vercel):**
   ```
   https://reelspro-eight.vercel.app/accounts/connect/instagram/callback
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

**Erro "Invalid platform app" / "Solicitação de parâmetros inválida: Invalid platform app"**

Esse erro aparece quando o app no Meta **não está configurado para Instagram Login**. O Instagram só aceita apps que tenham o produto **Instagram** com **API setup with Instagram business login** ativo.

1. No [Painel de Desenvolvedores da Meta](https://developers.facebook.com), abra seu app.
2. No menu à esquerda, verifique se existe **Instagram**. Se não existir, clique em **Adicionar produto** (Add Product) e adicione **Instagram**.
3. Dentro de **Instagram**, use **API setup with Instagram business login** (ou "Configuração da API com login empresarial do Instagram"). Não use "Basic Display" nem a opção que exige Página do Facebook.
4. Em **Set up business login** → **Business login settings**, cadastre as **OAuth redirect URIs** (uma por linha), por exemplo:
   - `http://localhost:5173/accounts/connect/instagram/callback`
   - e a URL de produção: `https://reelspro-eight.vercel.app/accounts/connect/instagram/callback`.
5. Confirme que o **ID do app** usado no `.env` (`VITE_META_APP_ID`) é o **mesmo** desse app (Configurações do app → Básico → ID do app).
6. Salve as alterações e tente **Conectar Instagram** de novo.

Se o app foi criado como "Consumer" ou outro tipo, o produto Instagram com "Business login" ainda deve estar disponível; o importante é ter **Instagram** → **Set up business login** configurado e as redirect URIs preenchidas.

---

**Erro "Não foi possível se conectar ao Instagram" no localhost**

- Confira se a **Redirect URI** está **exatamente** igual no Meta (Instagram → Set up business login → OAuth redirect URIs). O app usa a origem atual (ex.: `http://localhost:5173`). A URL exata aparece na tela Contas (embaixo do botão).
- Se o Vite usar outra porta (ex.: 5174), adicione também `http://localhost:5174/accounts/connect/instagram/callback` no Meta.
- O código já envia `hl=en` na URL para evitar bug na tela em português. Se ainda falhar, teste em janela anônima ou com o navegador em inglês.
- Em **modo de desenvolvimento** no Meta, só contas que são **admin, desenvolvedor ou testador** do app conseguem concluir o login.

---

## 7. Modo de desenvolvimento vs produção — "Várias contas" sem ser desenvolvedor

**Você não precisa adicionar cada conta como desenvolvedor.** O erro "Função de desenvolvedor é insuficiente" aparece só porque o app está em **modo de desenvolvimento**. Nesse modo, a Meta limita o login a quem for **Administrador**, **Desenvolvedor** ou **Testador** do app — por isso serviços como o que você citou (que usam app em produção) não pedem isso.

Para conectar **várias e várias contas** (qualquer conta Instagram Business/Creator), faça o app ficar **em produção**:

1. No [Meta for Developers](https://developers.facebook.com), abra seu app.
2. No canto superior, onde está **"Em desenvolvimento"** (Development), clique e mude para **Ao vivo** (Live).
3. Se a Meta pedir, complete **Verificação da empresa** (Business verification) e **Revisão do app** (App Review) para as permissões que você usa (`instagram_business_basic`, `instagram_business_content_publish`).

Depois que o app estiver **Ao vivo**, qualquer pessoa com conta Instagram profissional pode **Conectar Instagram** no seu sistema, sem ser adicionada como desenvolvedor — igual a outros serviços que não usam "função de desenvolvedor".

**Resumo:**
- **Modo desenvolvimento:** só admin/desenvolvedor/testador do app conseguem conectar → erro "Função de desenvolvedor é insuficiente" para os demais.
- **Modo ao vivo (app publicado):** qualquer conta pode conectar; não é preciso adicionar ninguém como desenvolvedor.

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
https://reelspro-eight.vercel.app/accounts/connect/instagram/callback
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
