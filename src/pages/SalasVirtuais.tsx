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
import { DoorOpen, Plus, Copy, Trash2, Users, Eye, EyeOff, Calendar, Lock, ArrowUp, ArrowDown, X, ClipboardList } from "lucide-react";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { UpgradeModal } from "@/components/UpgradeModal";

const SIMULATOR_OPTIONS = [
  // Farmácia Clínica
  { slug: "prm", label: "PRM – Problemas Relacionados a Medicamentos" },
  { slug: "antimicrobianos", label: "Antimicrobianos / Stewardship" },
  { slug: "tdm", label: "TDM – Monitoramento Terapêutico" },
  { slug: "acompanhamento", label: "Acompanhamento Farmacoterapêutico" },
  { slug: "insulina", label: "Dose de Insulina" },
  { slug: "metodo-soap", label: "Simulador do Método SOAP" },
  { slug: "mai", label: "Simulador MAI" },
  { slug: "cascata-prescricao", label: "Cascata de Prescrição" },
  { slug: "bomba-infusao", label: "Bomba de Infusão" },
  { slug: "desmame-benzo", label: "Desmame de Benzodiazepínicos" },
  { slug: "interacoes", label: "Interações Medicamentosas" },
  // Fisiologia Humana
  { slug: "sna", label: "Sistema Nervoso Autônomo" },
  { slug: "eletrofisiologia-cardiaca", label: "Eletrofisiologia Cardíaca" },
  { slug: "depuracao-renal", label: "Depuração Renal e TFG" },
  { slug: "equilibrio-acido-base", label: "Equilíbrio Ácido-Base" },
  { slug: "regulacao-glicemica", label: "Regulação Glicêmica" },
  { slug: "eixo-hpa", label: "Eixo HPA" },
  { slug: "cinetica-enzimatica", label: "Cinética Enzimática" },
  { slug: "secrecao-gastrica", label: "Secreção Ácida Gástrica" },
  { slug: "cascata-coagulacao", label: "Cascata de Coagulação" },
  { slug: "compartimentos-adme", label: "Compartimentos ADME" },
  // Bioquímica
  { slug: "cadeia-eletrons", label: "Cadeia de Transporte de Eletrões" },
  { slug: "dissociacao-hemoglobina", label: "Dissociação da Hemoglobina" },
  { slug: "glicolise-gliconeogenese", label: "Glicólise vs. Gliconeogénese" },
  { slug: "cinetica-avancada", label: "Cinética Enzimática Avançada" },
  { slug: "ciclo-ureia", label: "Ciclo da Ureia" },
  { slug: "acido-araquidonico", label: "Cascata do Ácido Araquidónico" },
  { slug: "lipoproteinas", label: "Metabolismo das Lipoproteínas" },
  { slug: "pentoses-fosfato", label: "Via das Pentoses Fosfato e G6PD" },
  { slug: "titulacao-aminoacidos", label: "Titulação de Aminoácidos" },
  { slug: "operon-lac", label: "Operão Lac" },
  // Farmacologia Básica
  { slug: "dose-resposta", label: "Curva Dose-Resposta" },
  { slug: "transducao-sinal", label: "Transdução de Sinal" },
  { slug: "janela-terapeutica-farma", label: "Janela Terapêutica" },
  { slug: "vias-administracao", label: "Vias de Administração" },
  { slug: "bloqueio-neuromuscular", label: "Bloqueio Neuromuscular" },
  { slug: "farmaco-autonomica", label: "Farmacologia Autonômica" },
  { slug: "tolerancia-dependencia", label: "Tolerância e Dependência" },
  { slug: "farmacogenomica", label: "Farmacogenômica CYP" },
  // Farmacotécnica
  { slug: "estabilidade", label: "Estabilidade e Prazo de Validade" },
  { slug: "liberacao-farmacos", label: "Sistemas de Liberação" },
  { slug: "diluicao", label: "Diluição e Concentração" },
  { slug: "reologia", label: "Reologia e Viscosidade" },
  { slug: "hlb-emulsoes", label: "Equilíbrio HLB e Emulsões" },
  { slug: "granulometria", label: "Granulometria" },
  { slug: "compressao", label: "Compressão de Comprimidos" },
  { slug: "tampao-farmaceutico", label: "Tampão Farmacêutico" },
  // Química Farmacêutica
  { slug: "sar-explorer", label: "Relação Estrutura-Atividade (SAR)" },
  { slug: "lipinski", label: "Regra de Lipinski" },
  { slug: "bioisosterismo", label: "Bioisosterismo" },
  { slug: "metabolismo-farmacos", label: "Metabolismo de Fármacos" },
  { slug: "docking-simplificado", label: "Docking Fármaco-Receptor" },
  { slug: "quiralidade", label: "Quiralidade e Estereoquímica" },
  { slug: "pka-absorcao", label: "pKa, Ionização e Absorção" },
  { slug: "qsar-simplificado", label: "QSAR (Hansch)" },
  // Formação Docente
  { slug: "feedback-formativo", label: "Feedback Formativo" },
  { slug: "elaboracao-questoes", label: "Elaboração de Questões (Bloom)" },
  { slug: "conducao-caso-pbl", label: "Condução de Caso (PBL/TBL)" },
  { slug: "planejamento-aula", label: "Planejamento de Aula" },
  { slug: "gestao-sala", label: "Gestão de Sala" },
  { slug: "avaliacao-rubrica-osce", label: "Avaliação por Rubrica (OSCE)" },
  { slug: "preceptoria-clinica", label: "Preceptoria Clínica" },
  // Odontologia
  { slug: "odontograma", label: "Odontograma Interativo" },
  { slug: "anatomia-endodontia", label: "Anatomia Dental (Endodontia)" },
  { slug: "periodontograma", label: "Periodontograma" },
  { slug: "anestesiologia-odonto", label: "Anestesiologia Odontológica" },
  { slug: "cefalometria", label: "Cefalometria" },
  { slug: "radiografia-odonto", label: "Radiografia Odontológica" },
  { slug: "farmacologia-odonto", label: "Farmacologia Odontológica" },
  { slug: "cirurgia-exodontia", label: "Cirurgia e Exodontia" },
  // Fisioterapia
  { slug: "goniometria", label: "Goniometria Articular" },
  { slug: "avaliacao-postural", label: "Avaliação Postural" },
  { slug: "forca-muscular", label: "Força Muscular (Oxford/MRC)" },
  { slug: "dermatomos", label: "Dermátomos e Avaliação Sensitiva" },
  { slug: "respiratorio", label: "Fisioterapia Respiratória" },
  { slug: "eletroterapia", label: "Eletroterapia" },
  { slug: "testes-ortopedicos", label: "Testes Ortopédicos Especiais" },
  { slug: "berg", label: "Escala de Equilíbrio de Berg" },
  // Nutrição
  { slug: "avaliacao-nutricional", label: "Avaliação Nutricional Antropométrica" },
  { slug: "triagem-nutricional", label: "Triagem Nutricional (NRS-2002)" },
  { slug: "necessidades-energeticas", label: "Necessidades Energéticas" },
  { slug: "tne", label: "Terapia Nutricional Enteral (TNE)" },
  { slug: "tnp", label: "Terapia Nutricional Parenteral (TNP)" },
  { slug: "disfagia", label: "Avaliação de Disfagia" },
  { slug: "nutricao-renal", label: "Nutrição Renal Crônica" },
  { slug: "nutricao-materno-infantil", label: "Nutrição Materno-Infantil" },
];

