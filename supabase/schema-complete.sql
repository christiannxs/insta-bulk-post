-- =============================================================================
-- INSTA BULK POST - Schema completo para rodar o app 100% funcional
-- Execute este arquivo no SQL Editor do Supabase (Dashboard > SQL Editor).
-- Requer: Auth já habilitado (Supabase já cria auth.users).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabela: instagram_accounts (contas Instagram conectadas pelo usuário)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.instagram_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  instagram_user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  profile_picture_url TEXT,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  page_id TEXT,
  page_access_token TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'disconnected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.instagram_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own accounts" ON public.instagram_accounts;
CREATE POLICY "Users can manage their own accounts"
  ON public.instagram_accounts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 2. Tabela: scheduled_posts (posts agendados/publicados)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scheduled_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_url TEXT NOT NULL,
  video_name TEXT,
  caption TEXT DEFAULT '',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'publishing', 'published', 'failed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own posts" ON public.scheduled_posts;
CREATE POLICY "Users can manage their own posts"
  ON public.scheduled_posts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 3. Tabela: post_publish_logs (log de publicação por conta por post)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_publish_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.scheduled_posts(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'publishing', 'published', 'failed')),
  ig_media_id TEXT,
  error_message TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.post_publish_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own logs" ON public.post_publish_logs;
CREATE POLICY "Users can view their own logs"
  ON public.post_publish_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.scheduled_posts sp
      WHERE sp.id = post_publish_logs.post_id AND sp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scheduled_posts sp
      WHERE sp.id = post_publish_logs.post_id AND sp.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 4. Função e triggers: updated_at automático
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_instagram_accounts_updated_at ON public.instagram_accounts;
CREATE TRIGGER update_instagram_accounts_updated_at
  BEFORE UPDATE ON public.instagram_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_scheduled_posts_updated_at ON public.scheduled_posts;
CREATE TRIGGER update_scheduled_posts_updated_at
  BEFORE UPDATE ON public.scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
