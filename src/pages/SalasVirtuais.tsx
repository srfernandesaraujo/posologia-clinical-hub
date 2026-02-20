import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { DoorOpen, Plus, Copy, Trash2, Users, Eye, EyeOff, Calendar } from "lucide-react";

const SIMULATOR_OPTIONS = [
  { slug: "prm", label: "PRM – Problemas Relacionados a Medicamentos" },
  { slug: "antimicrobianos", label: "Antimicrobianos / Stewardship" },
  { slug: "tdm", label: "TDM – Monitoramento Terapêutico" },
  { slug: "acompanhamento", label: "Acompanhamento Farmacoterapêutico" },
  { slug: "insulina", label: "Dose de Insulina" },
];

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function SalasVirtuais() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [simulatorSlug, setSimulatorSlug] = useState("");
  const [caseId, setCaseId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [detailRoom, setDetailRoom] = useState<any>(null);

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ["virtual-rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("virtual_rooms")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: cases = [] } = useQuery({
    queryKey: ["simulator-cases-for-rooms", simulatorSlug],
    enabled: !!simulatorSlug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("simulator_cases")
        .select("id, title, difficulty")
        .eq("simulator_slug", simulatorSlug)
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["room-participants", detailRoom?.id],
    enabled: !!detailRoom,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_participants")
        .select("*")
        .eq("room_id", detailRoom.id)
        .order("joined_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ["room-submissions", detailRoom?.id],
    enabled: !!detailRoom,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_submissions")
        .select("*")
        .eq("room_id", detailRoom.id)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createRoom = useMutation({
    mutationFn: async () => {
      const pin = generatePin();
      const { error } = await supabase.from("virtual_rooms").insert({
        pin,
        title,
        simulator_slug: simulatorSlug,
        case_id: caseId || null,
        created_by: user!.id,
        expires_at: expiresAt || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["virtual-rooms"] });
      toast.success("Sala criada com sucesso!");
      setCreateOpen(false);
      setTitle("");
      setSimulatorSlug("");
      setCaseId("");
      setExpiresAt("");
    },
    onError: () => toast.error("Erro ao criar sala"),
  });

  const toggleRoom = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("virtual_rooms").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["virtual-rooms"] }),
  });

  const deleteRoom = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("virtual_rooms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["virtual-rooms"] });
      toast.success("Sala excluída");
    },
  });

  const copyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    toast.success(`PIN ${pin} copiado!`);
  };

  const getParticipantName = (participantId: string) => {
    const p = participants.find((p: any) => p.id === participantId);
    return p?.participant_name || "Desconhecido";
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <DoorOpen className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold">Salas Virtuais</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Nova Sala
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : rooms.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma sala criada ainda. Clique em "Nova Sala" para começar.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room: any) => (
            <Card key={room.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant={room.is_active ? "default" : "secondary"}>{room.is_active ? "Ativa" : "Inativa"}</Badge>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => toggleRoom.mutate({ id: room.id, is_active: !room.is_active })}>
                      {room.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteRoom.mutate(room.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-lg">{room.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">PIN:</span>
                  <code className="text-2xl font-mono font-bold tracking-widest text-primary">{room.pin}</code>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyPin(room.pin)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Simulador: {SIMULATOR_OPTIONS.find(s => s.slug === room.simulator_slug)?.label || room.simulator_slug}
                </p>
                {room.expires_at && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Expira: {new Date(room.expires_at).toLocaleDateString("pt-BR")}
                  </p>
                )}
                <Button variant="outline" size="sm" className="w-full" onClick={() => setDetailRoom(room)}>
                  <Users className="h-4 w-4 mr-2" />Ver Participantes
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Room Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Criar Nova Sala Virtual</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título da Sala</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Turma 2025.1 – Farmácia Clínica" /></div>
            <div>
              <Label>Simulador</Label>
              <Select value={simulatorSlug} onValueChange={v => { setSimulatorSlug(v); setCaseId(""); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o simulador" /></SelectTrigger>
                <SelectContent>
                  {SIMULATOR_OPTIONS.map(s => <SelectItem key={s.slug} value={s.slug}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {simulatorSlug && cases.length > 0 && (
              <div>
                <Label>Caso Clínico (opcional – será o caso usado na sala)</Label>
                <Select value={caseId} onValueChange={setCaseId}>
                  <SelectTrigger><SelectValue placeholder="Qualquer caso disponível" /></SelectTrigger>
                  <SelectContent>
                    {cases.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title} ({c.difficulty})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Data de Expiração (opcional)</Label><Input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button onClick={() => createRoom.mutate()} disabled={!title || !simulatorSlug || createRoom.isPending}>
              {createRoom.isPending ? "Criando..." : "Criar Sala"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Room Detail Dialog */}
      <Dialog open={!!detailRoom} onOpenChange={() => setDetailRoom(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detailRoom?.title} – Participantes</DialogTitle></DialogHeader>
          {participants.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">Nenhum participante entrou na sala ainda.</p>
          ) : (
            <div className="space-y-4">
              {participants.map((p: any) => {
                const pSubmissions = submissions.filter((s: any) => s.participant_id === p.id);
                const avgScore = pSubmissions.length > 0 ? Math.round(pSubmissions.reduce((a: number, s: any) => a + s.score, 0) / pSubmissions.length) : null;
                const totalTime = pSubmissions.reduce((a: number, s: any) => a + (s.time_spent_seconds || 0), 0);
                return (
                  <Card key={p.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">{p.participant_name}</p>
                          {p.is_group && (
                            <p className="text-xs text-muted-foreground">
                              Grupo: {(p.group_members as any[] || []).join(", ")}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">Entrou: {new Date(p.joined_at).toLocaleString("pt-BR")}</p>
                        </div>
                        <div className="text-right">
                          {avgScore !== null ? (
                            <Badge variant={avgScore >= 80 ? "secondary" : avgScore >= 50 ? "default" : "destructive"} className={avgScore >= 80 ? "bg-green-100 text-green-800" : ""}>
                              {avgScore}% média
                            </Badge>
                          ) : (
                            <Badge variant="outline">Sem submissões</Badge>
                          )}
                        </div>
                      </div>
                      {pSubmissions.length > 0 && (
                        <>
                          <Separator className="my-2" />
                          <div className="space-y-1">
                            {pSubmissions.map((s: any) => (
                              <div key={s.id} className="flex items-center justify-between text-sm">
                                <span>Etapa {s.step_index + 1}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-muted-foreground">{Math.floor(s.time_spent_seconds / 60)}m{s.time_spent_seconds % 60}s</span>
                                  <Badge variant={s.score >= 80 ? "secondary" : "destructive"} className={s.score >= 80 ? "bg-green-100 text-green-800" : ""}>
                                    {s.score}%
                                  </Badge>
                                </div>
                              </div>
                            ))}
                            <p className="text-xs text-muted-foreground mt-1">Tempo total: {Math.floor(totalTime / 60)}m{totalTime % 60}s</p>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
