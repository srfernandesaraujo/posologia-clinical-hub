import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, PenLine, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface CreateToolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "calculadora" | "simulador";
}

type Step = "choose" | "auto" | "manual";

const CATEGORIES = ["Cardiologia", "Emergência", "Endocrinologia", "Nefrologia", "Neurologia", "Pneumologia"];

export function CreateToolDialog({ open, onOpenChange, type }: CreateToolDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("choose");
  const [loading, setLoading] = useState(false);

  // Auto mode
  const [autoPrompt, setAutoPrompt] = useState("");

  // Manual mode
  const [manualName, setManualName] = useState("");
  const [manualSlug, setManualSlug] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualCategory, setManualCategory] = useState("");

  const label = type === "calculadora" ? "Calculadora" : "Simulador";

  const reset = () => {
    setStep("choose");
    setAutoPrompt("");
    setManualName("");
    setManualSlug("");
    setManualDescription("");
    setManualCategory("");
    setLoading(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleAutoCreate = async () => {
    if (!autoPrompt.trim() || !user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-tool", {
        body: { prompt: autoPrompt, type },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const tool = data.tool;

      // Find or skip category
      let categoryId: string | null = null;
      if (tool.category_name) {
        const { data: cats } = await supabase
          .from("categories")
          .select("id")
          .ilike("name", tool.category_name)
          .limit(1);
        if (cats?.length) categoryId = cats[0].id;
      }

      const { error: insertError } = await supabase.from("tools").insert({
        name: tool.name,
        slug: tool.slug,
        type,
        description: tool.description,
        short_description: tool.short_description,
        fields: tool.fields,
        formula: tool.formula,
        category_id: categoryId,
        created_by: user.id,
        is_active: true,
        is_marketplace: false,
      });

      if (insertError) throw insertError;

      toast.success(`${label} "${tool.name}" criada com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      queryClient.invalidateQueries({ queryKey: ["user-tools"] });
      handleClose(false);
    } catch (e: any) {
      toast.error(e.message || `Erro ao criar ${label.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  const handleManualCreate = async () => {
    if (!manualName.trim() || !user) return;
    setLoading(true);
    try {
      const slug = manualSlug.trim() || manualName.toLowerCase().replace(/[^a-z0-9]/gi, "-").replace(/-+/g, "-");

      let categoryId: string | null = null;
      if (manualCategory) {
        const { data: cats } = await supabase
          .from("categories")
          .select("id")
          .ilike("name", manualCategory)
          .limit(1);
        if (cats?.length) categoryId = cats[0].id;
      }

      const { error: insertError } = await supabase.from("tools").insert({
        name: manualName,
        slug,
        type,
        description: manualDescription || null,
        short_description: manualDescription?.slice(0, 100) || null,
        fields: [],
        formula: {},
        category_id: categoryId,
        created_by: user.id,
        is_active: true,
        is_marketplace: false,
      });

      if (insertError) throw insertError;

      toast.success(`${label} "${manualName}" criada com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      queryClient.invalidateQueries({ queryKey: ["user-tools"] });
      handleClose(false);
    } catch (e: any) {
      toast.error(e.message || `Erro ao criar ${label.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar {label}</DialogTitle>
        </DialogHeader>

        {step === "choose" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <button
              onClick={() => setStep("auto")}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all text-center"
            >
              <div className="rounded-full bg-primary/10 p-3">
                <Wand2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Criar com IA</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Descreva o que deseja e a IA cria automaticamente
                </p>
              </div>
            </button>
            <button
              onClick={() => setStep("manual")}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all text-center"
            >
              <div className="rounded-full bg-secondary p-3">
                <PenLine className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <p className="font-semibold">Criar Manualmente</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Preencha todos os campos para criar a {label.toLowerCase()}
                </p>
              </div>
            </button>
          </div>
        )}

        {step === "auto" && (
          <div className="space-y-4 py-2">
            <button onClick={() => setStep("choose")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar
            </button>
            <div className="space-y-2">
              <Label>O que essa {label.toLowerCase()} deve fazer?</Label>
              <Textarea
                placeholder={type === "calculadora"
                  ? "Ex: Calculadora de clearance de creatinina usando a fórmula de Cockcroft-Gault..."
                  : "Ex: Simulador de manejo de sepse com escolha de antibióticos e monitoramento de lactato..."
                }
                value={autoPrompt}
                onChange={(e) => setAutoPrompt(e.target.value)}
                rows={4}
              />
            </div>
            <Button onClick={handleAutoCreate} disabled={loading || !autoPrompt.trim()} className="w-full gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "Gerando com IA..." : `Gerar ${label}`}
            </Button>
          </div>
        )}

        {step === "manual" && (
          <div className="space-y-4 py-2">
            <button onClick={() => setStep("choose")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar
            </button>
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                placeholder={`Nome da ${label.toLowerCase()}`}
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Slug (URL)</Label>
              <Input
                placeholder="ex: minha-calculadora"
                value={manualSlug}
                onChange={(e) => setManualSlug(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder={`Descreva a ${label.toLowerCase()}...`}
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={manualCategory} onValueChange={setManualCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleManualCreate} disabled={loading || !manualName.trim()} className="w-full gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
              {loading ? "Criando..." : `Criar ${label}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
