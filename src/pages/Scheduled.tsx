import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Film, Trash2, Play, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface ScheduledPost {
  id: string;
  videoName: string;
  caption: string;
  scheduledAt: Date;
  status: "pending" | "published" | "error";
  accounts: string[];
  errorMessage?: string;
}

const initialPosts: ScheduledPost[] = [
  { id: "1", videoName: "promo_verao.mp4", caption: "Promoção de verão! 🔥", scheduledAt: new Date(2026, 1, 17, 14, 0), status: "pending", accounts: ["loja_moda", "fitness_guru"] },
  { id: "2", videoName: "skincare_noite.mp4", caption: "Rotina de skincare 🌙", scheduledAt: new Date(2026, 1, 20, 20, 0), status: "pending", accounts: ["loja_moda", "receitas_fit"] },
  { id: "3", videoName: "treino_perna.mp4", caption: "Leg day! 🦵", scheduledAt: new Date(2026, 1, 22, 8, 0), status: "pending", accounts: ["fitness_guru"] },
  { id: "4", videoName: "treino_abs.mp4", caption: "Treino de abdominais 💪", scheduledAt: new Date(2026, 1, 16, 10, 0), status: "published", accounts: ["fitness_guru"] },
  { id: "5", videoName: "look_dia.mp4", caption: "Look do dia ✨", scheduledAt: new Date(2026, 1, 15, 9, 0), status: "published", accounts: ["loja_moda"] },
  { id: "6", videoName: "receita_acai.mp4", caption: "Receita de açaí fitness 🍇", scheduledAt: new Date(2026, 1, 15, 18, 30), status: "error", accounts: ["receitas_fit"], errorMessage: "Token expirado para @receitas_fit" },
];

const statusConfig: Record<string, { label: string; icon: typeof Clock; variant: "default" | "secondary" | "destructive" }> = {
  pending: { label: "Pendente", icon: Clock, variant: "secondary" },
  published: { label: "Publicado", icon: CheckCircle, variant: "default" },
  error: { label: "Erro", icon: AlertTriangle, variant: "destructive" },
};

export default function Scheduled() {
  const [posts, setPosts] = useState<ScheduledPost[]>(initialPosts);
  const { toast } = useToast();

  const pending = posts.filter((p) => p.status === "pending");
  const published = posts.filter((p) => p.status === "published");
  const errors = posts.filter((p) => p.status === "error");

  const handleDelete = (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "Post removido da fila" });
  };

  const handlePublishNow = (id: string) => {
    toast({ title: "Em breve", description: "A publicação imediata será implementada com a Meta API." });
  };

  const renderPostList = (list: ScheduledPost[]) => {
    if (list.length === 0) {
      return <p className="py-8 text-center text-sm text-muted-foreground">Nenhum post nesta categoria.</p>;
    }

    return (
      <div className="space-y-3">
        {list.map((post) => {
          const config = statusConfig[post.status];
          return (
            <div key={post.id} className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Film className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{post.videoName}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{post.caption}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{format(post.scheduledAt, "dd MMM, HH:mm", { locale: ptBR })}</span>
                    <span>•</span>
                    <span>{post.accounts.map((a) => `@${a}`).join(", ")}</span>
                  </div>
                  {post.errorMessage && (
                    <p className="mt-1 text-xs text-destructive">{post.errorMessage}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={config.variant}>{config.label}</Badge>
                {post.status === "pending" && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => handlePublishNow(post.id)}>
                      <Play className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(post.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
                {post.status === "error" && (
                  <Button size="sm" variant="outline" onClick={() => handlePublishNow(post.id)}>
                    Tentar novamente
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Posts Agendados</h1>
        <p className="text-muted-foreground">Gerencie sua fila de publicações</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Clock className="h-5 w-5 text-warning" />
            <div>
              <p className="text-2xl font-bold">{pending.length}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle className="h-5 w-5 text-success" />
            <div>
              <p className="text-2xl font-bold">{published.length}</p>
              <p className="text-xs text-muted-foreground">Publicados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-2xl font-bold">{errors.length}</p>
              <p className="text-xs text-muted-foreground">Com erro</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="pending">
            <TabsList className="mb-4">
              <TabsTrigger value="pending">Pendentes ({pending.length})</TabsTrigger>
              <TabsTrigger value="published">Publicados ({published.length})</TabsTrigger>
              <TabsTrigger value="errors">Erros ({errors.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="pending">{renderPostList(pending)}</TabsContent>
            <TabsContent value="published">{renderPostList(published)}</TabsContent>
            <TabsContent value="errors">{renderPostList(errors)}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
