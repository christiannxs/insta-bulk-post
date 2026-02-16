import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, Film, Send, Clock, X, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useInstagramAccounts } from "@/hooks/useInstagramAccounts";
import { useScheduledPosts } from "@/hooks/useScheduledPosts";

const mockVideos = [
  { id: "v1", name: "promo_verao.mp4", size: "12.4 MB", duration: "0:30" },
  { id: "v2", name: "treino_abs.mp4", size: "18.7 MB", duration: "0:45" },
  { id: "v3", name: "receita_acai.mp4", size: "22.1 MB", duration: "1:00" },
  { id: "v4", name: "look_dia.mp4", size: "9.8 MB", duration: "0:20" },
  { id: "v5", name: "dica_skincare.mp4", size: "15.3 MB", duration: "0:35" },
];

export default function NewPost() {
  const { user } = useAuth();
  const { accounts, isLoading: accountsLoading } = useInstagramAccounts();
  const { addPost, isAdding } = useScheduledPosts();
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [scheduleDate, setScheduleDate] = useState("");
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (accounts.length > 0 && selectedAccounts.length === 0) {
      setSelectedAccounts(accounts.map((a) => a.id));
    }
  }, [accounts]);

  const toggleVideo = (id: string) => {
    setSelectedVideos((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const toggleAccount = (id: string) => {
    setSelectedAccounts((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const handlePublish = () => {
    toast({ title: "Em breve", description: "A publicação será implementada com a integração da Meta API." });
  };

  const handleSchedule = async () => {
    if (!user?.id) return;
    if (!scheduleDate) {
      toast({ title: "Selecione uma data", variant: "destructive" });
      return;
    }
    if (selectedVideos.length === 0) {
      toast({ title: "Selecione ao menos um vídeo", variant: "destructive" });
      return;
    }
    const videoName = mockVideos.find((v) => v.id === selectedVideos[0])?.name ?? "Vídeo";
    const videoUrl = "https://placeholder.local/" + (selectedVideos[0] ?? "pending");
    try {
      await addPost({
        user_id: user.id,
        video_url: videoUrl,
        video_name: videoName,
        caption: caption || null,
        scheduled_at: new Date(scheduleDate).toISOString(),
        status: "scheduled",
      });
      toast({ title: "Agendado!", description: `Post agendado para ${new Date(scheduleDate).toLocaleString("pt-BR")}.` });
      setCaption("");
      setScheduleDate("");
      setSelectedVideos([]);
    } catch (e: unknown) {
      toast({
        title: "Erro ao agendar",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const canSubmit = selectedVideos.length > 0 && selectedAccounts.length > 0;
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
        <p className="text-muted-foreground">Selecione vídeos do Google Drive e publique em massa</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Vídeos Selecionados</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowDrivePicker(!showDrivePicker)}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Abrir Google Drive
              </Button>
            </CardHeader>
            <CardContent>
              {showDrivePicker ? (
                <div className="space-y-2">
                  {mockVideos.map((video) => {
                    const isSelected = selectedVideos.includes(video.id);
                    return (
                      <div
                        key={video.id}
                        onClick={() => toggleVideo(video.id)}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                          isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <Film className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{video.name}</p>
                          <p className="text-xs text-muted-foreground">{video.size} • {video.duration}</p>
                        </div>
                        {isSelected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                      </div>
                    );
                  })}
                </div>
              ) : selectedVideos.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedVideos.map((id) => {
                    const video = mockVideos.find((v) => v.id === id);
                    return (
                      <Badge key={id} variant="secondary" className="gap-1 py-1.5 pl-3 pr-2">
                        <Film className="h-3 w-3" />
                        {video?.name}
                        <button type="button" onClick={() => toggleVideo(id)} className="ml-1 rounded-full hover:bg-muted">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Clique em "Abrir Google Drive" para selecionar vídeos.
                </p>
              )}
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
              disabled={!canSubmit}
              className="w-full"
            >
              <Send className="mr-2 h-4 w-4" />
              Publicar Agora
            </Button>
            <Button
              variant="outline"
              onClick={handleSchedule}
              disabled={!canSubmit || isAdding}
              className="w-full"
            >
              <Clock className="mr-2 h-4 w-4" />
              {isAdding ? "Agendando..." : "Agendar"}
            </Button>
          </div>

          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Resumo:</strong> {selectedVideos.length} vídeo(s) → {selectedAccounts.length} conta(s)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
