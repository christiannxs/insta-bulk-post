

## 📱 Sistema de Postagem em Massa de Reels — Estilo mLabs

### Visão Geral
Plataforma pessoal para gerenciar múltiplas contas do Instagram e publicar Reels em massa, usando vídeos armazenados no Google Drive.

---

### 🔧 Configuração Inicial
- **Supabase**: Configurar banco de dados, autenticação e Edge Functions
- **Secrets**: Armazenar credenciais da Meta API (App ID, App Secret) e Google Drive API de forma segura

---

### 📌 Funcionalidades

#### 1. Autenticação Pessoal
- Login simples para proteger o acesso ao sistema (somente você)

#### 2. Gerenciamento de Contas Instagram
- Conectar múltiplas contas Business/Creator via OAuth do Facebook/Instagram
- Listar contas conectadas com status (ativa/expirada)
- Reconectar contas quando o token expirar
- Remover contas

#### 3. Integração com Google Drive
- Conectar sua conta Google Drive
- Navegar e selecionar vídeos de uma pasta específica do Drive
- Pré-visualizar os vídeos antes de selecionar

#### 4. Postagem em Massa de Reels
- Selecionar vídeos do Google Drive
- Adicionar legenda (caption) — mesma ou individual por conta
- Escolher em quais contas postar (todas ou selecionar)
- Publicar imediatamente ou agendar
- Barra de progresso mostrando status de publicação em cada conta

#### 5. Agendamento de Posts
- Agendar Reels para data e horário específicos
- Fila de posts agendados com status (pendente, publicado, erro)
- Edge Function com cron job para executar publicações agendadas automaticamente

#### 6. Calendário Visual
- Visualização mensal/semanal dos posts agendados e publicados
- Código de cores por status (agendado, publicado, erro)
- Clicar no dia para ver detalhes ou criar novo agendamento
- Arrastar para reagendar (drag & drop)

#### 7. Dashboard
- Resumo: total de contas, posts agendados, posts publicados
- Posts recentes com status
- Alertas de tokens expirados

---

### 🎨 Design
- Interface limpa e moderna, inspirada no mLabs
- Sidebar com navegação: Dashboard, Contas, Novo Post, Calendário, Agendados
- Dark mode por padrão
- Responsivo para uso em desktop

