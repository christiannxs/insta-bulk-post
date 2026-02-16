import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PlusCircle, RefreshCw, Trash2, Instagram } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Account {
  id: string;
  username: string;
  status: "active" | "expired";
  followersCount: string;
  postsPublished: number;
}

const initialAccounts: Account[] = [
  { id: "1", username: "loja_moda", status: "active", followersCount: "12.4K", postsPublished: 34 },
  { id: "2", username: "fitness_guru", status: "active", followersCount: "8.1K", postsPublished: 22 },
  { id: "3", username: "receitas_fit", status: "expired", followersCount: "5.6K", postsPublished: 15 },
];

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const { toast } = useToast();

  const handleConnect = () => {
    toast({ title: "Em breve", description: "A conexão via Meta API será configurada em breve." });
  };

  const handleReconnect = (username: string) => {
    toast({ title: "Reconectar", description: `Reconectando @${username}...` });
  };

  const handleRemove = (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    toast({ title: "Conta removida" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contas Instagram</h1>
          <p className="text-muted-foreground">Gerencie suas contas conectadas</p>
        </div>
        <Button onClick={handleConnect}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Conectar Conta
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Instagram className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma conta conectada ainda.</p>
            <p className="text-sm text-muted-foreground">Conecte sua primeira conta Instagram para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                        {account.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">@{account.username}</p>
                      <p className="text-xs text-muted-foreground">{account.followersCount} seguidores</p>
                    </div>
                  </div>
                  <Badge variant={account.status === "active" ? "default" : "destructive"}>
                    {account.status === "active" ? "Ativa" : "Expirada"}
                  </Badge>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground">{account.postsPublished} posts publicados</p>
                  <div className="flex gap-2">
                    {account.status === "expired" && (
                      <Button size="sm" variant="outline" onClick={() => handleReconnect(account.username)}>
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Reconectar
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleRemove(account.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
