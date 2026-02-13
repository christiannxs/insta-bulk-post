import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function Accounts() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contas Instagram</h1>
          <p className="text-muted-foreground">Gerencie suas contas conectadas</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Conectar Conta
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Nenhuma conta conectada ainda.</p>
          <p className="text-sm text-muted-foreground">Conecte sua primeira conta Instagram para começar.</p>
        </CardContent>
      </Card>
    </div>
  );
}
