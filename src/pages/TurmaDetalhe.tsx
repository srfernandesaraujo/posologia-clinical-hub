import { useState, useMemo } from "react";
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
import { ArrowLeft, Plus, Trash2, Users, DoorOpen, BarChart3, Settings as SettingsIcon, Mail, Link2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { computeStudentRisk, riskBadgeProps } from "@/lib/studentRisk";

export default function TurmaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { list, update, remove } = useClasses();
  const turma = list.data?.find(c => c.id === id);
  const { list: studentsQ, addMany, remove: removeStudent } = useClassStudents(id);

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");

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
        .select("*")
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
      <div className="space-y-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/turmas"><ArrowLeft className="h-4 w-4 mr-1" /> Turmas</Link>
        </Button>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{turma.name}</h1>
            {turma.semester && <Badge variant="outline" className="mt-1">{turma.semester}</Badge>}
            {turma.description && <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{turma.description}</p>}
          </div>
        </div>
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
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Alunos cadastrados</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Esta lista é reaproveitada nas salas restritas desta turma.</p>
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
            </CardHeader>
            <CardContent>
              {(studentsQ.data?.length || 0) === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Nenhum aluno cadastrado ainda.</p>
              ) : (
                <div className="border rounded-md divide-y divide-border">
                  {studentsQ.data!.map(s => (
                    <div key={s.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{s.full_name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3" /> {s.email}
                        </p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => removeStudent.mutate(s.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma sala criada para esta turma.
            </CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {rooms.map((r: any) => (
                <Card key={r.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium truncate">{r.title}</p>
                      <Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Ativa" : "Encerrada"}</Badge>
                    </div>
                    {r.description && <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>}
                    <div className="flex items-center justify-between pt-2 gap-2">
                      <span className="text-xs text-muted-foreground">PIN: <span className="font-mono">{r.pin}</span></span>
                      <div className="flex gap-1">
                        <UnlinkRoomButton roomId={r.id} classId={turma.id} />
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/turmas/${turma.id}/salas/${r.id}`}>
                            <BarChart3 className="h-3.5 w-3.5 mr-1" /> Abrir
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Configurações da turma</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
        <div><Label>Semestre</Label><Input value={semester} onChange={e => setSemester(e.target.value)} /></div>
        <div><Label>Descrição</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} /></div>
        <div className="flex justify-between pt-2">
          <Button variant="destructive" onClick={onDelete}><Trash2 className="h-4 w-4 mr-1" /> Excluir turma</Button>
          <Button onClick={() => onSave({ name, semester, description })}>Salvar</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ClassAnalyticsPanel({ rooms, participants, submissions, activities, students }: { rooms: any[]; participants: any[]; submissions: any[]; activities: any[]; students: any[] }) {
  const totalSubs = submissions.length;
  const avgScore = totalSubs ? Math.round(submissions.reduce((a, s) => a + (s.score || 0), 0) / totalSubs) : 0;
  const avgTime = totalSubs ? Math.round(submissions.reduce((a, s) => a + (s.time_spent_seconds || 0), 0) / totalSubs) : 0;

  // Per-room aggregation
  const roomStats = rooms.map(r => {
    const subs = submissions.filter((s: any) => s.room_id === r.id);
    const ps = participants.filter((p: any) => p.room_id === r.id);
    const score = subs.length ? Math.round(subs.reduce((a, s) => a + (s.score || 0), 0) / subs.length) : 0;
    return { id: r.id, name: (r.title || "—").slice(0, 22), title: r.title, ingressos: ps.length, submissoes: subs.length, score };
  });

  // Per-student (by email) aggregation across rooms
  const partByEmail = new Map<string, any[]>();
  participants.forEach((p: any) => {
    const em = (p.participant_email || "").toLowerCase();
    if (!em) return;
    const arr = partByEmail.get(em) || [];
    arr.push(p);
    partByEmail.set(em, arr);
  });
  const studentRows = students.map(s => {
    const em = s.email.toLowerCase();
    const ps = partByEmail.get(em) || [];
    const pIds = new Set(ps.map((p: any) => p.id));
    const subs = submissions.filter((sub: any) => pIds.has(sub.participant_id));
    const score = subs.length ? Math.round(subs.reduce((a: number, x: any) => a + (x.score || 0), 0) / subs.length) : 0;
    const roomsAttended = new Set(ps.map((p: any) => p.room_id)).size;
    const risk = computeStudentRisk({
      participantIds: Array.from(pIds) as string[],
      roomIds: ps.map((p: any) => p.room_id),
      allSubmissions: submissions,
      allActivities: activities,
    });
    return { name: s.full_name, email: s.email, score, submissoes: subs.length, salas: roomsAttended, risk };
  }).sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <StatBox label="Salas" value={rooms.length} />
        <StatBox label="Alunos cadastrados" value={students.length} />
        <StatBox label="Submissões" value={totalSubs} />
        <StatBox label="Nota média" value={avgScore} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Desempenho por sala</CardTitle></CardHeader>
        <CardContent>
          {roomStats.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma sala vinculada.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, roomStats.length * 36)}>
              <BarChart data={roomStats} layout="vertical" margin={{ left: 80, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={150} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="score" name="Nota média" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
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
                return (
                  <div key={i} className="grid grid-cols-12 gap-2 p-2 text-sm items-center">
                    <div className="col-span-4 min-w-0">
                      <p className="font-medium truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                    </div>
                    <div className="col-span-2 text-center">{r.salas}</div>
                    <div className="col-span-2 text-center">{r.submissoes}</div>
                    <div className="col-span-2 text-right">
                      <Badge variant={r.score >= 70 ? "default" : r.score > 0 ? "secondary" : "outline"}>
                        {r.submissoes > 0 ? r.score : "—"}
                      </Badge>
                    </div>
                    <div className="col-span-2 text-right">
                      {badge ? (
                        <Badge className={badge.className} title={r.risk.flags.join(" · ")}>{badge.label}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
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
