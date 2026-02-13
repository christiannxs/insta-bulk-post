import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewPost() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Novo Post</h1>
        <p className="text-muted-foreground">Selecione vídeos do Google Drive e publique em massa</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecionar Vídeos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Conecte seu Google Drive para selecionar vídeos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
