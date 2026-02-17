import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusCircle, RefreshCw, Trash2, Instagram } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useInstagramAccounts } from "@/hooks/useInstagramAccounts";
import { getInstagramConnectRedirectUri, getInstagramConnectUrl, isInstagramLoginConfigured } from "@/lib/instagramOAuth";

export default function Accounts() {
  const { accounts, isLoading, removeAccount, isRemoving, refetch } = useInstagramAccounts();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected !== null || error !== null) {
      setSearchParams({}, { replace: true });
      if (connected === "1") {
        refetch();
        toast({ title: "Conta(s) conectada(s)", description: "Sua(s) conta(s) Instagram foi(ram) adicionada(s)." });
      } else if (error) {
        toast({ title: "Erro ao conectar", description: decodeURIComponent(error), variant: "destructive" });
      }
    }
  }, [searchParams, setSearchParams, refetch, toast]);

  const handleConnectInstagram = () => {
    if (!isInstagramLoginConfigured()) {
      toast({
        title: "App não configurado",
        description: "Adicione VITE_META_APP_ID no .env e configure Instagram API with Instagram Login no app Meta.",
        variant: "destructive",
      });
      return;
    }
    const url = getInstagramConnectUrl();
    if (url) window.location.href = url;
    else toast({ title: "Erro", description: "Não foi possível abrir as permissões do Instagram.", variant: "destructive" });
  };

  const handleReconnect = () => {
    if (!isInstagramLoginConfigured()) {
      toast({
        title: "App não configurado",
        description: "Adicione VITE_META_APP_ID no .env e configure Instagram API with Instagram Login no app Meta.",
        variant: "destructive",
      });
      return;
    }
    const url = getInstagramConnectUrl();
    if (url) window.location.href = url;
    else toast({ title: "Erro", description: "Não foi possível abrir as permissões do Instagram.", variant: "destructive" });
  };

  const handleRemove = async (id: string) => {
    try {
      await removeAccount(id);
      toast({ title: "Conta removida" });
    } catch (e: unknown) {
      toast({
        title: "Erro ao remover",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const isActive = (status: string) => status === "active";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contas Instagram</h1>
          <p className="text-muted-foreground">Gerencie suas contas conectadas</p>
        </div>
        <Button onClick={handleConnectInstagram} variant="default">
          <PlusCircle className="mr-2 h-4 w-4" />
          Conectar Instagram
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Instagram className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma conta conectada ainda.</p>
            <p className="text-sm text-muted-foreground">Conecte sua primeira conta Instagram para começar.</p>
            <p className="mt-3 max-w-md text-center text-xs text-muted-foreground">
              Se aparecer &quot;Não foi possível se conectar&quot; no Instagram, confira no app Meta (Instagram → Set up business login → OAuth redirect URIs) se esta URL está cadastrada:{" "}
              <code className="break-all rounded bg-muted px-1 py-0.5 font-mono text-[10px]">{getInstagramConnectRedirectUri()}</code>
            </p>
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
                      <AvatarImage src={account.profile_picture_url ?? undefined} alt={account.username} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                        {account.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">@{account.username}</p>
                      <p className="text-xs text-muted-foreground">Conta conectada</p>
                    </div>
                  </div>
                  <Badge variant={isActive(account.status) ? "default" : "destructive"}>
                    {isActive(account.status) ? "Ativa" : "Expirada"}
                  </Badge>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground">Instagram Business/Creator</p>
                  <div className="flex gap-2">
                    {!isActive(account.status) && (
                      <Button size="sm" variant="outline" onClick={handleReconnect}>
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Reconectar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemove(account.id)}
                      disabled={isRemoving}
                    >
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
