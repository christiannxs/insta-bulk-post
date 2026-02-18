# Checklist: corrigir OAuth com o Google

Siga estes passos na ordem para garantir que o cliente OAuth e a Redirect URI estão corretos em todos os lugares.

---

## 1. Google Cloud Console

- [ ] Acesse **Credenciais** do seu projeto: https://console.cloud.google.com/apis/credentials  
- [ ] Abra o cliente OAuth do tipo **Aplicativo da Web** (ou crie um).  
- [ ] Copie o **ID do cliente** e a **Chave secreta do cliente**.  
- [ ] Em **URIs de redirecionamento autorizados**, confirme que está listada **exatamente**:
  - `https://<seu-dominio-vercel>/new-post/drive/callback`  
  - (e, para desenvolvimento local: `http://localhost:5173/new-post/drive/callback`)  
- [ ] Sem barra no final da URL; use `https` em produção.

---

## 2. Supabase – Secrets

- [ ] Vá em **Settings** → **Edge Functions** (no projeto Supabase).  
- [ ] Defina os **Secrets**:
  - `GOOGLE_CLIENT_ID` = **ID do cliente** (o mesmo do passo 1).  
  - `GOOGLE_CLIENT_SECRET` = **Chave secreta do cliente** (a mesma do passo 1).  
- [ ] Ao colar, evite espaços ou linhas extras no início/fim.

---

## 3. Terminal – Redeploy das Edge Functions

Depois de salvar os secrets no Supabase, rode no terminal (na raiz do projeto):

```bash
npx supabase functions deploy google-connect --no-verify-jwt
npx supabase functions deploy drive-list
```

(Se o projeto for remoto: `npx supabase login` e `npx supabase link --project-ref SEU_PROJECT_ID` antes.)

---

## 4. Arquivo `.env` (local)

- [ ] No arquivo **`.env`** na raiz do projeto, confirme:
  - `VITE_GOOGLE_CLIENT_ID=` **mesmo ID do cliente** do passo 1.  
- [ ] Reinicie o servidor de desenvolvimento (`npm run dev`) após alterar o `.env`.

---

## 5. Vercel – Variáveis de ambiente

- [ ] No projeto na **Vercel**, vá em **Settings** → **Environment Variables**.  
- [ ] Confirme que **`VITE_GOOGLE_CLIENT_ID`** está definida com o **mesmo ID do cliente**.  
- [ ] Se alterar, faça um **novo deploy** do projeto para as variáveis atualizarem.

---

## Resumo

| Onde              | Variável / Campo              | Valor                          |
|-------------------|-------------------------------|---------------------------------|
| Google Console    | URIs de redirecionamento      | `https://<dominio>/new-post/drive/callback` |
| Supabase Secrets  | `GOOGLE_CLIENT_ID`            | ID do cliente                   |
| Supabase Secrets  | `GOOGLE_CLIENT_SECRET`        | Chave secreta do cliente        |
| `.env`            | `VITE_GOOGLE_CLIENT_ID`       | Mesmo ID do cliente             |
| Vercel            | `VITE_GOOGLE_CLIENT_ID`       | Mesmo ID do cliente             |

Documentação completa: [GOOGLE_DRIVE_SETUP.md](./GOOGLE_DRIVE_SETUP.md).
