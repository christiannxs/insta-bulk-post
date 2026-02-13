import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Scheduled() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Posts Agendados</h1>
        <p className="text-muted-foreground">Gerencie sua fila de publicações</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Nenhum post agendado.</p>
        </CardContent>
      </Card>
    </div>
  );
}
