import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSystemUpdates, type SystemUpdate, type SystemUpdateInsert } from "@/hooks/useSystemUpdates";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Plus, Pencil, Trash2, Rocket, CheckCircle2, Clock, Lightbulb,
  Flame, Loader2, Calendar, Tag, ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_CONFIG = {
  done: { label: "Concluído", color: "bg-green-500/10 text-green-400 border-green-500/20", icon: CheckCircle2 },
  in_progress: { label: "Em Andamento", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Loader2 },
  planned: { label: "Planejado", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", icon: Clock },
  idea: { label: "Ideia", color: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: Lightbulb },
};

const PRIORITY_CONFIG = {
  critical: { label: "Crítica", color: "text-red-400" },
  high: { label: "Alta", color: "text-orange-400" },
  medium: { label: "Média", color: "text-yellow-400" },
  low: { label: "Baixa", color: "text-muted-foreground" },
};

const CATEGORIES = [
  "Calculadoras", "Simuladores", "Laboratório Virtual", "Jogos Clínicos",
  "MedView 3D", "Salas Virtuais", "Admin", "UI/UX", "Infraestrutura",
  "Segurança", "Performance", "Integrações", "Outro",
];

const emptyForm: Omit<SystemUpdateInsert, "created_by"> = {
  type: "idea",
  status: "idea",
  title: "",
  description: "",
  category: "",
  priority: "medium",
  version: "",
  implemented_at: null,
};

const RETROACTIVE_ENTRIES: Omit<SystemUpdateInsert, "created_by">[] = [
  { type: "update", status: "done", title: "Calculadoras Clínicas Base", description: "20+ calculadoras: Risco Cardiovascular, CKD-EPI, Wells Score, Q-SOFA, HOMA-IR, FINDRISC, Vancomicina AUC, etc.", category: "Calculadoras", priority: "critical", version: "1.0.0", implemented_at: "2025-01-15T10:00:00Z" },
  { type: "update", status: "done", title: "Simuladores de Farmácia Clínica", description: "PRM, Antimicrobianos, TDM, Acompanhamento, Insulina, Bomba de Infusão, Desmame Benzo e Interações", category: "Simuladores", priority: "critical", version: "1.1.0", implemented_at: "2025-02-01T10:00:00Z" },
  { type: "update", status: "done", title: "Simuladores de Fisiologia", description: "10 simuladores: SNA, Eletrofisiologia, Depuração Renal, Equilíbrio Ácido-Base, Regulação Glicêmica, Eixo HPA, Cinética Enzimática, etc.", category: "Simuladores", priority: "critical", version: "1.2.0", implemented_at: "2025-02-15T10:00:00Z" },
  { type: "update", status: "done", title: "Simuladores de Bioquímica", description: "10 simuladores: Cadeia de Elétrons, Hemoglobina, Glicólise, Ciclo da Ureia, Ácido Araquidônico, Lipoproteínas, etc.", category: "Simuladores", priority: "high", version: "1.3.0", implemented_at: "2025-02-20T10:00:00Z" },
  { type: "update", status: "done", title: "Simuladores de Farmacologia", description: "9 simuladores: Dose-Resposta, Transdução, Janela Terapêutica, Vias Administração, Bloqueio Neuromuscular, etc.", category: "Simuladores", priority: "high", version: "1.4.0", implemented_at: "2025-03-01T10:00:00Z" },
  { type: "update", status: "done", title: "Simuladores de Farmacotécnica", description: "8 simuladores: Estabilidade, Liberação, Diluição, Reologia, HLB, Granulometria, Compressão e Tampão", category: "Simuladores", priority: "high", version: "1.5.0", implemented_at: "2025-03-05T10:00:00Z" },
  { type: "update", status: "done", title: "Simuladores de Química Farmacêutica", description: "8 simuladores: SAR, Lipinski, Bioisosterismo, Metabolismo, Docking, Quiralidade, pKa e QSAR", category: "Simuladores", priority: "high", version: "1.6.0", implemented_at: "2025-03-08T10:00:00Z" },
  { type: "update", status: "done", title: "Simuladores de Docência", description: "7 simuladores: Feedback Formativo, Questões, Condução de Caso, Planejamento, Gestão de Sala, Rubrica e Preceptoria", category: "Simuladores", priority: "medium", version: "1.7.0", implemented_at: "2025-03-10T10:00:00Z" },
  { type: "update", status: "done", title: "Simuladores de Odontologia", description: "8 simuladores: Odontograma, Endodontia, Periodontograma, Anestesiologia, Cefalometria, Radiografia, Farmacologia e Cirurgia", category: "Simuladores", priority: "medium", version: "1.8.0", implemented_at: "2025-03-12T10:00:00Z" },
  { type: "update", status: "done", title: "Simuladores de Fisioterapia", description: "8 simuladores: Goniometria, Postura, Força Muscular, Dermátomos, Respiratório, Eletroterapia, Testes Ortopédicos e Berg", category: "Simuladores", priority: "medium", version: "1.9.0", implemented_at: "2025-03-14T10:00:00Z" },
  { type: "update", status: "done", title: "Simuladores de Nutrição", description: "8 simuladores: Avaliação, Triagem, Necessidades Energéticas, TNE, TNP, Disfagia, Renal e Materno-Infantil", category: "Simuladores", priority: "medium", version: "2.0.0", implemented_at: "2025-03-15T10:00:00Z" },
  { type: "update", status: "done", title: "Laboratório Virtual de Pesquisa", description: "11 bancadas científicas com fluxo de 5 etapas e desafios de interpretação", category: "Laboratório Virtual", priority: "critical", version: "2.1.0", implemented_at: "2025-03-16T10:00:00Z" },
  { type: "update", status: "done", title: "Jogos Clínicos", description: "20+ jogos educacionais gamificados com ranking e estrelas", category: "Jogos Clínicos", priority: "high", version: "2.2.0", implemented_at: "2025-03-17T10:00:00Z" },
  { type: "update", status: "done", title: "Salas Virtuais", description: "Sistema de salas com PIN, atividades em grupo, submissão e ranking de participantes", category: "Salas Virtuais", priority: "critical", version: "2.3.0", implemented_at: "2025-03-18T10:00:00Z" },
  { type: "update", status: "done", title: "MedView 3D", description: "Demonstração de procedimentos com modelos 3D Sketchfab e Z-Anatomy em 6 categorias", category: "MedView 3D", priority: "high", version: "2.4.0", implemented_at: "2025-03-19T10:00:00Z" },
  { type: "update", status: "done", title: "Marketplace e Gamificação", description: "Marketplace de ferramentas, sistema de pontos, badges e leaderboard", category: "Integrações", priority: "medium", version: "2.5.0", implemented_at: "2025-03-20T10:00:00Z" },
  { type: "update", status: "done", title: "Calculadoras Pediátricas", description: "Curvas OMS (Z-Score), Bilirrubina Neonatal (Bhutani), Schwartz, PEWS e Drogas Vasoativas", category: "Calculadoras", priority: "high", version: "2.6.0", implemented_at: "2025-03-21T10:00:00Z" },
  { type: "update", status: "done", title: "Calculadoras de Ginecologia", description: "Idade Gestacional + DPP, Ganho de Peso (IOM), Pré-Eclâmpsia, Bishop Score e Sulfato de Magnésio", category: "Calculadoras", priority: "high", version: "2.7.0", implemented_at: "2025-03-22T10:00:00Z" },
  { type: "update", status: "done", title: "Lab Fármacos: PubChem + ADMET IA", description: "Busca PubChem integrada e predições ADMET via IA com rótulos de risco", category: "Laboratório Virtual", priority: "high", version: "2.8.0", implemented_at: "2025-03-23T10:00:00Z" },
  { type: "update", status: "done", title: "Lab Fármacos: Biblioteca + Druglikeness", description: "Biblioteca comparativa com exportação CSV e Druglikeness multi-critério", category: "Laboratório Virtual", priority: "high", version: "2.8.1", implemented_at: "2025-03-23T10:00:00Z" },
  { type: "update", status: "done", title: "Lab Modelagem: Pesquisa Avançada", description: "Biblioteca de compostos, Druglikeness, Similaridade Molecular e Alvo Proteico (UniProt + PDB)", category: "Laboratório Virtual", priority: "high", version: "2.9.0", implemented_at: "2025-03-24T10:00:00Z" },
  { type: "update", status: "done", title: "Lab Modelagem: Comparação ADMET + IA", description: "Comparação lado a lado Original vs Modificado com análise de impacto farmacológico via IA", category: "Laboratório Virtual", priority: "high", version: "2.9.1", implemented_at: "2025-03-24T10:00:00Z" },
  { type: "update", status: "done", title: "Lab Modelagem: Docking Comparativo", description: "Docking de 3 compostos contra alvo proteico com scores determinísticos + análise IA comparativa", category: "Laboratório Virtual", priority: "high", version: "2.9.2", implemented_at: "2025-03-25T10:00:00Z" },
  { type: "update", status: "done", title: "Pipeline de Atualizações", description: "Sistema de changelog e planejamento com notificação proativa ao admin", category: "Admin", priority: "medium", version: "2.9.3", implemented_at: "2025-03-25T12:00:00Z" },
];

export default function PipelinePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { updates, isLoading, createUpdate, updateEntry, deleteEntry } = useSystemUpdates();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [tab, setTab] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "priority">("date");
  const [seeding, setSeeding] = useState(false);

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      for (const entry of RETROACTIVE_ENTRIES) {
        await createUpdate.mutateAsync({ ...entry, created_by: user?.id || null });
      }
      toast.success(`${RETROACTIVE_ENTRIES.length} entradas retroativas adicionadas!`);
    } catch (err) {
      toast.error("Erro ao inserir dados retroativos");
    } finally {
      setSeeding(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Título é obrigatório"); return; }
    try {
      if (editingId) {
        await updateEntry.mutateAsync({ id: editingId, ...form });
        toast.success("Atualização editada");
      } else {
        await createUpdate.mutateAsync({ ...form, created_by: user?.id || null });
        toast.success("Item adicionado ao pipeline");
      }
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (err) {
      toast.error("Erro ao salvar");
    }
  };

  const handleEdit = (item: SystemUpdate) => {
    setEditingId(item.id);
    setForm({
      type: item.type,
      status: item.status,
      title: item.title,
      description: item.description || "",
      category: item.category || "",
      priority: item.priority,
      version: item.version || "",
      implemented_at: item.implemented_at,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este item?")) return;
    try {
      await deleteEntry.mutateAsync(id);
      toast.success("Item excluído");
    } catch { toast.error("Erro ao excluir"); }
  };

  const handleMarkDone = async (item: SystemUpdate) => {
    try {
      await updateEntry.mutateAsync({
        id: item.id,
        status: "done",
        type: "update",
        implemented_at: new Date().toISOString(),
      });
      toast.success(`"${item.title}" marcado como concluído!`);
    } catch { toast.error("Erro ao atualizar status"); }
  };

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

  const filtered = updates
    .filter((u) => {
      if (tab === "all") return true;
      if (tab === "changelog") return u.status === "done";
      if (tab === "pipeline") return u.status !== "done";
      return u.status === tab;
    })
    .sort((a, b) => {
      if (sortBy === "priority") {
        return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const stats = {
    total: updates.length,
    done: updates.filter((u) => u.status === "done").length,
    inProgress: updates.filter((u) => u.status === "in_progress").length,
    planned: updates.filter((u) => u.status === "planned").length,
    ideas: updates.filter((u) => u.status === "idea").length,
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Rocket className="h-6 w-6 text-primary" />
              Pipeline de Atualizações
            </h1>
            <p className="text-sm text-muted-foreground">Registro de atualizações e planejamento de novas funcionalidades</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Novo Item</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Item" : "Novo Item"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Textarea placeholder="Descrição detalhada" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="update">Atualização</SelectItem>
                      <SelectItem value="idea">Ideia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="done">Concluído</SelectItem>
                      <SelectItem value="in_progress">Em Andamento</SelectItem>
                      <SelectItem value="planned">Planejado</SelectItem>
                      <SelectItem value="idea">Ideia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Prioridade</label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Crítica</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="low">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Categoria</label>
                  <Select value={form.category || ""} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Input placeholder="Versão (ex: 2.5.0)" value={form.version || ""} onChange={(e) => setForm({ ...form, version: e.target.value })} />
              <Button className="w-full" onClick={handleSave} disabled={createUpdate.isPending || updateEntry.isPending}>
                {(createUpdate.isPending || updateEntry.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingId ? "Salvar Alterações" : "Adicionar ao Pipeline"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Concluídos", value: stats.done, color: "text-green-400" },
          { label: "Em Andamento", value: stats.inProgress, color: "text-blue-400" },
          { label: "Planejados", value: stats.planned, color: "text-yellow-400" },
          { label: "Ideias", value: stats.ideas, color: "text-purple-400" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs + Sort */}
      <div className="flex items-center justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">Tudo</TabsTrigger>
            <TabsTrigger value="changelog">Changelog</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="idea">Ideias</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSortBy(sortBy === "date" ? "priority" : "date")}>
          <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
          {sortBy === "date" ? "Por Data" : "Por Prioridade"}
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground space-y-3">
          <p className="text-sm">Nenhum item encontrado nesta aba.</p>
          {updates.length === 0 && (
            <Button variant="outline" size="sm" onClick={handleSeedData} disabled={seeding}>
              {seeding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Rocket className="h-4 w-4 mr-2" />}
              Carregar Histórico Retroativo ({RETROACTIVE_ENTRIES.length} entradas)
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.idea;
            const pc = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.medium;
            const StatusIcon = sc.icon;
            return (
              <div key={item.id} className="flex items-start gap-3 bg-card border border-border rounded-lg p-3 hover:border-primary/20 transition-colors group">
                <StatusIcon className={`h-4 w-4 mt-1 shrink-0 ${sc.color.includes("text-") ? sc.color.split(" ").find(c => c.startsWith("text-")) : ""}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{item.title}</p>
                    {item.version && <Badge variant="outline" className="text-[9px] h-4">v{item.version}</Badge>}
                    <Badge variant="outline" className={`text-[9px] h-4 ${sc.color}`}>{sc.label}</Badge>
                    <Badge variant="outline" className={`text-[9px] h-4 ${pc.color}`}>{pc.label}</Badge>
                    {item.category && <Badge variant="secondary" className="text-[9px] h-4"><Tag className="h-2.5 w-2.5 mr-0.5" />{item.category}</Badge>}
                  </div>
                  {item.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(item.created_at), "dd MMM yyyy HH:mm", { locale: ptBR })}
                    </span>
                    {item.implemented_at && (
                      <span>Implementado: {format(new Date(item.implemented_at), "dd MMM yyyy", { locale: ptBR })}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {item.status !== "done" && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleMarkDone(item)} title="Marcar como concluído">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(item)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
