import { useState, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useClasses, useClassStudents } from "@/hooks/useClasses";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, Users, DoorOpen, BarChart3, Settings as SettingsIcon, Mail } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Salas virtuais vinculadas a esta turma.</p>
            <Button asChild size="sm">
              <Link to={`/salas-virtuais?classId=${turma.id}`}><Plus className="h-4 w-4 mr-1" /> Nova sala</Link>
            </Button>
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
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-muted-foreground">PIN: <span className="font-mono">{r.pin}</span></span>
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/turmas/${turma.id}/salas/${r.id}`}>
                          <BarChart3 className="h-3.5 w-3.5 mr-1" /> Abrir
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
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
