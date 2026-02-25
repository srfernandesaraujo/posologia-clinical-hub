import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Key, Eye, EyeOff, Trash2, Loader2, Plus, ExternalLink, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface ApiKeyRow {
  id: string;
  provider: string;
  api_key: string;
  is_active: boolean;
  display_name: string;
  base_url: string | null;
  model: string | null;
  priority: number;
}

const PROVIDERS = [
  { value: "groq", label: "Groq", docsUrl: "https://console.groq.com/keys", defaultModel: "llama-3.3-70b-versatile" },
  { value: "openai", label: "OpenAI", docsUrl: "https://platform.openai.com/api-keys", defaultModel: "gpt-4o-mini" },
  { value: "anthropic", label: "Anthropic", docsUrl: "https://console.anthropic.com/settings/keys", defaultModel: "claude-sonnet-4-20250514" },
  { value: "openrouter", label: "OpenRouter", docsUrl: "https://openrouter.ai/keys", defaultModel: "google/gemini-2.5-flash" },
  { value: "google", label: "Google AI", docsUrl: "https://aistudio.google.com/apikey", defaultModel: "gemini-2.5-flash" },
];

function maskKey(key: string) {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 4) + "•".repeat(Math.min(8, key.length - 8)) + key.slice(-4);
}

export default function AdminApiKeys() {
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newProvider, setNewProvider] = useState("groq");
  const [newApiKey, setNewApiKey] = useState("");
  const [newModel, setNewModel] = useState("");
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data: apiKeys = [], isLoading } = useQuery({
    queryKey: ["admin-ai-api-keys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_api_keys")
        .select("*")
        .order("priority", { ascending: true });
      if (error) throw error;
      return data as ApiKeyRow[];
    },
  });

  const addKey = useMutation({
    mutationFn: async () => {
      const provider = PROVIDERS.find(p => p.value === newProvider)!;
      const { error } = await supabase.from("ai_api_keys").insert({
        provider: newProvider,
        api_key: newApiKey.trim(),
        display_name: provider.label,
        model: newModel.trim() || null,
        priority: apiKeys.length,
        is_active: true,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ai-api-keys"] });
      toast.success("Chave de API adicionada!");
      setAddDialogOpen(false);
      setNewApiKey("");
      setNewModel("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateKey = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase.from("ai_api_keys").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ai-api-keys"] });
      setEditingId(null);
      setEditValue("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteKey = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_api_keys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ai-api-keys"] });
      toast.success("Chave removida.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleVisible = (id: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const startEdit = (key: ApiKeyRow) => {
    setEditingId(key.id);
    setEditValue(key.api_key);
  };

  const saveEdit = (id: string) => {
    if (editValue.trim()) {
      updateKey.mutate({ id, updates: { api_key: editValue.trim() } });
      toast.success("Chave atualizada!");
    }
  };

  const providerInfo = PROVIDERS.find(p => p.value === newProvider);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          API Keys externas
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure as API Keys das suas LLMs favoritas. Elas serão usadas em todas as chamadas de IA do sistema.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Se nenhuma chave estiver configurada, o sistema usará o modelo padrão da plataforma. Se a chamada com sua chave falhar, o sistema fará fallback automático.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((key) => {
            const provider = PROVIDERS.find(p => p.value === key.provider);
            const isVisible = visibleKeys.has(key.id);
            const isEditing = editingId === key.id;

            return (
              <div
                key={key.id}
                className={`rounded-xl border p-5 transition-colors ${
                  key.is_active ? "border-primary/20 bg-card" : "border-border bg-card/50 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Key className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{key.display_name}</span>
                    {key.model && (
                      <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                        {key.model}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {provider && (
                      <a
                        href={provider.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        Adquira sua chave de API <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <Switch
                      checked={key.is_active}
                      onCheckedChange={(checked) => updateKey.mutate({ id: key.id, updates: { is_active: checked } })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 font-mono text-sm"
                      placeholder="Cole aqui sua API Key"
                      autoFocus
                    />
                  ) : (
                    <div className="flex-1 rounded-lg bg-secondary/50 px-4 py-2.5 font-mono text-sm text-muted-foreground">
                      {isVisible ? key.api_key : maskKey(key.api_key)}
                    </div>
                  )}

                  {!isEditing && (
                    <Button variant="ghost" size="icon" onClick={() => toggleVisible(key.id)}>
                      {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  )}

                  {isEditing ? (
                    <Button variant="outline" size="sm" onClick={() => saveEdit(key.id)}>
                      Salvar
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => startEdit(key)}>
                      Editar
                    </Button>
                  )}

                  {!isEditing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { if (confirm(`Remover chave ${key.display_name}?`)) deleteKey.mutate(key.id); }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add new key */}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2 border-dashed border-primary/30 text-primary hover:bg-primary/5">
                <Plus className="h-4 w-4" />
                Adicionar provedor de IA
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" />
                  Adicionar API Key
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Provedor</Label>
                  <Select value={newProvider} onValueChange={setNewProvider}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {providerInfo && (
                  <a
                    href={providerInfo.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Adquira sua chave de API no {providerInfo.label} <ExternalLink className="h-3 w-3" />
                  </a>
                )}

                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                    placeholder="Cole aqui sua API Key"
                    className="font-mono text-sm"
                    type="password"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Modelo (opcional)</Label>
                  <Input
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    placeholder={providerInfo?.defaultModel || "Modelo padrão será usado"}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Deixe vazio para usar o modelo padrão: {providerInfo?.defaultModel}
                  </p>
                </div>

                <Button
                  onClick={() => addKey.mutate()}
                  disabled={!newApiKey.trim() || addKey.isPending}
                  className="w-full gap-2"
                >
                  {addKey.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
