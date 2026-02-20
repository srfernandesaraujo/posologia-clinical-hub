import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, DoorOpen, Users, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

const SIMULATOR_LABELS: Record<string, string> = {
  prm: "PRM",
  antimicrobianos: "Antimicrobianos",
  tdm: "TDM",
  acompanhamento: "Acompanhamento",
  insulina: "Insulina",
};

export default function Analytics() {
  const { data: logs = [] } = useQuery({
    queryKey: ["analytics-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usage_logs")
        .select("*, tools(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["analytics-rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("virtual_rooms")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allParticipants = [] } = useQuery({
    queryKey: ["analytics-participants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_participants")
        .select("*")
        .order("joined_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allSubmissions = [] } = useQuery({
    queryKey: ["analytics-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_submissions")
        .select("*")
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const totalStudents = allParticipants.length;
  const totalSubmissions = allSubmissions.length;
  const avgScore = totalSubmissions > 0
    ? Math.round(allSubmissions.reduce((a: number, s: any) => a + s.score, 0) / totalSubmissions)
    : 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <BarChart3 className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold">Analytics</h1>
      </div>

      <Tabs defaultValue="rooms" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rooms"><DoorOpen className="h-4 w-4 mr-1" />Salas Virtuais</TabsTrigger>
          <TabsTrigger value="usage"><BarChart3 className="h-4 w-4 mr-1" />Uso de Ferramentas</TabsTrigger>
        </TabsList>

        <TabsContent value="rooms" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-primary">{rooms.length}</p>
                <p className="text-sm text-muted-foreground">Salas Criadas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-primary">{totalStudents}</p>
                <p className="text-sm text-muted-foreground">Participantes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-primary">{totalSubmissions}</p>
                <p className="text-sm text-muted-foreground">Submissões</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-primary">{avgScore}%</p>
                <p className="text-sm text-muted-foreground">Score Médio</p>
              </CardContent>
            </Card>
          </div>

          {/* Per-Room Detail */}
          {rooms.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma sala virtual criada ainda.</CardContent></Card>
          ) : (
            <div className="space-y-4">
              {rooms.map((room: any) => {
                const rParticipants = allParticipants.filter((p: any) => p.room_id === room.id);
                const rSubmissions = allSubmissions.filter((s: any) => s.room_id === room.id);
                const rAvg = rSubmissions.length > 0 ? Math.round(rSubmissions.reduce((a: number, s: any) => a + s.score, 0) / rSubmissions.length) : null;

                return (
                  <Card key={room.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{room.title}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{SIMULATOR_LABELS[room.simulator_slug] || room.simulator_slug}</Badge>
                          <Badge variant={room.is_active ? "default" : "secondary"}>{room.is_active ? "Ativa" : "Inativa"}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">PIN: {room.pin} · {rParticipants.length} participantes · {rSubmissions.length} submissões{rAvg !== null ? ` · Média: ${rAvg}%` : ""}</p>
                    </CardHeader>
                    {rParticipants.length > 0 && (
                      <CardContent>
                        <div className="space-y-2">
                          {rParticipants.map((p: any) => {
                            const pSubs = rSubmissions.filter((s: any) => s.participant_id === p.id);
                            const pAvg = pSubs.length > 0 ? Math.round(pSubs.reduce((a: number, s: any) => a + s.score, 0) / pSubs.length) : null;
                            const pTime = pSubs.reduce((a: number, s: any) => a + (s.time_spent_seconds || 0), 0);

                            return (
                              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                                <div>
                                  <p className="text-sm font-medium">{p.participant_name}</p>
                                  {p.is_group && (
                                    <p className="text-xs text-muted-foreground">Grupo: {(p.group_members as any[] || []).join(", ")}</p>
                                  )}
                                  <p className="text-xs text-muted-foreground">{new Date(p.joined_at).toLocaleString("pt-BR")}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  {pSubs.length > 0 && <span className="text-xs text-muted-foreground">{Math.floor(pTime / 60)}m{pTime % 60}s</span>}
                                  {pAvg !== null ? (
                                    <Badge variant={pAvg >= 80 ? "secondary" : pAvg >= 50 ? "default" : "destructive"} className={pAvg >= 80 ? "bg-green-100 text-green-800" : ""}>
                                      {pAvg}%
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline">Pendente</Badge>
                                  )}
                                  {pSubs.length > 0 && (
                                    <div className="text-xs text-muted-foreground">
                                      {pSubs.map((s: any) => (
                                        <span key={s.id} className="mr-1">E{s.step_index + 1}:{s.score}%</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="usage">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4">Últimos acessos ({logs.length})</h2>
            {logs.length === 0 ? (
              <p className="text-muted-foreground">Nenhum registro de uso ainda.</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                    <span className="font-medium">{log.tools?.name || "Ferramenta removida"}</span>
                    <span className="text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
