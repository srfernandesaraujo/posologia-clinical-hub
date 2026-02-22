import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import {
  Shield, Plus, Pencil, Trash2, Users, Calculator, BarChart3,
  FlaskConical, Save, ToggleLeft, ToggleRight, Sparkles, Loader2, Wand2,
  Mail, CheckCircle, XCircle, Eye, EyeOff, MessageSquare, UserPlus, Send, Infinity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ToolForm {
  name: string;
  slug: string;
  type: "calculadora" | "simulador";
  description: string;
  short_description: string;
  category_id: string;
  is_active: boolean;
  fields: any[];
  formula: any;
}

const emptyTool: ToolForm = {
  name: "", slug: "", type: "calculadora", description: "",
  short_description: "", category_id: "", is_active: true,
  fields: [], formula: {},
};

export default function Admin() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editingTool, setEditingTool] = useState<(ToolForm & { id?: string }) | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiType, setAiType] = useState<"calculadora" | "simulador">("calculadora");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPreview, setAiPreview] = useState<any>(null);
  const [aiEditDialogOpen, setAiEditDialogOpen] = useState(false);
  const [aiEditPrompt, setAiEditPrompt] = useState("");
  const [aiEditTarget, setAiEditTarget] = useState<any>(null);
  const [aiEditLoading, setAiEditLoading] = useState(false);
  const [aiEditPreview, setAiEditPreview] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const { data: tools = [] } = useQuery({
    queryKey: ["admin-tools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools").select("*, categories(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles").select("*, user_roles(role)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: usageLogs = [] } = useQuery({
    queryKey: ["admin-usage-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usage_logs").select("*, tools(name)")
        .order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: contactMessages = [] } = useQuery({
    queryKey: ["admin-contact-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages").select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: invitedUsers = [] } = useQuery({
    queryKey: ["admin-invited-users"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("list-invited-users");
      if (error) throw error;
      return data?.users || [];
    },
  });

  const saveTool = useMutation({
    mutationFn: async (tool: ToolForm & { id?: string }) => {
      const payload = {
        name: tool.name, slug: tool.slug, type: tool.type,
        description: tool.description, short_description: tool.short_description,
        category_id: tool.category_id || null, is_active: tool.is_active,
        fields: tool.fields || [], formula: tool.formula || {},
      };
      if (tool.id) {
        const { error } = await supabase.from("tools").update(payload).eq("id", tool.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tools").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tools"] });
      toast.success("Ferramenta salva com sucesso!");
      setDialogOpen(false);
      setEditingTool(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteTool = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tools").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tools"] });
      toast.success("Ferramenta removida.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("tools").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-tools"] }),
    onError: (err: any) => toast.error(err.message),
  });

  const updateUserStatus = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ status } as any)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Status do usuário atualizado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleMessageRead = useMutation({
    mutationFn: async ({ id, is_read }: { id: string; is_read: boolean }) => {
      const { error } = await supabase
        .from("contact_messages")
        .update({ is_read } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-contact-messages"] }),
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contact_messages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-contact-messages"] });
      toast.success("Mensagem excluída.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const generateSlug = (name: string) =>
    name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const findCategoryId = (categoryName: string) => {
    const cat = categories.find((c: any) =>
      c.name.toLowerCase() === categoryName.toLowerCase() ||
      c.slug === categoryName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    );
    return cat?.id || "";
  };

  const openNew = () => { setEditingTool({ ...emptyTool }); setDialogOpen(true); };

  const openEdit = (tool: any) => {
    setEditingTool({
      id: tool.id, name: tool.name, slug: tool.slug, type: tool.type,
      description: tool.description || "", short_description: tool.short_description || "",
      category_id: tool.category_id || "", is_active: tool.is_active,
      fields: tool.fields || [], formula: tool.formula || {},
    });
    setDialogOpen(true);
  };

  /* ─── AI Generate (Create) ─── */
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-tool", {
        body: { prompt: aiPrompt, type: aiType, mode: "create" },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setAiPreview(data.tool);
      toast.success("Ferramenta gerada pela IA! Revise e confirme.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar ferramenta");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiConfirm = () => {
    if (!aiPreview) return;
    const catId = aiPreview.category_name ? findCategoryId(aiPreview.category_name) : "";
    setEditingTool({
      name: aiPreview.name,
      slug: aiPreview.slug,
      type: aiType,
      description: aiPreview.description,
      short_description: aiPreview.short_description,
      category_id: catId,
      is_active: true,
      fields: aiPreview.fields || [],
      formula: aiPreview.formula || {},
    });
    setAiDialogOpen(false);
    setDialogOpen(true);
    setAiPreview(null);
    setAiPrompt("");
  };

  /* ─── AI Edit ─── */
  const openAiEdit = (tool: any) => {
    setAiEditTarget(tool);
    setAiEditPrompt("");
    setAiEditPreview(null);
    setAiEditDialogOpen(true);
  };

  const handleAiEdit = async () => {
    if (!aiEditPrompt.trim() || !aiEditTarget) return;
    setAiEditLoading(true);
    setAiEditPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-tool", {
        body: {
          prompt: aiEditPrompt,
          type: aiEditTarget.type,
          mode: "edit",
          existingTool: {
            name: aiEditTarget.name,
            fields: aiEditTarget.fields,
            formula: aiEditTarget.formula,
            description: aiEditTarget.description,
          },
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setAiEditPreview(data.tool);
      toast.success("Edição gerada pela IA! Revise e confirme.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao editar ferramenta");
    } finally {
      setAiEditLoading(false);
    }
  };

  const handleAiEditConfirm = async () => {
    if (!aiEditPreview || !aiEditTarget) return;
    const catId = aiEditPreview.category_name ? findCategoryId(aiEditPreview.category_name) : aiEditTarget.category_id;
    try {
      const { error } = await supabase.from("tools").update({
        name: aiEditPreview.name || aiEditTarget.name,
        slug: aiEditPreview.slug || aiEditTarget.slug,
        description: aiEditPreview.description,
        short_description: aiEditPreview.short_description,
        category_id: catId || null,
        fields: aiEditPreview.fields || [],
        formula: aiEditPreview.formula || {},
      }).eq("id", aiEditTarget.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-tools"] });
      toast.success("Ferramenta atualizada com sucesso!");
      setAiEditDialogOpen(false);
      setAiEditTarget(null);
      setAiEditPreview(null);
      setAiEditPrompt("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const calculadoras = tools.filter((t: any) => t.type === "calculadora");
  const simuladores = tools.filter((t: any) => t.type === "simulador");
  const unreadMessages = contactMessages.filter((m: any) => !m.is_read).length;
  const pendingUsers = users.filter((u: any) => u.status === "pending").length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500">{t("admin.approved")}</span>;
      case "inactive": return <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-destructive/10 text-destructive">{t("admin.inactive")}</span>;
      default: return <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500">{t("admin.pending")}</span>;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold">{t("admin.title")}</h1>
        </div>
      </div>

      <Tabs defaultValue="tools" className="space-y-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="tools" className="gap-2"><Calculator className="h-4 w-4" />{t("admin.tools")}</TabsTrigger>
          <TabsTrigger value="invite" className="gap-2"><UserPlus className="h-4 w-4" />Convidar</TabsTrigger>
          <TabsTrigger value="users" className="gap-2 relative">
            <Users className="h-4 w-4" />{t("admin.users")}
            {pendingUsers > 0 && <span className="ml-1 h-5 w-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">{pendingUsers}</span>}
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2 relative">
            <MessageSquare className="h-4 w-4" />{t("admin.messages")}
            {unreadMessages > 0 && <span className="ml-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">{unreadMessages}</span>}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2"><BarChart3 className="h-4 w-4" />{t("admin.recentUsage")}</TabsTrigger>
        </TabsList>

        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground mb-1">{t("admin.totalTools")}</p>
              <p className="text-3xl font-bold">{tools.length}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground mb-1">{t("admin.calculators")}</p>
              <p className="text-3xl font-bold text-primary">{calculadoras.length}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground mb-1">{t("admin.simulators")}</p>
              <p className="text-3xl font-bold text-accent">{simuladores.length}</p>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-semibold">{t("admin.allTools")}</h2>
            <div className="flex gap-2">
              {/* AI Generation Dialog */}
              <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
                    <Sparkles className="h-4 w-4" />
                    {t("admin.generateAi")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      {t("admin.generateAi")}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Tipo de ferramenta</Label>
                      <Select value={aiType} onValueChange={(v) => setAiType(v as any)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="calculadora">Calculadora Clínica</SelectItem>
                          <SelectItem value="simulador">Simulador Clínico</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Descreva a ferramenta que deseja criar</Label>
                      <Textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder={aiType === "calculadora"
                          ? "Ex: Crie uma calculadora de Clearance de Creatinina usando a fórmula de Cockcroft-Gault"
                          : "Ex: Crie um simulador de manejo de cetoacidose diabética"
                        }
                        rows={4}
                        className="bg-secondary/50"
                      />
                    </div>
                    <Button onClick={handleAiGenerate} disabled={aiLoading || !aiPrompt.trim()} className="w-full gap-2">
                      {aiLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Gerando...</> : <><Sparkles className="h-4 w-4" />Gerar ferramenta</>}
                    </Button>
                    {aiPreview && (
                      <AiPreviewCard preview={aiPreview} onDiscard={() => setAiPreview(null)} onConfirm={handleAiConfirm} confirmLabel="Usar e salvar" />
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Manual Creation */}
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openNew} className="gap-2">
                    <Plus className="h-4 w-4" />{t("admin.newTool")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingTool?.id ? "Editar ferramenta" : "Nova ferramenta"}</DialogTitle>
                  </DialogHeader>
                  {editingTool && (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input
                          value={editingTool.name}
                          onChange={(e) => {
                            const name = e.target.value;
                            setEditingTool({ ...editingTool, name,
                              slug: editingTool.id ? editingTool.slug : generateSlug(name),
                            });
                          }}
                          placeholder="Ex: Clearance de Creatinina"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Slug (URL)</Label>
                        <Input value={editingTool.slug} onChange={(e) => setEditingTool({ ...editingTool, slug: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tipo</Label>
                          <Select value={editingTool.type} onValueChange={(v) => setEditingTool({ ...editingTool, type: v as any })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="calculadora">Calculadora</SelectItem>
                              <SelectItem value="simulador">Simulador</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Categoria</Label>
                          <Select value={editingTool.category_id} onValueChange={(v) => setEditingTool({ ...editingTool, category_id: v })}>
                            <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                            <SelectContent>
                              {categories.map((c: any) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Descrição curta</Label>
                        <Input value={editingTool.short_description} onChange={(e) => setEditingTool({ ...editingTool, short_description: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Descrição completa</Label>
                        <Textarea value={editingTool.description} onChange={(e) => setEditingTool({ ...editingTool, description: e.target.value })} rows={3} />
                      </div>
                      {editingTool.fields && editingTool.fields.length > 0 && (
                        <div className="space-y-2">
                          <Label>Campos ({editingTool.fields.length})</Label>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {editingTool.fields.map((f: any, i: number) => (
                              <div key={i} className="text-sm rounded-lg bg-secondary/50 px-3 py-2 flex justify-between">
                                <span>{f.label}</span>
                                <span className="text-muted-foreground text-xs">{f.type}{f.unit ? ` (${f.unit})` : ""}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={() => editingTool && saveTool.mutate(editingTool)} disabled={!editingTool?.name || !editingTool?.slug || saveTool.isPending} className="gap-2">
                          <Save className="h-4 w-4" />
                          {saveTool.isPending ? "Salvando..." : "Salvar"}
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* AI Edit Dialog */}
          <Dialog open={aiEditDialogOpen} onOpenChange={setAiEditDialogOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-accent" />
                  Editar com IA — {aiEditTarget?.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {aiEditTarget && (
                  <div className="rounded-xl bg-secondary/50 p-4 text-sm">
                    <p className="text-muted-foreground mb-1">Campos atuais: {aiEditTarget.fields?.length || 0}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(aiEditTarget.fields || []).slice(0, 10).map((f: any, i: number) => (
                        <span key={i} className="text-xs bg-background px-2 py-1 rounded">{f.label}</span>
                      ))}
                      {(aiEditTarget.fields || []).length > 10 && (
                        <span className="text-xs text-muted-foreground">+{aiEditTarget.fields.length - 10} mais</span>
                      )}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Descreva as alterações desejadas</Label>
                  <Textarea
                    value={aiEditPrompt}
                    onChange={(e) => setAiEditPrompt(e.target.value)}
                    placeholder="Ex: Adicione um campo de raça/etnia, remova o campo de glicemia"
                    rows={4}
                    className="bg-secondary/50"
                  />
                </div>
                <Button onClick={handleAiEdit} disabled={aiEditLoading || !aiEditPrompt.trim()} className="w-full gap-2">
                  {aiEditLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Aplicando alterações...</> : <><Wand2 className="h-4 w-4" />Aplicar com IA</>}
                </Button>
                {aiEditPreview && (
                  <AiPreviewCard preview={aiEditPreview} onDiscard={() => setAiEditPreview(null)} onConfirm={handleAiEditConfirm} confirmLabel="Salvar alterações" />
                )}
              </div>
            </DialogContent>
          </Dialog>

          {tools.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <Calculator className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">{t("admin.noTools")}</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => setAiDialogOpen(true)} className="gap-2">
                  <Sparkles className="h-4 w-4" />{t("admin.generateAi")}
                </Button>
                <Button onClick={openNew} className="gap-2">
                  <Plus className="h-4 w-4" />{t("admin.createManually")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {tools.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`rounded-lg p-2 ${t.type === "calculadora" ? "bg-primary/10" : "bg-accent/10"}`}>
                      {t.type === "calculadora" ? <Calculator className="h-4 w-4 text-primary" /> : <FlaskConical className="h-4 w-4 text-accent" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        /{t.type === "calculadora" ? "calculadoras" : "simuladores"}/{t.slug}
                        {t.categories && <span className="ml-2">• {(t.categories as any).name}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => toggleActive.mutate({ id: t.id, is_active: !t.is_active })}>
                      {t.is_active ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openAiEdit(t)}>
                      <Wand2 className="h-4 w-4 text-accent" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Remover "${t.name}"?`)) deleteTool.mutate(t.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Invite Tab */}
        <TabsContent value="invite">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Convidar Usuário (Acesso Ilimitado)
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              O usuário convidado receberá um email com link para definir sua senha e terá acesso ilimitado à plataforma.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!inviteEmail.trim()) return;
                setInviteLoading(true);
                try {
                  const { data, error } = await supabase.functions.invoke("invite-user", {
                    body: { email: inviteEmail.trim() },
                  });
                  if (error) throw error;
                  if (data?.error) throw new Error(data.error);
                  toast.success(data.message || "Convite enviado com sucesso!");
                  setInviteEmail("");
                  queryClient.invalidateQueries({ queryKey: ["admin-users"] });
                  queryClient.invalidateQueries({ queryKey: ["admin-invited-users"] });
                } catch (err: any) {
                  toast.error(err.message || "Erro ao enviar convite");
                } finally {
                  setInviteLoading(false);
                }
              }}
              className="flex gap-3"
            >
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="flex-1"
              />
              <Button type="submit" disabled={inviteLoading} className="gap-2">
                {inviteLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Enviando...</>
                ) : (
                  <><Send className="h-4 w-4" />Enviar convite</>
                )}
              </Button>
            </form>
          </div>

          {/* Invited Users List */}
          {invitedUsers.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-6 mt-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Mail className="h-5 w-5 text-muted-foreground" />
                Usuários Convidados ({invitedUsers.length})
              </h3>
              <div className="space-y-2">
                {invitedUsers.map((u: any) => (
                  <div key={u.user_id} className="flex items-center justify-between rounded-xl border border-border p-4">
                    <div className="flex items-center gap-3">
                      <span className={`h-3 w-3 rounded-full shrink-0 ${u.has_logged_in ? "bg-emerald-500" : "bg-destructive"}`} />
                      <div>
                        <p className="font-medium text-sm">{u.email}</p>
                        {u.full_name && <p className="text-xs text-muted-foreground">{u.full_name}</p>}
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${u.has_logged_in ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}>
                      {u.has_logged_in ? "Conta ativa" : "Pendente"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4">{t("admin.registeredUsers")} ({users.length})</h2>
            {users.length === 0 ? (
              <p className="text-muted-foreground">{t("admin.noUsers")}</p>
            ) : (
              <div className="space-y-2">
                {users.map((u: any) => {
                  const roles = (u.user_roles || []).map((r: any) => r.role);
                  const status = u.status || "pending";
                  return (
                    <div key={u.id} className="flex items-center justify-between rounded-xl border border-border p-4 gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{u.full_name || "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground truncate">ID: {u.user_id}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {roles.includes("admin") && (
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent/10 text-accent">Admin</span>
                        )}
                        {u.has_unlimited_access && (
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                            <Infinity className="h-3 w-3" />Ilimitado
                          </span>
                        )}
                        {getStatusBadge(status)}
                        {status === "pending" && (
                          <>
                            <Button size="sm" variant="outline" className="gap-1 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => updateUserStatus.mutate({ userId: u.user_id, status: "approved" })}>
                              <CheckCircle className="h-3.5 w-3.5" />{t("admin.approve")}
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => updateUserStatus.mutate({ userId: u.user_id, status: "inactive" })}>
                              <XCircle className="h-3.5 w-3.5" />{t("admin.reject")}
                            </Button>
                          </>
                        )}
                        {status === "approved" && !roles.includes("admin") && (
                          <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => updateUserStatus.mutate({ userId: u.user_id, status: "inactive" })}>
                            <XCircle className="h-3.5 w-3.5" />{t("admin.deactivate")}
                          </Button>
                        )}
                        {status === "inactive" && (
                          <Button size="sm" variant="outline" className="gap-1 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => updateUserStatus.mutate({ userId: u.user_id, status: "approved" })}>
                            <CheckCircle className="h-3.5 w-3.5" />{t("admin.activate")}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4">{t("admin.contactMessages")} ({contactMessages.length})</h2>
            {contactMessages.length === 0 ? (
              <p className="text-muted-foreground">{t("admin.noMessages")}</p>
            ) : (
              <div className="space-y-3">
                {contactMessages.map((msg: any) => (
                  <div key={msg.id} className={`rounded-xl border p-4 transition-colors ${msg.is_read ? "border-border bg-card" : "border-primary/20 bg-primary/5"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {!msg.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                          <p className="font-semibold text-sm">{msg.subject}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {msg.name} · {msg.email} · {new Date(msg.created_at).toLocaleString("pt-BR")}
                        </p>
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap">{msg.message}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => toggleMessageRead.mutate({ id: msg.id, is_read: !msg.is_read })} title={msg.is_read ? t("admin.markUnread") : t("admin.markRead")}>
                          {msg.is_read ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm("Excluir esta mensagem?")) deleteMessage.mutate(msg.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4">{t("admin.recentAccess")}</h2>
            {usageLogs.length === 0 ? (
              <p className="text-muted-foreground">{t("admin.noUsage")}</p>
            ) : (
              <div className="space-y-2">
                {usageLogs.map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                    <span className="font-medium">{log.tools?.name || t("admin.removedTool")}</span>
                    <span className="text-muted-foreground">{new Date(log.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Shared AI Preview Card ─── */
function AiPreviewCard({ preview, onDiscard, onConfirm, confirmLabel }: {
  preview: any;
  onDiscard: () => void;
  onConfirm: () => void;
  confirmLabel: string;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-5">
      <div className="flex items-center gap-2 text-primary font-semibold">
        <Sparkles className="h-4 w-4" />
        Prévia gerada pela IA
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Nome</p>
        <p className="font-semibold">{preview.name}</p>
      </div>
      {preview.category_name && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Categoria</p>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">{preview.category_name}</span>
        </div>
      )}
      <div>
        <p className="text-xs text-muted-foreground mb-1">Descrição</p>
        <p className="text-sm text-muted-foreground">{preview.short_description}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Campos ({preview.fields?.length || 0})</p>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {preview.fields?.map((f: any, i: number) => (
            <div key={i} className="text-sm rounded-lg bg-secondary/50 px-3 py-2 flex justify-between">
              <span>{f.label} {f.section && <span className="text-muted-foreground text-xs ml-1">({f.section})</span>}</span>
              <span className="text-muted-foreground text-xs">{f.type}{f.unit ? ` · ${f.unit}` : ""}</span>
            </div>
          ))}
        </div>
      </div>
      {preview.formula?.interpretation && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Faixas de Interpretação</p>
          <div className="space-y-1">
            {preview.formula.interpretation.map((int: any, i: number) => (
              <div key={i} className="text-sm rounded-lg bg-secondary/50 px-3 py-2 flex items-center gap-2">
                {int.color && <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: int.color }} />}
                <span className="font-medium">{int.label}</span>
                <span className="text-muted-foreground ml-auto">{int.range}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onDiscard} className="flex-1">Descartar</Button>
        <Button onClick={onConfirm} className="flex-1 gap-2">
          <Save className="h-4 w-4" />
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
