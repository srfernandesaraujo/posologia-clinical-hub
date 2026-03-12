import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, DoorOpen, Lock, Crown, ClipboardList, ChevronDown, ChevronUp, FileText, CheckCircle2, XCircle, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

const SIMULATOR_LABELS: Record<string, string> = {
  prm: "PRM",
  antimicrobianos: "Antimicrobianos",
  tdm: "TDM",
  acompanhamento: "Acompanhamento",
  insulina: "Insulina",
  "bomba-infusao": "Bomba de Infusão",
  "desmame-benzo": "Desmame Benzo",
  interacoes: "Interações",
  goniometria: "Goniometria",
  "avaliacao-postural": "Avaliação Postural",
  berg: "Escala de Berg",
  dermatomos: "Dermátomos",
  eletroterapia: "Eletroterapia",
  "forca-muscular": "Força Muscular",
  respiratorio: "Fisio. Respiratória",
  "testes-ortopedicos": "Testes Ortopédicos",
  "avaliacao-nutricional": "Aval. Nutricional",
  disfagia: "Disfagia",
  "necessidades-energeticas": "Nec. Energéticas",
  "nutricao-materno-infantil": "Nutrição M.I.",
  "nutricao-renal": "Nutrição Renal",
  tne: "TNE",
  tnp: "TNP",
  "triagem-nutricional": "Triagem Nutricional",
  "anatomia-endodontia": "Endodontia",
  "anestesiologia-odonto": "Anestesiologia",
  cefalometria: "Cefalometria",
  "cirurgia-exodontia": "Cirurgia/Exodontia",
  "farmacologia-odonto": "Farmacologia Odonto",
  odontograma: "Odontograma",
  periodontograma: "Periodontograma",
  "radiografia-odonto": "Radiografia",
  soap: "SOAP",
  mai: "MAI",
  "cascata-prescricao": "Cascata",
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

/** Expandable participant detail showing decisions + report */
function ParticipantDetail({ submission }: { submission: any }) {
  const [open, setOpen] = useState(false);
  const actions = submission.actions;

  // Support both old format (array of decisions) and new format ({ decisions, report })
  const decisions: any[] = Array.isArray(actions)
    ? actions
    : actions?.decisions || [];
  const report = !Array.isArray(actions) ? actions?.report : null;
  const hasDetails = decisions.length > 0 || report;

  if (!hasDetails) return null;

  return (
    <div className="mt-2">
      <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 px-2" onClick={() => setOpen(!open)}>
        <Eye className="h-3 w-3" />
        {open ? "Ocultar detalhes" : "Ver detalhes"}
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </Button>
      {open && (
        <div className="mt-2 space-y-3 animate-in fade-in-0 slide-in-from-top-2">
          {/* Decisions breakdown */}
          {decisions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Decisões Clínicas</p>
              {decisions.map((d: any, i: number) => (
                <div key={i} className={`rounded-md p-2 text-xs border ${d.correct ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"}`}>
                  <div className="flex items-start gap-1.5">
                    {d.correct
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                      : <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{d.label}</span>
                      <span className="text-muted-foreground ml-1">— {d.userChoice}</span>
                      {!d.correct && <span className="ml-1 text-green-600 dark:text-green-400">(ideal: {d.idealChoice})</span>}
                    </div>
                  </div>
                </div>
              ))}
              {/* Mini radar for decision accuracy per category */}
              {decisions.length >= 3 && (
                <div className="mt-2">
                  <ResponsiveContainer width="100%" height={180}>
                    <RadarChart data={decisions.map((d: any) => ({
                      label: d.label?.length > 15 ? d.label.substring(0, 15) + "…" : d.label,
                      acerto: d.correct ? 100 : 0,
                    }))}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="label" tick={{ fontSize: 9 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} />
                      <Radar dataKey="acerto" fill="hsl(var(--primary))" fillOpacity={0.3} stroke="hsl(var(--primary))" strokeWidth={1.5} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Report section */}
          {report && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <FileText className="h-3 w-3" /> Mini-Relatório do Aluno
              </p>
              <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2 text-xs">
                {report.hypothesis && (
                  <div>
                    <span className="font-semibold text-foreground">Hipótese:</span>
                    <p className="text-muted-foreground mt-0.5 leading-relaxed">{report.hypothesis}</p>
                  </div>
                )}
                {report.results && (
                  <div>
                    <span className="font-semibold text-foreground">Resultados:</span>
                    <p className="text-muted-foreground mt-0.5 leading-relaxed">{report.results}</p>
                  </div>
                )}
                {report.conclusion && (
                  <div>
                    <span className="font-semibold text-foreground">Conclusão:</span>
                    <p className="text-muted-foreground mt-0.5 leading-relaxed">{report.conclusion}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Analytics() {
  const { user } = useAuth();
  const { isPremium, upgradeOpen, setUpgradeOpen, upgradeFeature, showUpgrade, loading } = useFeatureGating();
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());

  const toggleRoom = (id: string) => {
    setExpandedRooms(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

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

  const { data: allActivities = [] } = useQuery({
    queryKey: ["analytics-activities", roomIds],
    enabled: roomIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_activities")
        .select("*, simulator_cases(title)")
        .in("room_id", roomIds)
        .order("position");
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
  const scoreBySimulator = Object.entries(
    allSubmissions.reduce((acc: any, s: any) => {
      const activity = allActivities.find((a: any) => a.id === s.activity_id);
      const room = rooms.find((r: any) => r.id === s.room_id);
      const slug = activity?.simulator_slug || room?.simulator_slug || "outro";
      if (!acc[slug]) acc[slug] = { total: 0, count: 0 };
      acc[slug].total += s.score;
      acc[slug].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>)
  ).map(([slug, v]: any) => ({
    name: SIMULATOR_LABELS[slug] || slug,
    media: Math.round(v.total / v.count),
  }));

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

  const toolUsage: Record<string, number> = {};
  logs.forEach((l: any) => {
    const name = l.tools?.name || "Removida";
    toolUsage[name] = (toolUsage[name] || 0) + 1;
  });
  const toolChartData = Object.entries(toolUsage)
    .map(([name, count]) => ({ name, usos: count }))
    .sort((a, b) => b.usos - a.usos);

  const usageByDay: Record<string, number> = {};
  logs.forEach((l: any) => {
    const day = new Date(l.created_at).toLocaleDateString("pt-BR");
    usageByDay[day] = (usageByDay[day] || 0) + 1;
  });
  const usageTimeData = Object.entries(usageByDay)
    .map(([date, count]) => ({ date, usos: count }))
    .reverse();

  const simDistribution = Object.entries(
    (() => {
      const acc: Record<string, number> = {};
      allActivities.forEach((a: any) => {
        const label = SIMULATOR_LABELS[a.simulator_slug] || a.simulator_slug;
        acc[label] = (acc[label] || 0) + 1;
      });
      const roomsWithActivities = new Set(allActivities.map((a: any) => a.room_id));
      rooms.forEach((r: any) => {
        if (!roomsWithActivities.has(r.id) && r.simulator_slug) {
          const label = SIMULATOR_LABELS[r.simulator_slug] || r.simulator_slug;
          acc[label] = (acc[label] || 0) + 1;
        }
      });
      return acc;
    })()
  ).map(([name, value]) => ({ name, value }));

  const handleUpgrade = () => showUpgrade("Analytics completo é exclusivo do plano Premium");

  const getRoomActivities = (roomId: string) => allActivities.filter((a: any) => a.room_id === roomId);

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

          <div className="relative">
            {!isPremium && <PremiumOverlay onUpgrade={handleUpgrade} />}
            <div className={!isPremium ? "pointer-events-none select-none filter blur-sm" : ""}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-base">Média por Simulador</CardTitle></CardHeader>
                  <CardContent>
                    {scoreBySimulator.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={scoreBySimulator}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="media" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Média (%)" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>}
                  </CardContent>
                </Card>

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
                    const roomActs = getRoomActivities(room.id);
                    const isExam = roomActs.length > 0;
                    const isExpanded = expandedRooms.has(room.id);

                    // Per-room score distribution for mini bar chart
                    const scoreDistribution = rSubmissions.length > 0 ? [
                      { range: "0-39%", count: rSubmissions.filter((s: any) => s.score < 40).length },
                      { range: "40-59%", count: rSubmissions.filter((s: any) => s.score >= 40 && s.score < 60).length },
                      { range: "60-79%", count: rSubmissions.filter((s: any) => s.score >= 60 && s.score < 80).length },
                      { range: "80-100%", count: rSubmissions.filter((s: any) => s.score >= 80).length },
                    ] : [];

                    return (
                      <Card key={room.id} className="overflow-hidden">
                        <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleRoom(room.id)}>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              {room.title}
                              {isExam && (
                                <Badge variant="outline" className="text-xs">
                                  <ClipboardList className="h-3 w-3 mr-1" />Prova · {roomActs.length} atividades
                                </Badge>
                              )}
                              {!isExam && room.simulator_slug && (
                                <Badge variant="outline">{SIMULATOR_LABELS[room.simulator_slug] || room.simulator_slug}</Badge>
                              )}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge variant={room.is_active ? "default" : "secondary"}>{room.is_active ? "Ativa" : "Inativa"}</Badge>
                              {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            PIN: {room.pin} · {rParticipants.length} participantes · {rSubmissions.length} submissões{rAvg !== null ? ` · Média: ${rAvg}%` : ""}
                          </p>
                        </CardHeader>

                        {isExpanded && (
                          <CardContent className="space-y-4 animate-in fade-in-0 slide-in-from-top-2">
                            {/* Activities list for exam rooms */}
                            {isExam && (
                              <div className="flex flex-wrap gap-2">
                                {roomActs.map((act: any, i: number) => {
                                  const actSubs = rSubmissions.filter((s: any) => s.activity_id === act.id);
                                  const actAvg = actSubs.length > 0 ? Math.round(actSubs.reduce((a: number, s: any) => a + s.score, 0) / actSubs.length) : null;
                                  return (
                                    <div key={act.id} className="text-xs border border-border rounded-lg px-3 py-2 bg-muted/30">
                                      <span className="font-medium">{i + 1}. {SIMULATOR_LABELS[act.simulator_slug] || act.simulator_slug}</span>
                                      {act.simulator_cases?.title && (
                                        <span className="text-muted-foreground ml-1">({act.simulator_cases.title})</span>
                                      )}
                                      {actAvg !== null && (
                                        <Badge variant={actAvg >= 80 ? "secondary" : actAvg >= 50 ? "default" : "destructive"} className={`ml-2 text-xs ${actAvg >= 80 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : ""}`}>
                                          {actAvg}%
                                        </Badge>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Score distribution mini chart */}
                            {scoreDistribution.length > 0 && rSubmissions.length >= 2 && (
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Distribuição de Scores</p>
                                  <ResponsiveContainer width="100%" height={140}>
                                    <BarChart data={scoreDistribution}>
                                      <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                                      <Tooltip />
                                      <Bar dataKey="count" name="Alunos" radius={[4, 4, 0, 0]}>
                                        {scoreDistribution.map((_, i) => (
                                          <Cell key={i} fill={[
                                            "hsl(var(--destructive))",
                                            "hsl(var(--chart-4))",
                                            "hsl(var(--chart-2))",
                                            "hsl(var(--chart-3))",
                                          ][i]} />
                                        ))}
                                      </Bar>
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                                {/* Score summary stats */}
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="rounded-lg border border-border p-3 text-center">
                                    <p className="text-lg font-bold text-primary">{rAvg ?? 0}%</p>
                                    <p className="text-[10px] text-muted-foreground">Média</p>
                                  </div>
                                  <div className="rounded-lg border border-border p-3 text-center">
                                    <p className="text-lg font-bold text-primary">
                                      {rSubmissions.length > 0 ? Math.max(...rSubmissions.map((s: any) => s.score)) : 0}%
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">Maior</p>
                                  </div>
                                  <div className="rounded-lg border border-border p-3 text-center">
                                    <p className="text-lg font-bold text-primary">
                                      {rSubmissions.length > 0 ? Math.min(...rSubmissions.map((s: any) => s.score)) : 0}%
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">Menor</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Participants */}
                            {rParticipants.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Participantes</p>
                                {rParticipants.map((p: any) => {
                                  const pSubs = rSubmissions.filter((s: any) => s.participant_id === p.id);
                                  const pAvg = pSubs.length > 0 ? Math.round(pSubs.reduce((a: number, s: any) => a + s.score, 0) / pSubs.length) : null;
                                  const pTime = pSubs.reduce((a: number, s: any) => a + (s.time_spent_seconds || 0), 0);
                                  return (
                                    <div key={p.id} className="rounded-lg border border-border p-3">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="text-sm font-medium">{p.participant_name}</p>
                                          {p.is_group && <p className="text-xs text-muted-foreground">Grupo: {(p.group_members as any[] || []).join(", ")}</p>}
                                          <p className="text-xs text-muted-foreground">{new Date(p.joined_at).toLocaleString("pt-BR")}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          {pSubs.length > 0 && pTime > 0 && <span className="text-xs text-muted-foreground">{Math.floor(pTime / 60)}m{pTime % 60}s</span>}
                                          {pAvg !== null ? (
                                            <Badge variant={pAvg >= 80 ? "secondary" : pAvg >= 50 ? "default" : "destructive"} className={pAvg >= 80 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : ""}>
                                              {pAvg}%
                                            </Badge>
                                          ) : (
                                            <Badge variant="outline">Pendente</Badge>
                                          )}
                                        </div>
                                      </div>
                                      {/* Per-activity breakdown for exam rooms */}
                                      {isExam && pSubs.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                          {roomActs.map((act: any, i: number) => {
                                            const actSub = pSubs.find((s: any) => s.activity_id === act.id);
                                            return (
                                              <span key={act.id} className={`text-xs px-2 py-0.5 rounded-full ${actSub ? (actSub.score >= 80 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : actSub.score >= 50 ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400") : "bg-muted text-muted-foreground"}`}>
                                                {(SIMULATOR_LABELS[act.simulator_slug] || act.simulator_slug).substring(0, 5)}{i + 1}: {actSub ? `${actSub.score}%` : "—"}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      )}
                                      {/* Detailed submission view */}
                                      {pSubs.map((sub: any) => (
                                        <ParticipantDetail key={sub.id} submission={sub} />
                                      ))}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
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
