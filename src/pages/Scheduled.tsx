import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Film, Trash2, Play, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useScheduledPosts } from "@/hooks/useScheduledPosts";

const statusConfig: Record<string, { label: string; icon: typeof Clock; variant: "default" | "secondary" | "destructive" }> = {
  pending: { label: "Pendente", icon: Clock, variant: "secondary" },
  scheduled: { label: "Agendado", icon: Clock, variant: "secondary" },
  published: { label: "Publicado", icon: CheckCircle, variant: "default" },
  error: { label: "Erro", icon: AlertTriangle, variant: "destructive" },
};

export default function Scheduled() {
  const { posts, isLoading, removePost, isRemoving } = useScheduledPosts();
  const { toast } = useToast();

  const pending = posts.filter((p) => p.status === "pending" || p.status === "scheduled");
  const published = posts.filter((p) => p.status === "published");
  const errors = posts.filter((p) => p.status === "error");

  const handleDelete = async (id: string) => {
    try {
      await removePost(id);
      toast({ title: "Post removido da fila" });
    } catch (e: unknown) {
      toast({
        title: "Erro ao remover",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handlePublishNow = (id: string) => {
    toast({ title: "Em breve", description: "A publicação imediata será implementada com a Meta API." });
  };

  const renderPostList = (list: typeof posts) => {
    if (list.length === 0) {
      return <p className="py-8 text-center text-sm text-muted-foreground">Nenhum post nesta categoria.</p>;
    }

    return (
      <div className="space-y-3">
        {list.map((post) => {
          const config = statusConfig[post.status] ?? statusConfig.pending;
          const scheduledAt = post.scheduled_at ? new Date(post.scheduled_at) : null;
          return (
            <div key={post.id} className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Film className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{post.video_name ?? post.video_url}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{post.caption ?? "—"}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{scheduledAt ? format(scheduledAt, "dd MMM, HH:mm", { locale: ptBR }) : "—"}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={config.variant}>{config.label}</Badge>
                {(post.status === "pending" || post.status === "scheduled") && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => handlePublishNow(post.id)}>
                      <Play className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(post.id)}
                      disabled={isRemoving}
                    >
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

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
