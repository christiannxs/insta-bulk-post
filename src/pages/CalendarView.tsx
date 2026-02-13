import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CalendarView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Calendário</h1>
        <p className="text-muted-foreground">Visualize seus posts agendados e publicados</p>
      </div>

      <Card>
        <CardContent className="flex items-center justify-center py-24">
          <p className="text-muted-foreground">Calendário visual em breve.</p>
        </CardContent>
      </Card>
    </div>
  );
}
