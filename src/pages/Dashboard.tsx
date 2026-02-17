import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, CheckCircle, AlertTriangle, Film } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useInstagramAccounts } from "@/hooks/useInstagramAccounts";
import { useScheduledPosts } from "@/hooks/useScheduledPosts";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  publishing: { label: "Publicando", variant: "secondary" },
  published: { label: "Publicado", variant: "default" },
  failed: { label: "Erro", variant: "destructive" },
  cancelled: { label: "Cancelado", variant: "secondary" },
};

export default function Dashboard() {
  const { accounts, isLoading: accountsLoading } = useInstagramAccounts();
  const { posts, isLoading: postsLoading } = useScheduledPosts();

  const isLoading = accountsLoading || postsLoading;
  const expiredAccounts = accounts.filter((a) => a.status === "expired");
  const scheduledCount = posts.filter((p) => p.status === "pending" || p.status === "publishing").length;
  const publishedCount = posts.filter((p) => p.status === "published").length;
  const errorCount = posts.filter((p) => p.status === "failed" || p.status === "cancelled").length;

  const stats = [
    { label: "Contas Conectadas", value: accounts.length.toString(), icon: Users, color: "text-primary" },
    { label: "Agendados", value: scheduledCount.toString(), icon: Clock, color: "text-warning" },
    { label: "Publicados", value: publishedCount.toString(), icon: CheckCircle, color: "text-success" },
    { label: "Com Erro", value: errorCount.toString(), icon: AlertTriangle, color: "text-destructive" },
  ];

  const recentPosts = [...posts].sort((a, b) => {
    const dateA = a.scheduled_at ?? a.created_at;
    const dateB = b.scheduled_at ?? b.created_at;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  }).slice(0, 10);

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
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu sistema de postagem</p>
      </div>

      {expiredAccounts.length > 0 && (
        <Card className="border-warning/50 bg-warning/10">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <p className="text-sm">
              <span className="font-semibold">Token expirado:</span>{" "}
              {expiredAccounts.map((a) => `@${a.username}`).join(", ")} — reconecte para continuar publicando.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Posts Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentPosts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum post ainda.</p>
            ) : (
              recentPosts.map((post) => (
                <div key={post.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Film className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{post.video_name ?? post.video_url}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{post.caption ?? "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden text-right sm:block">
                      <p className="text-xs text-muted-foreground">
                        {post.scheduled_at
                          ? format(new Date(post.scheduled_at), "dd MMM, HH:mm", { locale: ptBR })
                          : "—"}
                      </p>
                    </div>
                    <Badge variant={statusConfig[post.status]?.variant ?? "outline"}>
                      {post.status === "pending" && post.scheduled_at ? "Agendado" : (statusConfig[post.status]?.label ?? post.status)}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
