import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, BarChart3, Settings as SettingsIcon, Info, Copy, CheckCircle2, XCircle, Mail, UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useClassStudents } from "@/hooks/useClasses";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export default function SalaDetalhe() {
  const { classId, roomId } = useParams<{ classId: string; roomId: string }>();

  const { data: room } = useQuery({
    queryKey: ["room", roomId],
    enabled: !!roomId,
    queryFn: async () => {
      const { data, error } = await supabase.from("virtual_rooms").select("*").eq("id", roomId!).single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["room-participants", roomId],
    enabled: !!roomId,
    queryFn: async () => {
      const { data, error } = await supabase.from("room_participants").select("*").eq("room_id", roomId!).order("joined_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ["room-submissions", roomId],
    enabled: !!roomId,
    queryFn: async () => {
      const { data, error } = await supabase.from("room_submissions").select("*").eq("room_id", roomId!).order("submitted_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { list: studentsQ } = useClassStudents(classId);

  const stats = useMemo(() => {
    const subs = submissions as any[];
    const count = subs.length;
    const avgScore = count ? Math.round(subs.reduce((a, s) => a + (s.score || 0), 0) / count) : 0;
    const avgTime = count ? Math.round(subs.reduce((a, s) => a + (s.time_spent_seconds || 0), 0) / count) : 0;
    return { count, avgScore, avgTime, participants: participants.length };
  }, [submissions, participants]);

  const copyPin = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.pin);
    toast.success("PIN copiado");
  };

  if (!room) {
    return <div className="container mx-auto py-8"><p className="text-muted-foreground">Carregando…</p></div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-6xl">
      <div className="space-y-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to={classId ? `/turmas/${classId}` : "/salas-virtuais"}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Link>
        </Button>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{room.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={room.is_active ? "default" : "secondary"}>{room.is_active ? "Ativa" : "Encerrada"}</Badge>
              <button onClick={copyPin} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                PIN: <span className="font-mono">{room.pin}</span> <Copy className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview"><Info className="h-3.5 w-3.5 mr-1" /> Visão geral</TabsTrigger>
          <TabsTrigger value="participants"><Users className="h-3.5 w-3.5 mr-1" /> Participantes</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="h-3.5 w-3.5 mr-1" /> Analytics</TabsTrigger>
          <TabsTrigger value="config"><SettingsIcon className="h-3.5 w-3.5 mr-1" /> Configurações</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4">
          {room.description && (
            <Card><CardContent className="py-4 text-sm text-muted-foreground">{room.description}</CardContent></Card>
          )}
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <StatCard label="Cadastrados" value={studentsQ.data?.length || 0} />
            <StatCard label="Ingressos" value={stats.participants} />
            <StatCard label="Submissões" value={stats.count} />
            <StatCard label="Nota média" value={`${stats.avgScore}`} />
          </div>
        </TabsContent>

        {/* PARTICIPANTS */}
        <TabsContent value="participants">
          <ParticipantsList students={studentsQ.data || []} participants={participants} restricted={!!room.restricted_access} />
        </TabsContent>

        {/* ANALYTICS */}
        <TabsContent value="analytics" className="space-y-4">
          <RoomAnalyticsPanel participants={participants} submissions={submissions} />
          <p className="text-xs text-muted-foreground text-center">
            Para análise detalhada por decisão e mini-relatórios, abra o{" "}
            <Link to="/analytics" className="underline">Analytics consolidado</Link>.
          </p>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardContent className="py-6 space-y-2">
              <p className="text-sm text-muted-foreground">
                A edição completa da sala (atividades, alunos, prazo) é feita na página{" "}
                <Link to="/salas-virtuais" className="underline">Salas Virtuais</Link>.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: any }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function ParticipantsList({ students, participants, restricted }: { students: any[]; participants: any[]; restricted: boolean }) {
  // Merge: registered students (from class) + ingressos. Show one row each, marked.
  const ingressByEmail = new Map<string, any>();
  const submittedIds = new Set<string>();
  participants.forEach(p => {
    if (p.participant_email) ingressByEmail.set(p.participant_email.toLowerCase(), p);
  });

  const rows: { name: string; email: string | null; registered: boolean; joined: boolean; isGroup?: boolean }[] = [];
  if (restricted) {
    students.forEach(s => {
      const email = s.email.toLowerCase();
      const p = ingressByEmail.get(email);
      rows.push({ name: s.full_name, email: s.email, registered: true, joined: !!p });
    });
    // Ingressos sem cadastro (e.g. grupos ou outros)
    participants.forEach(p => {
      const em = (p.participant_email || "").toLowerCase();
      if (!em || !students.find(s => s.email.toLowerCase() === em)) {
        rows.push({ name: p.participant_name, email: p.participant_email, registered: false, joined: true, isGroup: p.is_group });
      }
    });
  } else {
    participants.forEach(p => rows.push({ name: p.participant_name, email: p.participant_email, registered: false, joined: true, isGroup: p.is_group }));
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Participantes</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhum participante ainda.</p>
        ) : (
          <div className="border rounded-md divide-y divide-border">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{r.name}</p>
                  {r.email && <p className="text-xs text-muted-foreground flex items-center gap-1 truncate"><Mail className="h-3 w-3" /> {r.email}</p>}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {r.registered && (
                    <Badge variant="outline" className="text-[10px]">
                      <UserPlus className="h-3 w-3 mr-1" /> Cadastrado
                    </Badge>
                  )}
                  {r.joined && (
                    <Badge className="text-[10px]">
                      <UserCheck className="h-3 w-3 mr-1" /> {r.isGroup ? "Grupo ingressou" : "Ingressou"}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RoomAnalyticsPanel({ participants, submissions }: { participants: any[]; submissions: any[] }) {
  // Group submissions by participant
  const byParticipant = new Map<string, any[]>();
  submissions.forEach(s => {
    const arr = byParticipant.get(s.participant_id) || [];
    arr.push(s);
    byParticipant.set(s.participant_id, arr);
  });

  const chartData = participants.map(p => {
    const subs = byParticipant.get(p.id) || [];
    const score = subs.length ? Math.round(subs.reduce((a, s) => a + (s.score || 0), 0) / subs.length) : 0;
    return { name: (p.participant_name || "—").slice(0, 18), score };
  }).filter(d => d.score > 0).sort((a, b) => b.score - a.score).slice(0, 20);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Desempenho por participante</CardTitle></CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Sem submissões com pontuação ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 28)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={120} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
