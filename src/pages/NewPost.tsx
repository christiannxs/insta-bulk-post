import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Send, Clock, Film, FolderOpen, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useInstagramAccounts } from "@/hooks/useInstagramAccounts";
import { useScheduledPosts } from "@/hooks/useScheduledPosts";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import {
  isGoogleDriveConfigured,
  getGoogleConnectUrl,
  parseDriveLink,
  buildDriveDownloadUrl,
} from "@/lib/googleDrive";

export type DriveVideo = { id: string; name: string; mimeType?: string; size?: string; downloadUrl: string };

export default function NewPost() {
  const { user } = useAuth();
  const { accounts, isLoading: accountsLoading } = useInstagramAccounts();
  const { addPostWithLogs, isAdding, refetch } = useScheduledPosts();
  const [caption, setCaption] = useState("");
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [scheduleDate, setScheduleDate] = useState("");
  const [driveLink, setDriveLink] = useState("");
  const [driveVideos, setDriveVideos] = useState<DriveVideo[]>([]);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const hasInitializedAccounts = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    if (accounts.length > 0 && !hasInitializedAccounts.current) {
      hasInitializedAccounts.current = true;
      setSelectedAccounts(accounts.map((a) => a.id));
    }
    if (accounts.length === 0) hasInitializedAccounts.current = false;
  }, [accounts]);

  const toggleAccount = (id: string) => {
    setSelectedAccounts((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const toggleVideo = (id: string) => {
    setSelectedVideoIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const selectAllVideos = () => {
    setSelectedVideoIds(driveVideos.map((v) => v.id));
  };
  const clearVideos = () => setSelectedVideoIds([]);

  const handleLoadDriveVideos = async () => {
    const parsed = parseDriveLink(driveLink);
    if (!parsed) {
      toast({
        title: "Link inválido",
        description: "Cole o link de uma pasta ou de um vídeo do Google Drive.",
        variant: "destructive",
      });
      return;
    }
    if (!isGoogleDriveConfigured()) {
      toast({
        title: "Google não configurado",
        description: "Adicione VITE_GOOGLE_CLIENT_ID no .env e configure o app no Google Cloud Console.",
        variant: "destructive",
      });
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast({ title: "Faça login", variant: "destructive" });
      return;
    }
    setIsLoadingDrive(true);
    try {
      const body = parsed.type === "folder" ? { folder_id: parsed.id } : { file_id: parsed.id };
      const { data, error } = await supabase.functions.invoke("drive-list", {
        body,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const err = (data as { error?: string } | null)?.error;
      if (error) {
        // Em 4xx/5xx o body vem em error.context (Response); data fica null
        let msg = err ?? error.message ?? "Erro ao chamar o Drive.";
        if (error instanceof FunctionsHttpError && error.context) {
          try {
            const body = await (error.context as Response).json() as { error?: string };
            if (typeof body?.error === "string") msg = body.error;
          } catch {
            // body já consumido ou não é JSON
          }
        }
        throw new Error(msg);
      }
      if (err) throw new Error(err);
      const files = (data as { files?: Array<{ id: string; name: string; mimeType?: string; size?: string }>; download_base?: string }).files ?? [];
      const base = (data as { download_base?: string }).download_base ?? "https://drive.google.com/uc?export=download&id=";
      const videos: DriveVideo[] = files.map((f) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        size: f.size,
        downloadUrl: base + f.id,
      }));
      setDriveVideos(videos);
      setSelectedVideoIds(videos.map((v) => v.id));
      if (videos.length === 0) {
        toast({ title: "Nenhum vídeo", description: "A pasta ou o arquivo não contém vídeos." });
      } else {
        toast({ title: "Vídeos carregados", description: `${videos.length} vídeo(s) encontrado(s).` });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar";
      const isNetworkOrInvoke =
        msg.includes("Failed to send a request to the Edge Function") ||
        msg.includes("Edge Function returned a non-2xx");
      const description = isNetworkOrInvoke
        ? "Confira: 1) Conecte o Google (botão «Conectar Google») antes de carregar; 2) Edge Function drive-list publicada (npx supabase functions deploy drive-list); 3) .env com VITE_SUPABASE_URL correta."
        : msg;
      toast({
        title: "Erro no Drive",
        description,
        variant: "destructive",
      });
      if (msg.includes("Conecte sua conta Google") || msg.includes("Conecte o Google")) {
        const url = getGoogleConnectUrl();
        if (url) window.location.href = url;
      }
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleConnectGoogle = () => {
    if (!isGoogleDriveConfigured()) {
      toast({
        title: "Google não configurado",
        description: "Adicione VITE_GOOGLE_CLIENT_ID no .env.",
        variant: "destructive",
      });
      return;
    }
    const url = getGoogleConnectUrl();
    if (url) window.location.href = url;
    else toast({ title: "Erro", description: "Não foi possível abrir o Google.", variant: "destructive" });
  };

  const getEffectiveVideoList = (): { url: string; name: string }[] => {
    if (driveVideos.length > 0 && selectedVideoIds.length > 0) {
      return driveVideos
        .filter((v) => selectedVideoIds.includes(v.id))
        .map((v) => ({ url: v.downloadUrl, name: v.name }));
    }
    const url = videoUrl.trim();
    if (url) return [{ url, name: "Vídeo" }];
    return [];
  };

  const handlePublish = async () => {
    const list = getEffectiveVideoList();
    if (list.length === 0) {
      toast({
        title: "Nenhum vídeo",
        description: "Carregue vídeos do Drive ou informe a URL do vídeo.",
        variant: "destructive",
      });
      return;
    }
    if (selectedAccounts.length === 0) {
      toast({ title: "Selecione ao menos uma conta", variant: "destructive" });
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast({ title: "Faça login novamente", variant: "destructive" });
      return;
    }
    setIsPublishing(true);
    let ok = 0;
    let fail = 0;
    for (const { url, name } of list) {
      for (const accountId of selectedAccounts) {
        try {
          const { data, error } = await supabase.functions.invoke("publish-reel", {
            body: { account_id: accountId, video_url: url, caption: caption || null },
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (error) throw new Error(error.message);
          const err = (data as { error?: string })?.error;
          if (err) throw new Error(err);
          ok++;
        } catch (e) {
          fail++;
          toast({ title: `Falha: ${name}`, description: e instanceof Error ? e.message : "Erro", variant: "destructive" });
        }
      }
    }
    setIsPublishing(false);
    if (ok > 0) {
      toast({
        title: "Publicado",
        description: fail > 0 ? `${ok} publicação(s). ${fail} falha(s).` : `${ok} publicação(s) concluída(s).`,
      });
      setDriveVideos([]);
      setSelectedVideoIds([]);
      setVideoUrl("");
      setCaption("");
    }
    refetch();
  };

  const handleSchedule = async () => {
    if (!user?.id) return;
    const list = getEffectiveVideoList();
    if (list.length === 0) {
      toast({
        title: "Nenhum vídeo",
        description: "Carregue vídeos do Drive ou informe a URL do vídeo.",
        variant: "destructive",
      });
      return;
    }
    if (!scheduleDate) {
      toast({ title: "Selecione data e hora", variant: "destructive" });
      return;
    }
    if (selectedAccounts.length === 0) {
      toast({ title: "Selecione ao menos uma conta", variant: "destructive" });
      return;
    }
    try {
      const scheduledAt = new Date(scheduleDate).toISOString();
      for (const { url, name } of list) {
        await addPostWithLogs({
          user_id: user.id,
          video_url: url,
          video_name: name,
          caption: caption || null,
          scheduled_at: scheduledAt,
          account_ids: selectedAccounts,
        });
      }
      toast({
        title: "Agendado!",
        description: `${list.length} post(s) para ${new Date(scheduleDate).toLocaleString("pt-BR")}.`,
      });
      setDriveVideos([]);
      setSelectedVideoIds([]);
      setVideoUrl("");
      setCaption("");
      setScheduleDate("");
    } catch (e: unknown) {
      toast({
        title: "Erro ao agendar",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const effectiveList = getEffectiveVideoList();
  const canPublish = effectiveList.length > 0 && selectedAccounts.length > 0;
  const canSchedule = effectiveList.length > 0 && scheduleDate.length > 0 && selectedAccounts.length > 0;
  const isLoading = accountsLoading;

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
        <h1 className="text-2xl font-bold">Novo Post</h1>
        <p className="text-muted-foreground">
          Cole o link de uma pasta ou vídeo do Google Drive para carregar os vídeos e publicar ou agendar
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Google Drive
              </CardTitle>
              {isGoogleDriveConfigured() && (
                <Button variant="outline" size="sm" onClick={handleConnectGoogle}>
                  Conectar Google
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {!isGoogleDriveConfigured() && (
                <p className="text-sm text-muted-foreground">
                  Configure <code className="text-xs bg-muted px-1 rounded">VITE_GOOGLE_CLIENT_ID</code> no .env e no Google Cloud Console (Drive API, tela de consentimento, URI de redirecionamento).
                </p>
              )}
              <Input
                type="url"
                placeholder="https://drive.google.com/drive/folders/... ou link de um vídeo"
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
                className="font-mono text-sm"
              />
              <Button
                onClick={handleLoadDriveVideos}
                disabled={isLoadingDrive || !driveLink.trim()}
                className="w-full sm:w-auto"
              >
                {isLoadingDrive ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  "Carregar vídeos"
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Cole o link da pasta (com os vídeos) ou de um vídeo. Os vídeos precisam estar compartilhados com &quot;Qualquer pessoa com o link&quot; para a Meta conseguir publicar.
              </p>
            </CardContent>
          </Card>

          {driveVideos.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Vídeos ({driveVideos.length})</CardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAllVideos}>
                    Selecionar todos
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearVideos}>
                    Limpar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {driveVideos.map((v) => (
                    <label
                      key={v.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                        selectedVideoIds.includes(v.id) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox
                        checked={selectedVideoIds.includes(v.id)}
                        onCheckedChange={() => toggleVideo(v.id)}
                      />
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Film className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{v.name}</p>
                        {v.size && (
                          <p className="text-xs text-muted-foreground">
                            {Number(v.size) > 1024 * 1024
                              ? `${(Number(v.size) / 1024 / 1024).toFixed(1)} MB`
                              : `${(Number(v.size) / 1024).toFixed(0)} KB`}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ou use uma URL direta</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="url"
                placeholder="https://exemplo.com/video.mp4"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Se preferir, informe uma URL pública do vídeo (sem usar o Drive).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Legenda (Caption)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Escreva a legenda para o Reel..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={4}
              />
              <p className="mt-2 text-xs text-muted-foreground">{caption.length}/2200 caracteres</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Conecte contas em Contas Instagram para publicar.</p>
              ) : (
                accounts.map((account) => (
                  <label key={account.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50">
                    <Checkbox
                      checked={selectedAccounts.includes(account.id)}
                      onCheckedChange={() => toggleAccount(account.id)}
                    />
                    <span className="text-sm font-medium">@{account.username}</span>
                  </label>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agendar</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
            <Button
              onClick={handlePublish}
              disabled={!canPublish || isPublishing}
              className="w-full"
            >
              <Send className="mr-2 h-4 w-4" />
              {isPublishing ? "Publicando..." : "Publicar Agora"}
            </Button>
            <Button
              variant="outline"
              onClick={handleSchedule}
              disabled={!canSchedule || isAdding}
              className="w-full"
            >
              <Clock className="mr-2 h-4 w-4" />
              {isAdding ? "Agendando..." : "Agendar"}
            </Button>
          </div>

          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Resumo:</strong> {selectedAccounts.length} conta(s)
              {effectiveList.length > 0 ? ` · ${effectiveList.length} vídeo(s)` : " · Carregue vídeos do Drive ou use URL"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
