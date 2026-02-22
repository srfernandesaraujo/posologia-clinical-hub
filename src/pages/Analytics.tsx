import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, DoorOpen, Lock, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";

const SIMULATOR_LABELS: Record<string, string> = {
  prm: "PRM",
  antimicrobianos: "Antimicrobianos",
  tdm: "TDM",
  acompanhamento: "Acompanhamento",
  insulina: "Insulina",
};

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function PremiumOverlay({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
      <Lock className="h-10 w-10 text-muted-foreground mb-3" />
      <p className="text-muted-foreground text-center mb-4 max-w-sm px-4">
        Analytics completo é exclusivo do plano <strong>Posologia Premium</strong>.
      </p>
      <Button onClick={onUpgrade}>
        <Crown className="h-4 w-4 mr-2" />Assinar Premium
      </Button>
    </div>
  );
}

export default function Analytics() {
  const { user } = useAuth();
  const { isPremium, upgradeOpen, setUpgradeOpen, upgradeFeature, showUpgrade, loading } = useFeatureGating();

  const { data: logs = [] } = useQuery({
    queryKey: ["analytics-logs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usage_logs")
        .select("*, tools(name)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["analytics-rooms", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("virtual_rooms")
        .select("*")
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const roomIds = rooms.map((r: any) => r.id);

  const { data: allParticipants = [] } = useQuery({
    queryKey: ["analytics-participants", roomIds],
    enabled: roomIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_participants")
        .select("*")
        .in("room_id", roomIds)
        .order("joined_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allSubmissions = [] } = useQuery({
    queryKey: ["analytics-submissions", roomIds],
    enabled: roomIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_submissions")
        .select("*")
        .in("room_id", roomIds)
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

  // --- Chart data ---

  // Average score per simulator
  const scoreBySimulator = Object.entries(
    allSubmissions.reduce((acc: any, s: any) => {
      const room = rooms.find((r: any) => r.id === s.room_id);
      const slug = room?.simulator_slug || "outro";
      if (!acc[slug]) acc[slug] = { total: 0, count: 0 };
      acc[slug].total += s.score;
      acc[slug].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>)
  ).map(([slug, v]: any) => ({
    name: SIMULATOR_LABELS[slug] || slug,
    media: Math.round(v.total / v.count),
  }));

  // Ranking of students by avg score
  const studentScores: Record<string, { name: string; total: number; count: number }> = {};
  allSubmissions.forEach((s: any) => {
    const p = allParticipants.find((p: any) => p.id === s.participant_id);
    if (!p) return;
    if (!studentScores[p.id]) studentScores[p.id] = { name: p.participant_name, total: 0, count: 0 };
    studentScores[p.id].total += s.score;
    studentScores[p.id].count += 1;
  });
  const ranking = Object.values(studentScores)
    .map(v => ({ name: v.name, media: Math.round(v.total / v.count) }))
    .sort((a, b) => b.media - a.media)
    .slice(0, 10);

  // Temporal evolution (submissions per day)
  const submissionsByDay: Record<string, { date: string; score: number; count: number }> = {};
  allSubmissions.forEach((s: any) => {
    const day = new Date(s.submitted_at).toLocaleDateString("pt-BR");
    if (!submissionsByDay[day]) submissionsByDay[day] = { date: day, score: 0, count: 0 };
    submissionsByDay[day].score += s.score;
    submissionsByDay[day].count += 1;
  });
  const temporalData = Object.values(submissionsByDay)
    .map(v => ({ date: v.date, media: Math.round(v.score / v.count) }))
    .reverse();

  // Accuracy by step
  const stepScores: Record<number, { total: number; count: number }> = {};
  allSubmissions.forEach((s: any) => {
    const step = s.step_index;
    if (!stepScores[step]) stepScores[step] = { total: 0, count: 0 };
    stepScores[step].total += s.score;
    stepScores[step].count += 1;
  });
  const stepData = Object.entries(stepScores)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([step, v]) => ({ name: `Etapa ${Number(step) + 1}`, acerto: Math.round(v.total / v.count) }));

  // Tool usage chart data
  const toolUsage: Record<string, number> = {};
  logs.forEach((l: any) => {
    const name = l.tools?.name || "Removida";
    toolUsage[name] = (toolUsage[name] || 0) + 1;
  });
  const toolChartData = Object.entries(toolUsage)
    .map(([name, count]) => ({ name, usos: count }))
    .sort((a, b) => b.usos - a.usos);

  // Usage over time
  const usageByDay: Record<string, number> = {};
  logs.forEach((l: any) => {
    const day = new Date(l.created_at).toLocaleDateString("pt-BR");
    usageByDay[day] = (usageByDay[day] || 0) + 1;
  });
  const usageTimeData = Object.entries(usageByDay)
    .map(([date, count]) => ({ date, usos: count }))
    .reverse();

  // Pie data for simulators distribution
  const simDistribution = Object.entries(
    rooms.reduce((acc: Record<string, number>, r: any) => {
      const label = SIMULATOR_LABELS[r.simulator_slug] || r.simulator_slug;
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const handleUpgrade = () => showUpgrade("Analytics completo é exclusivo do plano Premium");

  return (
    <div className="max-w-7xl mx-auto">
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={upgradeFeature} />

      <div className="flex items-center gap-3 mb-8">
        <BarChart3 className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold">Analytics</h1>
        {!isPremium && !loading && (
          <Badge variant="outline" className="ml-2 text-muted-foreground">
            <Lock className="h-3 w-3 mr-1" />Premium
          </Badge>
        )}
      </div>

      <Tabs defaultValue="rooms" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rooms"><DoorOpen className="h-4 w-4 mr-1" />Salas Virtuais</TabsTrigger>
          <TabsTrigger value="usage"><BarChart3 className="h-4 w-4 mr-1" />Uso de Ferramentas</TabsTrigger>
        </TabsList>

        {/* ===== SALAS VIRTUAIS TAB ===== */}
        <TabsContent value="rooms" className="space-y-6">
          {/* Summary Cards - always visible */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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

          {/* Charts section - gated */}
          <div className="relative">
            {!isPremium && <PremiumOverlay onUpgrade={handleUpgrade} />}
            <div className={!isPremium ? "pointer-events-none select-none filter blur-sm" : ""}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Média por Simulador */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Média por Simulador</CardTitle></CardHeader>
                  <CardContent>
                    {scoreBySimulator.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={scoreBySimulator}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="media" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Média (%)" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>}
                  </CardContent>
                </Card>

                {/* Ranking */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Ranking de Alunos (Top 10)</CardTitle></CardHeader>
                  <CardContent>
                    {ranking.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={ranking} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                          <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="media" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} name="Média (%)" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>}
                  </CardContent>
                </Card>

                {/* Evolução Temporal */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Evolução Temporal da Média</CardTitle></CardHeader>
                  <CardContent>
                    {temporalData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={temporalData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="media" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="Média (%)" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>}
                  </CardContent>
                </Card>

                {/* Taxa de Acerto por Etapa */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Taxa de Acerto por Etapa</CardTitle></CardHeader>
                  <CardContent>
                    {stepData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={stepData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="acerto" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} name="Acerto (%)" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>}
                  </CardContent>
                </Card>

                {/* Distribuição de Simuladores */}
                <Card className="lg:col-span-2">
                  <CardHeader><CardTitle className="text-base">Distribuição de Salas por Simulador</CardTitle></CardHeader>
                  <CardContent>
                    {simDistribution.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie data={simDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                            {simDistribution.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>}
                  </CardContent>
                </Card>
              </div>

              {/* Per-Room Detail */}
              <div className="mt-6 space-y-4">
                <h3 className="font-semibold text-lg">Detalhes por Sala</h3>
                {rooms.length === 0 ? (
                  <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma sala virtual criada ainda.</CardContent></Card>
                ) : (
                  rooms.map((room: any) => {
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
                                      {p.is_group && <p className="text-xs text-muted-foreground">Grupo: {(p.group_members as any[] || []).join(", ")}</p>}
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
                                          {pSubs.map((s: any) => <span key={s.id} className="mr-1">E{s.step_index + 1}:{s.score}%</span>)}
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
                  })
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ===== USO DE FERRAMENTAS TAB ===== */}
        <TabsContent value="usage" className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-primary">{logs.length}</p>
                <p className="text-sm text-muted-foreground">Total de Usos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-primary">{Object.keys(toolUsage).length}</p>
                <p className="text-sm text-muted-foreground">Ferramentas Utilizadas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-primary">{Object.keys(usageByDay).length}</p>
                <p className="text-sm text-muted-foreground">Dias Ativos</p>
              </CardContent>
            </Card>
          </div>

          <div className="relative">
            {!isPremium && <PremiumOverlay onUpgrade={handleUpgrade} />}
            <div className={!isPremium ? "pointer-events-none select-none filter blur-sm" : ""}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ferramentas mais usadas */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Ferramentas Mais Usadas</CardTitle></CardHeader>
                  <CardContent>
                    {toolChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={toolChartData.slice(0, 10)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis type="number" tick={{ fontSize: 12 }} />
                          <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="usos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Usos" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>}
                  </CardContent>
                </Card>

                {/* Uso ao longo do tempo */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Uso ao Longo do Tempo</CardTitle></CardHeader>
                  <CardContent>
                    {usageTimeData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={usageTimeData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="usos" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 4 }} name="Usos" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>}
                  </CardContent>
                </Card>

                {/* Distribuição por ferramenta (pie) */}
                <Card className="lg:col-span-2">
                  <CardHeader><CardTitle className="text-base">Distribuição de Uso por Ferramenta</CardTitle></CardHeader>
                  <CardContent>
                    {toolChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie data={toolChartData.slice(0, 8)} dataKey="usos" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                            {toolChartData.slice(0, 8).map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>}
                  </CardContent>
                </Card>
              </div>

              {/* Log list */}
              <div className="mt-6">
                <Card>
                  <CardHeader><CardTitle className="text-base">Últimos Acessos ({logs.length})</CardTitle></CardHeader>
                  <CardContent>
                    {logs.length === 0 ? (
                      <p className="text-muted-foreground">Nenhum registro de uso ainda.</p>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {logs.map((log: any) => (
                          <div key={log.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                            <span className="font-medium">{log.tools?.name || "Ferramenta removida"}</span>
                            <span className="text-muted-foreground">{new Date(log.created_at).toLocaleString("pt-BR")}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
