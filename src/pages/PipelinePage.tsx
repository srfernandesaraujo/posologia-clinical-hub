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

export default function PipelinePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { updates, isLoading, createUpdate, updateEntry, deleteEntry } = useSystemUpdates();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [tab, setTab] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "priority">("date");

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
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">Nenhum item encontrado nesta aba.</p>
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
