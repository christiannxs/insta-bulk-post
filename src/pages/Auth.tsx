import { useState } from "react";
import { supabase, isSupabaseConfigured, testSupabaseConnection } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const { toast } = useToast();

  const handleTestConnection = async () => {
    if (!isSupabaseConfigured()) {
      toast({
        title: "Supabase não configurado",
        description: "Configure o .env primeiro (veja .env.example).",
        variant: "destructive",
      });
      return;
    }
    setTestingConnection(true);
    try {
      const result = await testSupabaseConnection();
      if (result.ok) {
        toast({ title: "Conexão OK", description: "O servidor Supabase está acessível." });
      } else if (result.reason === "invalid_key") {
        toast({
          title: "Chave inválida",
          description: "Use a chave 'anon public' no .env (Project Settings > API).",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Servidor inacessível",
          description: "Verifique a URL no .env, se o projeto está ativo e sua rede.",
          variant: "destructive",
        });
      }
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      toast({
        title: "Supabase não configurado",
        description: "Crie um arquivo .env na raiz com VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY (veja .env.example) e reinicie o servidor.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({ title: "Conta criada!", description: "Verifique seu email para confirmar." });
      }
    } catch (error: any) {
      const msg = error?.message ?? String(error);
      const isNetworkError =
        msg === "Failed to fetch" ||
        msg.toLowerCase().includes("failed to fetch") ||
        error?.name === "TypeError";
      let description = msg;
      if (isNetworkError) {
        const result = await testSupabaseConnection();
        if (result.ok) {
          description =
            "O servidor respondeu, mas algo falhou na autenticação. Confirme no .env que está usando a chave 'anon public' (Project Settings > API), não a service_role.";
        } else if (result.reason === "invalid_key") {
          description =
            "A URL do Supabase está correta, mas a chave foi rejeitada. No Dashboard: Project Settings > API, copie a chave 'anon public' (não a service_role) para VITE_SUPABASE_PUBLISHABLE_KEY no .env.";
        } else {
          description =
            "Não foi possível alcançar o servidor Supabase. Verifique: 1) No .env, VITE_SUPABASE_URL deve ser exatamente a 'Project URL' do Dashboard (Project Settings > API); 2) O projeto está ativo (não pausado) no Dashboard; 3) Internet e firewall (nada bloqueando *.supabase.co).";
        }
      }
      toast({ title: "Erro", description, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center h-[193px] pb-2">
          <div className="mx-auto flex h-36 w-36 min-h-[128px] min-w-[128px] items-center justify-center rounded-xl overflow-hidden shrink-0">
            <img src="/logo.png" alt="Perfis de Volume" className="h-full w-full object-contain" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {!isSupabaseConfigured() && (
            <div className="mb-4 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
              Supabase não configurado. Crie um arquivo <code className="rounded bg-muted px-1">.env</code> na raiz do projeto com{" "}
              <code className="rounded bg-muted px-1">VITE_SUPABASE_URL</code> e{" "}
              <code className="rounded bg-muted px-1">VITE_SUPABASE_PUBLISHABLE_KEY</code> (veja .env.example).
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <Button type="submit" className="w-full" disabled={loading || !isSupabaseConfigured()}>
              {loading ? "Carregando..." : isLogin ? "Entrar" : "Criar Conta"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              disabled={loading || testingConnection || !isSupabaseConfigured()}
              onClick={handleTestConnection}
            >
              {testingConnection ? "Testando..." : "Testar conexão com Supabase"}
            </Button>
          </form>
          <button
            type="button"
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Não tem conta? Criar" : "Já tem conta? Entrar"}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
