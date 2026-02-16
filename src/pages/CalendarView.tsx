import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Film } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useScheduledPosts } from "@/hooks/useScheduledPosts";

const statusColors: Record<string, string> = {
  pending: "bg-warning",
  scheduled: "bg-warning",
  published: "bg-success",
  error: "bg-destructive",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  scheduled: "Agendado",
  published: "Publicado",
  error: "Erro",
};

export default function CalendarView() {
  const { posts, isLoading } = useScheduledPosts();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { locale: ptBR });
  const calEnd = endOfWeek(monthEnd, { locale: ptBR });

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getPostsForDay = (d: Date) =>
    posts.filter((p) => {
      const postDate = p.scheduled_at ? new Date(p.scheduled_at) : new Date(p.created_at);
      return isSameDay(postDate, d);
    });

  const selectedDayPosts = selectedDate ? getPostsForDay(selectedDate) : [];

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
        <h1 className="text-2xl font-bold">Calendário</h1>
        <p className="text-muted-foreground">Visualize seus posts agendados e publicados</p>
      </div>

      <div className="flex gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-warning" /> Agendado</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-success" /> Publicado</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-destructive" /> Erro</span>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-base capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-px">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">
                {d}
              </div>
            ))}
            {days.map((d, i) => {
              const dayPosts = getPostsForDay(d);
              const inMonth = isSameMonth(d, currentMonth);
              const today = isToday(d);
              const selected = selectedDate && isSameDay(d, selectedDate);

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  className={`relative flex min-h-[72px] flex-col items-start rounded-md border p-1.5 text-left transition-colors ${
                    !inMonth ? "border-transparent text-muted-foreground/40" : "border-border hover:bg-muted/50"
                  } ${today ? "ring-1 ring-primary" : ""} ${selected ? "bg-primary/10 border-primary" : ""}`}
                >
                  <span className={`text-xs font-medium ${today ? "text-primary" : ""}`}>
                    {format(d, "d")}
                  </span>
                  {dayPosts.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-0.5">
                      {dayPosts.slice(0, 3).map((p) => (
                        <span key={p.id} className={`h-1.5 w-1.5 rounded-full ${statusColors[p.status] ?? "bg-muted"}`} />
                      ))}
                      {dayPosts.length > 3 && (
                        <span className="text-[9px] text-muted-foreground">+{dayPosts.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {format(selectedDate, "dd 'de' MMMM, EEEE", { locale: ptBR })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDayPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum post neste dia.</p>
            ) : (
              <div className="space-y-3">
                {selectedDayPosts.map((post) => (
                  <div key={post.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                        <Film className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{post.video_name ?? post.video_url}</p>
                        <p className="text-xs text-muted-foreground">
                          {post.scheduled_at ? format(new Date(post.scheduled_at), "HH:mm") : "—"}
                        </p>
                      </div>
                    </div>
                    <Badge variant={post.status === "published" ? "default" : post.status === "error" ? "destructive" : "secondary"}>
                      {post.status === "pending" && post.scheduled_at ? "Agendado" : (statusLabels[post.status] ?? post.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
