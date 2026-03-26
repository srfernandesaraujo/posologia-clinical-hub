import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSystemUpdates, type SystemUpdate, type SystemUpdateInsert } from "@/hooks/useSystemUpdates";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Trash2, Rocket, CheckCircle2, Lightbulb,
  Loader2, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

const PRIORITY_BADGE: Record<string, { label: string; className: string }> = {
  critical: { label: "Crítica", className: "bg-red-600 text-white border-red-600" },
  high: { label: "Alta", className: "bg-orange-500 text-white border-orange-500" },
  medium: { label: "Média", className: "bg-yellow-500 text-white border-yellow-500" },
  low: { label: "Baixa", className: "bg-muted text-muted-foreground border-border" },
};

const CATEGORIES = [
  "Calculadoras", "Simuladores", "Laboratório Virtual", "Jogos Clínicos",
  "MedView 3D", "Salas Virtuais", "Admin", "UI/UX", "Infraestrutura",
  "Segurança", "Performance", "Integrações", "Outro",
];

const emptyForm: Omit<SystemUpdateInsert, "created_by"> = {
  type: "idea", status: "planned", title: "", description: "",
  category: "", priority: "medium", version: "", implemented_at: null,
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
  const [tab, setTab] = useState("roadmap");
  const [seeding, setSeeding] = useState(false);
  const [generating, setGenerating] = useState(false);

  const changelog = updates.filter((u) => u.status === "done");
  const roadmap = updates.filter((u) => u.status !== "done");

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      for (const entry of RETROACTIVE_ENTRIES) {
        await createUpdate.mutateAsync({ ...entry, created_by: user?.id || null });
      }
      toast.success(`${RETROACTIVE_ENTRIES.length} entradas retroativas adicionadas!`);
    } catch {
      toast.error("Erro ao inserir dados retroativos");
    } finally {
      setSeeding(false);
    }
  };

  const handleGenerateRoadmap = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-roadmap", {
        body: {
          existingTitles: updates.map((u) => u.title),
          categories: CATEGORIES,
        },
      });
      if (error) throw error;
      const ideas = data?.ideas || [];
      for (const idea of ideas) {
        await createUpdate.mutateAsync({
          type: "idea",
          status: "planned",
          title: idea.title,
          description: idea.description,
          category: idea.category,
          priority: idea.priority,
          version: null,
          implemented_at: null,
          created_by: user?.id || null,
        });
      }
      toast.success(`${ideas.length} sugestões adicionadas ao roadmap!`);
    } catch {
      toast.error("Erro ao gerar sugestões de roadmap");
    } finally {
      setGenerating(false);
    }
  };

  // Auto-generate every 30 days
  useEffect(() => {
    if (isLoading || updates.length === 0) return;
    const planned = updates.filter((u) => u.status !== "done");
    if (planned.length > 0) return; // Already has roadmap items

    const lastGenKey = "roadmap-last-generated";
    const lastGen = localStorage.getItem(lastGenKey);
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    if (!lastGen || Number(lastGen) < thirtyDaysAgo) {
      localStorage.setItem(lastGenKey, String(Date.now()));
      handleGenerateRoadmap();
    }
  }, [isLoading, updates.length]);

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
    } catch {
      toast.error("Erro ao salvar");
    }
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
      toast.success(`"${item.title}" concluído e adicionado ao changelog!`);
    } catch { toast.error("Erro ao concluir"); }
  };

  const currentItems = tab === "changelog" ? changelog : roadmap;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" />
            Pipeline de Atualizações
          </h1>
          <p className="text-sm text-muted-foreground">
            Histórico de funcionalidades e planejamento futuro do sistema.
          </p>
        </div>
        <div className="flex gap-2">
          {tab === "roadmap" && (
            <Button variant="outline" size="sm" onClick={handleGenerateRoadmap} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Gerar Sugestões IA
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nova Entrada</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Item" : "Nova Entrada"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <Textarea placeholder="Descrição detalhada" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                <div className="grid grid-cols-2 gap-3">
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
                <Input placeholder="Versão (ex: 2.5.0)" value={form.version || ""} onChange={(e) => setForm({ ...form, version: e.target.value })} />
                <Button className="w-full" onClick={handleSave} disabled={createUpdate.isPending || updateEntry.isPending}>
                  {(createUpdate.isPending || updateEntry.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editingId ? "Salvar Alterações" : "Adicionar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="changelog" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Changelog ({changelog.length})
          </TabsTrigger>
          <TabsTrigger value="roadmap" className="gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" />
            Roadmap ({roadmap.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : currentItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground space-y-3">
          <p className="text-sm">
            {tab === "changelog"
              ? "Nenhuma atualização registrada ainda."
              : "Nenhum item no roadmap."}
          </p>
          {tab === "changelog" && updates.length === 0 && (
            <Button variant="outline" size="sm" onClick={handleSeedData} disabled={seeding}>
              {seeding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Rocket className="h-4 w-4 mr-2" />}
              Carregar Histórico Retroativo ({RETROACTIVE_ENTRIES.length} entradas)
            </Button>
          )}
          {tab === "roadmap" && (
            <Button variant="outline" size="sm" onClick={handleGenerateRoadmap} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Gerar Sugestões com IA
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {currentItems.map((item) => {
            const pb = PRIORITY_BADGE[item.priority] || PRIORITY_BADGE.medium;
            return (
              <div
                key={item.id}
                className="flex items-start gap-4 bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow border-l-4 border-l-primary/60"
              >
                <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <Badge className={`text-[10px] px-2 py-0 h-5 rounded-full font-medium border ${pb.className}`}>
                      {pb.label}
                    </Badge>
                    {item.version && (
                      <Badge variant="outline" className="text-[10px] h-5">v{item.version}</Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                  )}
                  {item.status === "done" && item.implemented_at && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Implementado em {format(new Date(item.implemented_at), "dd MMM yyyy", { locale: ptBR })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.status !== "done" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5"
                      onClick={() => handleMarkDone(item)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Concluir
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
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
