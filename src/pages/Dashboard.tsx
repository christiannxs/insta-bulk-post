import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, CheckCircle, AlertTriangle } from "lucide-react";

const stats = [
  { label: "Contas Conectadas", value: "0", icon: Users, color: "text-primary" },
  { label: "Posts Agendados", value: "0", icon: Clock, color: "text-warning" },
  { label: "Publicados", value: "0", icon: CheckCircle, color: "text-success" },
  { label: "Com Erro", value: "0", icon: AlertTriangle, color: "text-destructive" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu sistema de postagem</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
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
          <p className="text-sm text-muted-foreground">
            Nenhum post ainda. Comece criando um novo post!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
