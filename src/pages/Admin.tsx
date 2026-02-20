import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield, Plus, Pencil, Trash2, Users, Calculator, BarChart3,
  FlaskConical, X, Save, ToggleLeft, ToggleRight,
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
}

const emptyTool: ToolForm = {
  name: "",
  slug: "",
  type: "calculadora",
  description: "",
  short_description: "",
  category_id: "",
  is_active: true,
};

export default function Admin() {
  const queryClient = useQueryClient();
  const [editingTool, setEditingTool] = useState<(ToolForm & { id?: string }) | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: tools = [] } = useQuery({
    queryKey: ["admin-tools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools")
        .select("*, categories(name)")
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
        .from("profiles")
        .select("*, user_roles(role)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: usageLogs = [] } = useQuery({
    queryKey: ["admin-usage-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usage_logs")
        .select("*, tools(name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const saveTool = useMutation({
    mutationFn: async (tool: ToolForm & { id?: string }) => {
      const payload = {
        name: tool.name,
        slug: tool.slug,
        type: tool.type,
        description: tool.description,
        short_description: tool.short_description,
        category_id: tool.category_id || null,
        is_active: tool.is_active,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tools"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const openNew = () => {
    setEditingTool({ ...emptyTool });
    setDialogOpen(true);
  };

  const openEdit = (tool: any) => {
    setEditingTool({
      id: tool.id,
      name: tool.name,
      slug: tool.slug,
      type: tool.type,
      description: tool.description || "",
      short_description: tool.short_description || "",
      category_id: tool.category_id || "",
      is_active: tool.is_active,
    });
    setDialogOpen(true);
  };

  const calculadoras = tools.filter((t: any) => t.type === "calculadora");
  const simuladores = tools.filter((t: any) => t.type === "simulador");

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold">Painel Administrativo</h1>
        </div>
      </div>

      <Tabs defaultValue="tools" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="tools" className="gap-2">
            <Calculator className="h-4 w-4" />
            Ferramentas
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Uso Recente
          </TabsTrigger>
        </TabsList>

        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground mb-1">Total de ferramentas</p>
              <p className="text-3xl font-bold">{tools.length}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground mb-1">Calculadoras</p>
              <p className="text-3xl font-bold text-primary">{calculadoras.length}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground mb-1">Simuladores</p>
              <p className="text-3xl font-bold text-accent">{simuladores.length}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Todas as ferramentas</h2>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNew} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova ferramenta
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingTool?.id ? "Editar ferramenta" : "Nova ferramenta"}
                  </DialogTitle>
                </DialogHeader>
                {editingTool && (
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Nome</Label>
                      <Input
                        value={editingTool.name}
                        onChange={(e) => {
                          const name = e.target.value;
                          setEditingTool({
                            ...editingTool,
                            name,
                            slug: editingTool.id ? editingTool.slug : generateSlug(name),
                          });
                        }}
                        placeholder="Ex: Clearance de Creatinina"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Slug (URL)</Label>
                      <Input
                        value={editingTool.slug}
                        onChange={(e) => setEditingTool({ ...editingTool, slug: e.target.value })}
                        placeholder="clearance-creatinina"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select
                          value={editingTool.type}
                          onValueChange={(v) => setEditingTool({ ...editingTool, type: v as any })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="calculadora">Calculadora</SelectItem>
                            <SelectItem value="simulador">Simulador</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Select
                          value={editingTool.category_id}
                          onValueChange={(v) => setEditingTool({ ...editingTool, category_id: v })}
                        >
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
                      <Input
                        value={editingTool.short_description}
                        onChange={(e) => setEditingTool({ ...editingTool, short_description: e.target.value })}
                        placeholder="Resumo que aparece no card"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição completa</Label>
                      <Textarea
                        value={editingTool.description}
                        onChange={(e) => setEditingTool({ ...editingTool, description: e.target.value })}
                        placeholder="Explicação de como utilizar a ferramenta"
                        rows={4}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button
                        onClick={() => editingTool && saveTool.mutate(editingTool)}
                        disabled={!editingTool?.name || !editingTool?.slug || saveTool.isPending}
                        className="gap-2"
                      >
                        <Save className="h-4 w-4" />
                        {saveTool.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>

          {tools.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <Calculator className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">Nenhuma ferramenta cadastrada ainda.</p>
              <Button onClick={openNew} className="gap-2">
                <Plus className="h-4 w-4" />
                Criar primeira ferramenta
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {tools.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`rounded-lg p-2 ${t.type === "calculadora" ? "bg-primary/10" : "bg-accent/10"}`}>
                      {t.type === "calculadora" ? (
                        <Calculator className="h-4 w-4 text-primary" />
                      ) : (
                        <FlaskConical className="h-4 w-4 text-accent" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        /{t.type === "calculadora" ? "calculadoras" : "simuladores"}/{t.slug}
                        {t.categories && <span className="ml-2">• {(t.categories as any).name}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleActive.mutate({ id: t.id, is_active: !t.is_active })}
                      title={t.is_active ? "Desativar" : "Ativar"}
                    >
                      {t.is_active ? (
                        <ToggleRight className="h-5 w-5 text-primary" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Remover "${t.name}"?`)) deleteTool.mutate(t.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4">Usuários cadastrados ({users.length})</h2>
            {users.length === 0 ? (
              <p className="text-muted-foreground">Nenhum usuário cadastrado.</p>
            ) : (
              <div className="space-y-2">
                {users.map((u: any) => {
                  const roles = (u.user_roles || []).map((r: any) => r.role);
                  return (
                    <div key={u.id} className="flex items-center justify-between rounded-xl border border-border p-4">
                      <div>
                        <p className="font-medium">{u.full_name || "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground">ID: {u.user_id}</p>
                      </div>
                      <div className="flex gap-2">
                        {roles.includes("admin") && (
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent/10 text-accent">
                            Admin
                          </span>
                        )}
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                          Usuário
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4">Últimos acessos a ferramentas</h2>
            {usageLogs.length === 0 ? (
              <p className="text-muted-foreground">Nenhum registro de uso ainda.</p>
            ) : (
              <div className="space-y-2">
                {usageLogs.map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                    <span className="font-medium">{log.tools?.name || "Ferramenta removida"}</span>
                    <span className="text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </span>
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
