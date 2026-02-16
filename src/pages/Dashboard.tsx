import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, CheckCircle, AlertTriangle, Film, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const mockAccounts = [
  { id: "1", username: "loja_moda", status: "active" },
  { id: "2", username: "fitness_guru", status: "active" },
  { id: "3", username: "receitas_fit", status: "expired" },
];

const mockRecentPosts = [
  {
    id: "1",
    videoName: "promo_verao.mp4",
    caption: "Promoção de verão! 🔥",
    scheduledAt: new Date(2026, 1, 17, 14, 0),
    status: "scheduled",
    accounts: ["loja_moda", "fitness_guru"],
  },
  {
    id: "2",
    videoName: "treino_abs.mp4",
    caption: "Treino de abdominais em 5 min 💪",
    scheduledAt: new Date(2026, 1, 16, 10, 0),
    status: "published",
    accounts: ["fitness_guru"],
  },
  {
    id: "3",
    videoName: "receita_acai.mp4",
    caption: "Receita de açaí fitness 🍇",
    scheduledAt: new Date(2026, 1, 15, 18, 30),
    status: "error",
    accounts: ["receitas_fit"],
  },
  {
    id: "4",
    videoName: "look_dia.mp4",
    caption: "Look do dia ✨",
    scheduledAt: new Date(2026, 1, 15, 9, 0),
    status: "published",
    accounts: ["loja_moda"],
  },
];

const stats = [
  { label: "Contas Conectadas", value: mockAccounts.length.toString(), icon: Users, color: "text-primary" },
  { label: "Agendados", value: mockRecentPosts.filter((p) => p.status === "scheduled").length.toString(), icon: Clock, color: "text-warning" },
  { label: "Publicados", value: mockRecentPosts.filter((p) => p.status === "published").length.toString(), icon: CheckCircle, color: "text-success" },
  { label: "Com Erro", value: mockRecentPosts.filter((p) => p.status === "error").length.toString(), icon: AlertTriangle, color: "text-destructive" },
];

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  scheduled: { label: "Agendado", variant: "secondary" },
  published: { label: "Publicado", variant: "default" },
  error: { label: "Erro", variant: "destructive" },
};

export default function Dashboard() {
  const expiredAccounts = mockAccounts.filter((a) => a.status === "expired");

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
            {mockRecentPosts.map((post) => (
              <div key={post.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Film className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{post.videoName}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{post.caption}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden text-right sm:block">
                    <p className="text-xs text-muted-foreground">
                      {format(post.scheduledAt, "dd MMM, HH:mm", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {post.accounts.map((a) => `@${a}`).join(", ")}
                    </p>
                  </div>
                  <Badge variant={statusConfig[post.status]?.variant ?? "outline"}>
                    {statusConfig[post.status]?.label ?? post.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