interface ActivityItem {
  simulatorSlug: string;
  caseId: string;
}

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function SalasVirtuais() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [activities, setActivities] = useState<ActivityItem[]>([{ simulatorSlug: "", caseId: "" }]);
  const [detailRoom, setDetailRoom] = useState<any>(null);
  const { canUseVirtualRooms, upgradeOpen, setUpgradeOpen, upgradeFeature, showUpgrade } = useFeatureGating();

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ["virtual-rooms", user?.id],
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

  // Fetch activities for detail room
  const { data: roomActivities = [] } = useQuery({
    queryKey: ["room-activities", detailRoom?.id],
    enabled: !!detailRoom,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_activities")
        .select("*")
        .eq("room_id", detailRoom.id)
        .order("position");
      if (error) throw error;
      return data;
    },
  });

  // Fetch cases for all unique simulator slugs in activities
  const uniqueSlugs = [...new Set(activities.map(a => a.simulatorSlug).filter(Boolean))];
  const { data: allCases = [] } = useQuery({
    queryKey: ["simulator-cases-for-rooms", uniqueSlugs],
    enabled: uniqueSlugs.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("simulator_cases")
        .select("id, title, difficulty, simulator_slug")
        .in("simulator_slug", uniqueSlugs)
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
      const validActivities = activities.filter(a => a.simulatorSlug);
      if (validActivities.length === 0) throw new Error("Adicione pelo menos uma atividade");

      const pin = generatePin();

      // For single activity, keep legacy compatibility
      const isLegacy = validActivities.length === 1;

      const { data: roomData, error: roomError } = await supabase
        .from("virtual_rooms")
        .insert({
          pin,
          title,
          simulator_slug: isLegacy ? validActivities[0].simulatorSlug : null,
          case_id: isLegacy ? (validActivities[0].caseId || null) : null,
          created_by: user!.id,
          expires_at: expiresAt || null,
        })
        .select("id")
        .single();
      if (roomError) throw roomError;

      // Always insert room_activities for consistency
      const activityRows = validActivities.map((a, i) => ({
        room_id: roomData.id,
        simulator_slug: a.simulatorSlug,
        case_id: a.caseId || null,
        position: i,
      }));

      const { error: actError } = await supabase
        .from("room_activities")
        .insert(activityRows);
      if (actError) throw actError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["virtual-rooms"] });
      toast.success("Sala criada com sucesso!");
      setCreateOpen(false);
      setTitle("");
      setActivities([{ simulatorSlug: "", caseId: "" }]);
      setExpiresAt("");
    },
    onError: (err: any) => toast.error(err.message || "Erro ao criar sala"),
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

  const addActivity = () => setActivities([...activities, { simulatorSlug: "", caseId: "" }]);
  const removeActivity = (i: number) => {
    if (activities.length <= 1) return;
    setActivities(activities.filter((_, idx) => idx !== i));
  };
  const updateActivity = (i: number, field: keyof ActivityItem, value: string) => {
    const copy = [...activities];
    copy[i] = { ...copy[i], [field]: value };
    if (field === "simulatorSlug") copy[i].caseId = "";
    setActivities(copy);
  };
  const moveActivity = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= activities.length) return;
    const copy = [...activities];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setActivities(copy);
  };

  const getCasesForSlug = (slug: string) => allCases.filter((c: any) => c.simulator_slug === slug);

  const getSimulatorLabel = (slug: string) =>
    SIMULATOR_OPTIONS.find(s => s.slug === slug)?.label || slug;

  const isExam = (room: any) => !room.simulator_slug;

  if (!canUseVirtualRooms) {
    return (
      <div className="max-w-6xl mx-auto">
        <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={upgradeFeature} />
        <div className="flex items-center gap-3 mb-8">
          <DoorOpen className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold">Salas Virtuais</h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Salas Virtuais são um recurso exclusivo do plano <strong>Posologia Premium</strong>.</p>
            <Button onClick={() => showUpgrade("Salas virtuais ilimitadas são exclusivas do plano Premium")}>
              Assinar Premium
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={upgradeFeature} />
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
                  <div className="flex items-center gap-2">
                    <Badge variant={room.is_active ? "default" : "secondary"}>{room.is_active ? "Ativa" : "Inativa"}</Badge>
                    {isExam(room) && (
                      <Badge variant="outline" className="text-xs">
                        <ClipboardList className="h-3 w-3 mr-1" />Prova
                      </Badge>
                    )}
                  </div>
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
                {room.simulator_slug ? (
                  <p className="text-sm text-muted-foreground">
                    Simulador: {getSimulatorLabel(room.simulator_slug)}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Prova com múltiplos simuladores
                  </p>
                )}
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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Criar Nova Sala Virtual</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título da Sala</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Turma 2025.1 – Farmácia Clínica" />
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Atividades da Prova</Label>
                <Button variant="outline" size="sm" onClick={addActivity}>
                  <Plus className="h-4 w-4 mr-1" />Adicionar Atividade
                </Button>
              </div>
              <div className="space-y-3">
                {activities.map((act, i) => {
                  const casesForSlug = getCasesForSlug(act.simulatorSlug);
                  return (
                    <Card key={i} className="border-dashed">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-muted-foreground">Atividade {i + 1}</span>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveActivity(i, -1)} disabled={i === 0}>
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveActivity(i, 1)} disabled={i === activities.length - 1}>
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                            {activities.length > 1 && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeActivity(i)}>
                                <X className="h-3 w-3 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Simulador</Label>
                            <Select value={act.simulatorSlug} onValueChange={v => updateActivity(i, "simulatorSlug", v)}>
                              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                              <SelectContent>
                                {SIMULATOR_OPTIONS.map(s => <SelectItem key={s.slug} value={s.slug}>{s.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          {act.simulatorSlug && casesForSlug.length > 0 && (
                            <div>
                              <Label className="text-xs">Caso Clínico (opcional)</Label>
                              <Select value={act.caseId} onValueChange={v => updateActivity(i, "caseId", v)}>
                                <SelectTrigger><SelectValue placeholder="Qualquer caso" /></SelectTrigger>
                                <SelectContent>
                                  {casesForSlug.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title} ({c.difficulty})</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <Separator />

            <div>
              <Label>Data de Expiração (opcional)</Label>
              <Input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => createRoom.mutate()}
              disabled={!title || activities.every(a => !a.simulatorSlug) || createRoom.isPending}
            >
              {createRoom.isPending ? "Criando..." : "Criar Sala"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Room Detail Dialog */}
      <Dialog open={!!detailRoom} onOpenChange={() => setDetailRoom(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detailRoom?.title} – Detalhes</DialogTitle></DialogHeader>

          {/* Show activities if exam */}
          {detailRoom && isExam(detailRoom) && roomActivities.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2">Atividades da Prova</h3>
              <div className="space-y-1">
                {roomActivities.map((act: any, i: number) => (
                  <div key={act.id} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="text-xs">{i + 1}</Badge>
                    <span>{getSimulatorLabel(act.simulator_slug)}</span>
                  </div>
                ))}
              </div>
              <Separator className="mt-3" />
            </div>
          )}

          <h3 className="text-sm font-semibold mb-2">Participantes</h3>
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
                            {pSubmissions.map((s: any) => {
                              // Find activity info if available
                              const activity = roomActivities.find((a: any) => a.id === s.activity_id);
                              const actLabel = activity
                                ? `${getSimulatorLabel(activity.simulator_slug)} (Ativ. ${activity.position + 1})`
                                : `Etapa ${s.step_index + 1}`;
                              return (
                                <div key={s.id} className="flex items-center justify-between text-sm">
                                  <span>{actLabel}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-muted-foreground">{Math.floor(s.time_spent_seconds / 60)}m{s.time_spent_seconds % 60}s</span>
                                    <Badge variant={s.score >= 80 ? "secondary" : "destructive"} className={s.score >= 80 ? "bg-green-100 text-green-800" : ""}>
                                      {s.score}%
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })}
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
