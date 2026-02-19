# Status do sistema – O que falta para finalizar

Com a parte do **Google Drive 100% funcional**, segue o que já está pronto e o que falta para considerar o sistema finalizado.

---

## ✅ O que já está pronto

| Área | Status | Observação |
|------|--------|------------|
| **Autenticação** | ✅ | Login Supabase, rotas protegidas, redirect pós-login |
| **Google Drive** | ✅ | Conectar, callback, listar pasta/vídeo, status "Conectado", carregar vídeos |
| **Contas Instagram** | ✅ | OAuth, conectar/reconectar/remover, listar com status ativa/expirada |
| **Novo Post** | ✅ | Link Drive → vídeos, legenda, contas, publicar agora ou agendar |
| **Publicar agora** | ✅ | Edge Function `publish-reel`, uma publicação por conta por vídeo |
| **Agendamento** | ✅ | Criar posts agendados com contas, fila em "Posts Agendados" |
| **Posts Agendados** | ✅ | Abas Pendentes/Publicados/Erros, excluir, "Publicar agora" manual |
| **Calendário** | ✅ | Visualização mensal, clicar no dia para ver posts do dia |
| **Dashboard** | ✅ | Resumo (contas, agendados, publicados, erros), posts recentes, alerta de token expirado |
| **Edge Functions** | ✅ | `google-connect`, `drive-list`, `drive-status`, `instagram-connect`, `publish-reel`, `publish-scheduled` |
| **Banco** | ✅ | `instagram_accounts`, `scheduled_posts`, `post_publish_logs`, `google_tokens` + RLS |
| **Documentação** | ✅ | `GOOGLE_DRIVE_SETUP.md`, `META_SETUP.md`, `.env.example` |
| **404** | ✅ | Página NotFound com link para Home |

---

## 🔶 O que falta para “sistema 100% finalizado”

### 1. **Cron para publicar agendados automaticamente** (importante)

- A função **`publish-scheduled`** está implementada e publicada, mas **ninguém a chama no horário**.
- Sem cron, os posts só saem se o usuário clicar em "Publicar agora" em **Posts Agendados**.

**O que fazer:**

1. Definir o secret no Supabase:
   ```bash
   npx supabase secrets set CRON_SECRET=uma_senha_forte_aqui
   ```
2. Configurar um cron que chame a URL da Edge Function `publish-scheduled` a cada 5–15 minutos, com o header:
   - `x-cron-secret: uma_senha_forte_aqui`

**Onde configurar:**

- **Supabase:** Database → Extensions → habilitar `pg_cron` (se disponível no seu plano) e criar job que faz `SELECT net.http_get(...)` para a Invoke URL da função, **ou**
- **Serviço externo:** Vercel Cron, GitHub Actions, ou qualquer cron que faça `GET`/`POST` na URL da função com o header acima.

A URL está em: **Supabase Dashboard → Edge Functions → publish-scheduled → Invoke URL**.

---

### 2. **Documentar o cron** (recomendado)

- Em `docs/META_SETUP.md` já existe um passo opcional sobre cron.
- Vale criar um **`docs/CRON_AGENDADOS.md`** com:
  - O que a função `publish-scheduled` faz
  - Exemplo de configuração no Supabase (se usar `pg_cron` ou HTTP)
  - Exemplo para Vercel Cron / outro provedor
  - Variável `CRON_SECRET` e header `x-cron-secret`

Assim qualquer pessoa consegue ativar a publicação automática dos agendados.

---

### 3. **Funcionalidades do plano original não implementadas** (opcionais)

No `.lovable/plan.md` constam duas coisas que **não** estão no código:

| Funcionalidade | Situação | Prioridade |
|----------------|----------|------------|
| **Pré-visualizar vídeos antes de selecionar** | Hoje só há lista (nome, tamanho). Não há player para assistir o vídeo antes de marcar. | Baixa – dá para usar só pela lista |
| **Arrastar para reagendar (drag & drop) no calendário** | No calendário só é possível ver e clicar no dia. Não há arrastar post para outro dia. | Baixa – dá para reagendar excluindo e criando de novo em Novo Post |

Se quiser “fechar” 100% em relação ao plano, seriam esses dois itens; para uso prático o sistema já está completo sem eles.

---

### 4. **README do repositório** (opcional)

- O `README.md` atual é o template Lovable (como editar, deploy, variáveis Vercel).
- Não descreve o **fluxo do produto** (Google → Drive → Novo Post → Agendar / Publicar).
- **Sugestão:** adicionar uma seção “O que é este projeto” e “Fluxo principal” (login → Contas → Conectar Google → Novo Post → Publicar ou Agendar), e referência a `docs/GOOGLE_DRIVE_SETUP.md` e `docs/META_SETUP.md`. Opcionalmente mencionar que, para agendados automáticos, é preciso configurar o cron (e apontar para o futuro `docs/CRON_AGENDADOS.md`).

---

### 5. **Variáveis de ambiente no deploy**

- **Frontend (Vercel):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_META_APP_ID`, `VITE_GOOGLE_CLIENT_ID` – já cobertas no README e em `.env.example`.
- **Supabase secrets:** Meta e Google já documentados; **CRON_SECRET** só é necessário para quem for usar o cron (pode ser citado no doc de cron).

Nada crítico falta nas variáveis para o fluxo atual.

---

### 6. **Testes automatizados**

- Não há testes (unitários ou e2e) no repositório.
- Para “finalizar” em termos de qualidade/recurso, seria adicionar testes; para “finalizar” em termos de funcionalidade, não é obrigatório.

---

## Resumo prático

| Item | Necessário para “sistema finalizado”? | Ação |
|------|--------------------------------------|------|
| **Cron para `publish-scheduled`** | Sim, se quiser que agendados publiquem sozinhos | Configurar cron (Supabase ou externo) + `CRON_SECRET` |
| **Doc do cron** | Recomendado | Criar `docs/CRON_AGENDADOS.md` (ou ampliar META_SETUP) |
| **Preview de vídeo** | Não | Opcional (melhoria de UX) |
| **Drag & drop no calendário** | Não | Opcional (melhoria de UX) |
| **README com fluxo do produto** | Recomendado | Atualizar README com “O que é” e “Como usar” |
| **Testes** | Opcional | Se quiser garantir regressões |

Conclusão: com o Google 100% funcional, o que **realmente** falta para fechar o sistema é **configurar o cron** que chama `publish-scheduled` (e documentar esse passo). O resto são melhorias e documentação opcional.
