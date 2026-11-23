import { useState, useMemo } from "react";
import { PageHeader, EmptyState } from "@/components/layouts/PageHeader";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useClasses, useClassStudents } from "@/hooks/useClasses";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, Users, DoorOpen, BarChart3, Settings as SettingsIcon, Mail, Link2, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { computeStudentRisk, riskBadgeProps } from "@/lib/studentRisk";
import { matchStudentsToParticipants } from "@/lib/participantMatching";
import { SIMULATOR_LABELS } from "./Analytics";
import { KpiTile, scoreTone } from "@/components/rooms/RoomAnalytics";
import { cn } from "@/lib/utils";
import { Copy, Search, Lock } from "lucide-react";

export default function TurmaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { list, update, remove } = useClasses();
  const turma = list.data?.find(c => c.id === id);
  const { list: studentsQ, addMany, remove: removeStudent } = useClassStudents(id);

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

  const { data: rooms = [] } = useQuery({
    queryKey: ["class-rooms", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("virtual_rooms")
        .select("*")
        .eq("class_id", id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const roomIds = useMemo(() => (rooms as any[]).map(r => r.id), [rooms]);

  const { data: classSubmissions = [] } = useQuery({
    queryKey: ["class-submissions", id, roomIds],
    enabled: roomIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("room_submissions")
        .select("*")
        .in("room_id", roomIds)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: classParticipants = [] } = useQuery({
    queryKey: ["class-participants", id, roomIds],
    enabled: roomIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("room_participants")
        .select("*")
        .in("room_id", roomIds);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: classActivities = [] } = useQuery({
    queryKey: ["class-activities", id, roomIds],
    enabled: roomIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("room_activities")
        .select("*, simulator_cases(title)")
        .in("room_id", roomIds);
      if (error) throw error;
      return data || [];
    },
  });

  const handleImport = async () => {
    // Accept lines like "Name, email" or "Name <email>" or just "email"
    const lines = importText.split(/\n+/).map(l => l.trim()).filter(Boolean);
    const rows = lines.map(line => {
      const emailMatch = line.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
      const email = emailMatch?.[0] || "";
      let name = line.replace(email, "").replace(/[<>,;]/g, "").trim();
      if (!name) name = email.split("@")[0];
      return { full_name: name, email };
    }).filter(r => r.email);
    if (!rows.length) {
      toast.error("Nenhum email válido encontrado");
      return;
    }
    await addMany.mutateAsync(rows);
    setImportText("");
    setImportOpen(false);
  };

  if (!turma && !list.isLoading) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-muted-foreground">Turma não encontrada.</p>
        <Button variant="ghost" asChild className="mt-2"><Link to="/turmas"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link></Button>
      </div>
    );
  }
  if (!turma) return null;

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-6xl">
      <PageHeader
        backTo="/turmas"
        backLabel="Voltar para Turmas"
        title={turma.name}
        badges={turma.semester ? <Badge variant="outline">{turma.semester}</Badge> : undefined}
        description={turma.description || undefined}
        className="mb-0"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile icon={<Users />} label="Alunos" value={studentsQ.data?.length || 0} sub="cadastrados na turma" />
        <KpiTile icon={<DoorOpen />} label="Salas" value={rooms.length} sub={`${(rooms as any[]).filter((r: any) => r.is_active).length} ativas`} />
        <KpiTile icon={<BarChart3 />} label="Envios" value={(classSubmissions as any[]).length} sub="em todas as salas" />
        <KpiTile
          icon={<BarChart3 />}
          label="Nota média"
          value={(classSubmissions as any[]).length ? `${Math.round((classSubmissions as any[]).reduce((a: number, s: any) => a + (s.score || 0), 0) / (classSubmissions as any[]).length)}%` : "—"}
          valueClassName={(classSubmissions as any[]).length ? scoreTone(Math.round((classSubmissions as any[]).reduce((a: number, s: any) => a + (s.score || 0), 0) / (classSubmissions as any[]).length)).text : undefined}
          sub="média da turma"
        />
      </div>

      <Tabs defaultValue="alunos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alunos"><Users className="h-3.5 w-3.5 mr-1" /> Alunos ({studentsQ.data?.length || 0})</TabsTrigger>
          <TabsTrigger value="salas"><DoorOpen className="h-3.5 w-3.5 mr-1" /> Salas ({rooms.length})</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="h-3.5 w-3.5 mr-1" /> Analytics</TabsTrigger>
          <TabsTrigger value="config"><SettingsIcon className="h-3.5 w-3.5 mr-1" /> Configurações</TabsTrigger>
        </TabsList>

        {/* ALUNOS */}
        <TabsContent value="alunos" className="space-y-4">
          <section className="rounded-xl border border-border bg-card">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Alunos cadastrados <span className="tabular-nums">{studentsQ.data?.length || 0}</span></h3>
                <p className="mt-1 text-xs text-muted-foreground">Esta lista é reaproveitada nas salas restritas desta turma.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Buscar aluno ou e-mail…" className="h-8 w-56 pl-8 text-sm" />
                </div>
              <Dialog open={importOpen} onOpenChange={setImportOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Adicionar alunos</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Adicionar alunos</DialogTitle></DialogHeader>
                  <div>
                    <Label>Cole uma linha por aluno</Label>
                    <Textarea
                      rows={10}
                      value={importText}
                      onChange={e => setImportText(e.target.value)}
                      placeholder={"João Silva, joao@email.com\nMaria Souza <maria@email.com>\nrafael@ufrn.edu.br"}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Formatos aceitos: "Nome, email", "Nome &lt;email&gt;" ou apenas email.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setImportOpen(false)}>Cancelar</Button>
                    <Button onClick={handleImport} disabled={addMany.isPending}>Adicionar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              </div>
            </header>
            {(studentsQ.data?.length || 0) === 0 ? (
              <EmptyState className="m-4" icon={<Users />} title="Nenhum aluno cadastrado ainda" description="Use Adicionar alunos para colar a lista da turma." />
            ) : (
              <ul className="divide-y divide-border">
                {studentsQ.data!
                  .filter(s => { const q = studentSearch.trim().toLowerCase(); return !q || s.full_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q); })
                  .map(s => (
                    <li key={s.id} className="group flex items-center gap-3 px-4 py-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">
                        {s.full_name.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join("")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.full_name}</p>
                        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><Mail className="h-3 w-3" /> {s.email}</p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8 opacity-60 transition-opacity group-hover:opacity-100" aria-label={"Remover " + s.full_name} onClick={() => removeStudent.mutate(s.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </TabsContent>

        {/* SALAS */}
        <TabsContent value="salas" className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm text-muted-foreground">Salas virtuais vinculadas a esta turma.</p>
            <div className="flex gap-2">
              <LinkExistingRoomDialog classId={turma.id} linkedIds={(rooms as any[]).map((r: any) => r.id)} />
              <Button asChild size="sm">
                <Link to={`/salas-virtuais?classId=${turma.id}`}><Plus className="h-4 w-4 mr-1" /> Nova sala</Link>
              </Button>
            </div>
          </div>
          {rooms.length === 0 ? (
            <EmptyState icon={<DoorOpen />} title="Nenhuma sala criada para esta turma" description="Crie uma sala nova ou vincule uma existente." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(rooms as any[]).map((r: any) => (
                <div key={r.id} className={cn("flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40", r.is_active ? "border-status-ok/30" : "border-border")}>
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold", r.is_active ? "border-status-ok/40 text-status-ok" : "border-border text-muted-foreground")}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", r.is_active ? "bg-status-ok" : "bg-muted-foreground/60")} />
                      {r.is_active ? "Ativa" : "Encerrada"}
                    </span>
                    {r.restricted_access && <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium"><Lock className="h-3 w-3" />Restrita</span>}
                  </div>
                  <div>
                    <p className="line-clamp-2 font-semibold leading-snug">{r.title}</p>
                    {r.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(r.pin); toast.success("PIN copiado"); }}
                    aria-label={"Copiar PIN " + r.pin}
                    className="group flex items-center justify-between rounded-lg border border-border bg-background/60 px-3 py-2 transition-colors hover:border-primary/40"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">PIN</span>
                    <code className="font-mono text-xl font-bold tracking-[0.2em] text-primary">{r.pin}</code>
                    <Copy className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                  </button>
                  <div className="mt-auto flex items-center gap-2">
                    <Button size="sm" asChild className="flex-1">
                      <Link to={`/turmas/${turma.id}/salas/${r.id}`}><BarChart3 className="mr-1.5 h-4 w-4" />Abrir</Link>
                    </Button>
                    <UnlinkRoomButton roomId={r.id} classId={turma.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ANALYTICS */}
        <TabsContent value="analytics" className="space-y-4">
          <ClassAnalyticsPanel
            rooms={rooms as any[]}
            participants={classParticipants as any[]}
            submissions={classSubmissions as any[]}
            activities={classActivities as any[]}
            students={studentsQ.data || []}
          />
        </TabsContent>

        {/* CONFIG */}
        <TabsContent value="config">
          <ConfigPanel turma={turma} onSave={(patch) => update.mutate({ id: turma.id, ...patch })} onDelete={async () => {
            if (!confirm("Excluir esta turma? Salas vinculadas perdem o vínculo (não são apagadas).")) return;
            await remove.mutateAsync(turma.id);
            navigate("/turmas");
          }} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConfigPanel({ turma, onSave, onDelete }: { turma: any; onSave: (p: any) => void; onDelete: () => void }) {
  const [name, setName] = useState(turma.name);
  const [semester, setSemester] = useState(turma.semester || "");
  const [description, setDescription] = useState(turma.description || "");
  const dirty = name !== turma.name || semester !== (turma.semester || "") || description !== (turma.description || "");
  return (
    <div className="max-w-2xl space-y-6">
      <section className="rounded-xl border border-border bg-card">
        <header className="border-b border-border px-4 py-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Dados da turma</h3>
        </header>
        <div className="space-y-4 p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2"><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Semestre</Label><Input value={semester} onChange={e => setSemester(e.target.value)} placeholder="2026.1" /></div>
          </div>
          <div className="space-y-1.5"><Label>Descrição</Label><Textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} /></div>
          <div className="flex justify-end">
            <Button onClick={() => onSave({ name, semester, description })} disabled={!dirty || !name.trim()}>Salvar alterações</Button>
          </div>
        </div>
      </section>
      <section className="rounded-xl border border-status-crit/30 bg-status-crit/5">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div>
            <h3 className="text-sm font-semibold text-status-crit">Excluir turma</h3>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">As salas vinculadas perdem o vínculo com a turma, mas não são apagadas.</p>
          </div>
          <Button variant="destructive" onClick={onDelete}><Trash2 className="mr-1.5 h-4 w-4" /> Excluir turma</Button>
        </div>
      </section>
    </div>
  );
}

function ClassAnalyticsPanel({ rooms, participants, submissions, activities, students }: { rooms: any[]; participants: any[]; submissions: any[]; activities: any[]; students: any[] }) {
  const totalSubs = submissions.length;
  const avgScore = totalSubs ? Math.round(submissions.reduce((a, s) => a + (s.score || 0), 0) / totalSubs) : 0;
  const avgTime = totalSubs ? Math.round(submissions.reduce((a, s) => a + (s.time_spent_seconds || 0), 0) / totalSubs) : 0;

  const roomsById = useMemo(() => new Map(rooms.map((r: any) => [r.id, r])), [rooms]);
  const activitiesById = useMemo(() => new Map(activities.map((a: any) => [a.id, a])), [activities]);

  const activityLabel = (activityId?: string | null) => {
    if (!activityId) return null;
    const act = activitiesById.get(activityId);
    if (!act) return null;
    const toolLabel = SIMULATOR_LABELS[act.simulator_slug] || act.simulator_slug;
    const caseTitle = act.simulator_cases?.title;
    const groupLabel = act.group_label?.trim();
    return `${groupLabel ? `${groupLabel} · ` : ""}${toolLabel}${caseTitle ? ` (${caseTitle})` : ""}`;
  };

  // Per-room aggregation
  const roomStats = rooms.map(r => {
    const subs = submissions.filter((s: any) => s.room_id === r.id);
    const ps = participants.filter((p: any) => p.room_id === r.id);
    const score = subs.length ? Math.round(subs.reduce((a, s) => a + (s.score || 0), 0) / subs.length) : 0;
    return { id: r.id, name: (r.title || "—").slice(0, 22), title: r.title, ingressos: ps.length, submissoes: subs.length, score };
  });

  // Per-student aggregation across rooms — cobre tanto ingresso solo quanto ingresso
  // como membro de um grupo (a nota do grupo conta para cada aluno que dele participou).
  const matchByEmail = useMemo(() => matchStudentsToParticipants(students, participants), [students, participants]);

  const studentRows = students.map(s => {
    const em = s.email.toLowerCase();
    const matches = matchByEmail.get(em) || [];
    const pIds = new Set(matches.map(m => m.participantId));
    const subs = submissions.filter((sub: any) => pIds.has(sub.participant_id));
    const score = subs.length ? Math.round(subs.reduce((a: number, x: any) => a + (x.score || 0), 0) / subs.length) : 0;
    const roomsAttended = new Set(matches.map(m => m.roomId)).size;
    const risk = computeStudentRisk({
      participantIds: Array.from(pIds) as string[],
      roomIds: matches.map(m => m.roomId),
      allSubmissions: submissions,
      allActivities: activities,
    });

    // Uma entrada por submissão — cada nota individual, com link para a análise granular.
    const matchByParticipantId = new Map(matches.map(m => [m.participantId, m]));
    const entries = subs
      .map((sub: any) => {
        const match = matchByParticipantId.get(sub.participant_id);
        const room = roomsById.get(sub.room_id);
        return {
          submissionId: sub.id,
          participantId: sub.participant_id,
          roomId: sub.room_id,
          roomTitle: room?.title || "Sala",
          classId: room?.class_id,
          isGroup: match?.isGroup || false,
          groupLabel: match?.groupLabel || null,
          activity: activityLabel(sub.activity_id),
          score: sub.score || 0,
          submittedAt: sub.submitted_at,
        };
      })
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    return { name: s.full_name, email: s.email, score, submissoes: subs.length, salas: roomsAttended, risk, entries };
  }).sort((a, b) => b.score - a.score);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (email: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email); else next.add(email);
      return next;
    });
  };

  return (
    <div className="space-y-4">


      <Card>
        <CardHeader><CardTitle className="text-base">Desempenho por sala</CardTitle></CardHeader>
        <CardContent>
          {roomStats.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma sala vinculada.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, roomStats.length * 36)}>
              <BarChart data={roomStats} layout="vertical" margin={{ left: 4, right: 44 }} barCategoryGap={10}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tickCount={5} />
                <YAxis type="category" dataKey="name" width={210} tickFormatter={(v: string) => (v.length > 30 ? v.slice(0, 29).trimEnd() + "…" : v)} />
                <Tooltip formatter={(v: number) => [v > 0 ? v : "sem envios", "Nota média"]} labelFormatter={(l: string) => l} />
                <Bar dataKey="score" name="Nota média" fill="hsl(var(--chart-1))" background={{ fill: "hsl(var(--muted) / 0.35)", radius: 6 }}>
                  <LabelList dataKey="score" position="right" formatter={(v: number) => (v > 0 ? v : "—")} style={{ fill: "hsl(var(--foreground))", fontSize: 11, fontVariantNumeric: "tabular-nums" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Desempenho por aluno (consolidado)</CardTitle></CardHeader>
        <CardContent>
          {studentRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Sem alunos cadastrados na turma ainda.</p>
          ) : (
            <div className="border rounded-md divide-y divide-border">
              <div className="grid grid-cols-12 gap-2 p-2 text-[11px] uppercase tracking-wide text-muted-foreground bg-muted/30">
                <div className="col-span-4">Aluno</div>
                <div className="col-span-2 text-center">Salas</div>
                <div className="col-span-2 text-center">Submissões</div>
                <div className="col-span-2 text-right">Nota média</div>
                <div className="col-span-2 text-right">Risco</div>
              </div>
              {studentRows.map((r, i) => {
                const badge = riskBadgeProps(r.risk.tier);
                const isOpen = expanded.has(r.email);
                return (
                  <div key={i}>
                    <button
                      type="button"
                      onClick={() => r.entries.length > 0 && toggleExpanded(r.email)}
                      className={`w-full grid grid-cols-12 gap-2 p-2 text-sm items-center text-left ${r.entries.length > 0 ? "hover:bg-muted/30 cursor-pointer" : "cursor-default"}`}
                    >
                      <div className="col-span-4 min-w-0 flex items-center gap-1.5">
                        {r.entries.length > 0 ? (
                          isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <span className="w-3.5 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{r.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                        </div>
                      </div>
                      <div className="col-span-2 text-center">{r.salas}</div>
                      <div className="col-span-2 text-center">{r.submissoes}</div>
                      <div className="col-span-2 text-right">
                        {r.submissoes > 0
                          ? <span className={cn("rounded-full border px-2 py-0.5 font-mono text-xs font-semibold tabular-nums", scoreTone(r.score).soft)}>{r.score}%</span>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                      <div className="col-span-2 text-right">
                        {badge ? (
                          <Badge className={badge.className} title={r.risk.flags.join(" · ")}>{badge.label}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </button>
                    {isOpen && r.entries.length > 0 && (
                      <div className="bg-muted/10 border-t border-border px-2 pb-2 pt-1 pl-8 space-y-1">
                        {r.entries.map((entry, j) => (
                          <div key={j} className="flex items-center justify-between gap-2 text-xs py-1 flex-wrap">
                            <div className="min-w-0 flex-1">
                              <p className="truncate">
                                <span className="font-medium">{entry.roomTitle}</span>
                                {entry.activity && <span className="text-muted-foreground"> — {entry.activity}</span>}
                              </p>
                              <p className="text-muted-foreground truncate">
                                {entry.isGroup ? `Grupo: ${entry.groupLabel}` : "Ingresso individual"}
                                {" · "}
                                {new Date(entry.submittedAt).toLocaleDateString("pt-BR")}
                              </p>
                            </div>
                            <Link
                              to={`/turmas/${entry.classId}/salas/${entry.roomId}?focus=${entry.participantId}`}
                              className="flex-shrink-0"
                            >
                              <Badge
                                variant={entry.score >= 70 ? "default" : "secondary"}
                                className="cursor-pointer hover:opacity-80 flex items-center gap-1"
                              >
                                {entry.score} <ExternalLink className="h-2.5 w-2.5" />
                              </Badge>
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: any }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function UnlinkRoomButton({ roomId, classId }: { roomId: string; classId: string }) {
  const qc = useQueryClient();
  const unlink = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("virtual_rooms").update({ class_id: null }).eq("id", roomId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["class-rooms", classId] });
      toast.success("Sala desvinculada");
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Button
      size="sm" variant="ghost" title="Desvincular sala"
      onClick={() => { if (confirm("Desvincular esta sala da turma? A sala não será apagada.")) unlink.mutate(); }}
    >
      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
    </Button>
  );
}

function LinkExistingRoomDialog({ classId, linkedIds }: { classId: string; linkedIds: string[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: availableRooms = [] } = useQuery({
    queryKey: ["link-available-rooms", user?.id, open],
    enabled: !!user && open,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("virtual_rooms")
        .select("id, title, pin, is_active, class_id, created_at")
        .eq("created_by", user!.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).filter((r: any) => !linkedIds.includes(r.id));
    },
  });

  const link = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selected);
      if (!ids.length) return;
      const { error } = await (supabase as any).from("virtual_rooms").update({ class_id: classId }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["class-rooms", classId] });
      qc.invalidateQueries({ queryKey: ["classes-rooms-count"] });
      toast.success(`${selected.size} sala(s) vinculada(s)`);
      setSelected(new Set());
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Link2 className="h-4 w-4 mr-1" /> Vincular sala existente</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Vincular salas existentes a esta turma</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {availableRooms.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhuma sala disponível para vincular. Todas as suas salas já estão nesta turma ou foram excluídas.
            </p>
          ) : (
            availableRooms.map((r: any) => (
              <label
                key={r.id}
                className="flex items-center gap-3 p-3 rounded-md border border-border hover:border-primary/50 cursor-pointer"
              >
                <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{r.title}</p>
                    <Badge variant={r.is_active ? "default" : "secondary"} className="text-[10px]">
                      {r.is_active ? "Ativa" : "Encerrada"}
                    </Badge>
                    {r.class_id && (
                      <Badge variant="outline" className="text-[10px]">Já em outra turma</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">PIN: <span className="font-mono">{r.pin}</span></p>
                </div>
              </label>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => link.mutate()} disabled={!selected.size || link.isPending}>
            Vincular {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
