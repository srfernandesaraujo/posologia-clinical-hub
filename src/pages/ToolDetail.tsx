import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useCallback } from "react";
import type { Json } from "@/integrations/supabase/types";

interface ToolField {
  name: string;
  label: string;
  type: "number" | "select" | "checkbox";
  unit?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
}

interface Interpretation {
  range: string;
  label: string;
  description: string;
}

interface ToolFormula {
  expression: string;
  interpretation: Interpretation[];
}

function parseFields(raw: Json | null): ToolField[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw as unknown as ToolField[];
}

function parseFormula(raw: Json | null): ToolFormula | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, Json | undefined>;
  if (!obj.expression || !obj.interpretation) return null;
  return obj as unknown as ToolFormula;
}

export default function ToolDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Interpretation | null>(null);
  const [calculated, setCalculated] = useState(false);

  const { data: tool, isLoading } = useQuery({
    queryKey: ["tool", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools")
        .select("*, categories(name)")
        .eq("slug", slug)
        .single();
      if (error) throw error;

      if (user && data) {
        supabase.from("usage_logs").insert({ user_id: user.id, tool_id: data.id });
      }

      return data;
    },
    enabled: !!slug,
  });

  const fields = tool ? parseFields(tool.fields) : [];
  const formula = tool ? parseFormula(tool.formula) : null;

  const handleChange = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setCalculated(false);
    setResult(null);
  }, []);

  const handleCalculate = () => {
    setCalculated(true);
    // Simple interpretation matching — pick the first matching range
    if (formula?.interpretation?.length) {
      // For now, show interpretation based on filled fields
      // A real engine would evaluate `formula.expression`
      setResult(formula.interpretation[0]);
    }
  };

  const handleReset = () => {
    setValues({});
    setResult(null);
    setCalculated(false);
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-4" />
        <div className="h-64 bg-muted animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground mb-4">Ferramenta não encontrada.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      <div className="rounded-2xl border border-border bg-card p-8">
        {tool.categories && (
          <span className="inline-block text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5 mb-4">
            {(tool.categories as any).name}
          </span>
        )}
        <h1 className="text-3xl font-bold mb-2">{tool.name}</h1>

        {/* Short description */}
        {tool.short_description && (
          <p className="text-muted-foreground text-sm mb-6">{tool.short_description}</p>
        )}

        {/* Dynamic calculator form */}
        {fields.length > 0 ? (
          <div className="space-y-5 mb-6">
            {fields.map((field) => (
              <div key={field.name} className="space-y-1.5">
                <Label htmlFor={field.name} className="text-sm font-medium">
                  {field.label}
                  {field.unit && <span className="text-muted-foreground ml-1">({field.unit})</span>}
                  {field.required && <span className="text-destructive ml-0.5">*</span>}
                </Label>

                {field.type === "number" && (
                  <Input
                    id={field.name}
                    type="number"
                    placeholder={`Ex: ${field.unit || "valor"}`}
                    value={values[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className="bg-background"
                  />
                )}

                {field.type === "select" && field.options && (
                  <Select
                    value={values[field.name] || ""}
                    onValueChange={(v) => handleChange(field.name, v)}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {field.type === "checkbox" && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={field.name}
                      checked={values[field.name] === "true"}
                      onCheckedChange={(c) => handleChange(field.name, String(!!c))}
                    />
                    <label htmlFor={field.name} className="text-sm text-muted-foreground cursor-pointer">
                      {field.label}
                    </label>
                  </div>
                )}
              </div>
            ))}

            <div className="flex gap-3 pt-2">
              <Button onClick={handleCalculate} className="gap-2">
                <Calculator className="h-4 w-4" />
                Calcular
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Limpar
              </Button>
            </div>

            {/* Result */}
            {calculated && result && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 mt-4 space-y-2">
                <h3 className="font-semibold text-primary">{result.label}</h3>
                <p className="text-sm text-muted-foreground">{result.description}</p>
              </div>
            )}

            {calculated && !result && formula?.interpretation && (
              <div className="rounded-xl border border-border bg-muted/50 p-5 mt-4">
                <h3 className="font-semibold mb-3">Interpretação dos Resultados</h3>
                <div className="space-y-3">
                  {formula.interpretation.map((interp, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-medium text-primary">{interp.label}</span>
                      <span className="text-muted-foreground ml-2">({interp.range})</span>
                      <p className="text-muted-foreground mt-0.5">{interp.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-muted/50 p-6 mb-6">
            <p className="text-muted-foreground text-center">
              Esta ferramenta não possui campos configurados.
            </p>
          </div>
        )}

        {/* Interpretation guide (always visible) */}
        {formula?.interpretation && formula.interpretation.length > 0 && !calculated && (
          <div className="rounded-xl border border-border bg-muted/30 p-5 mt-2">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Faixas de Interpretação</h3>
            <div className="grid gap-2">
              {formula.interpretation.map((interp, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="font-medium text-primary whitespace-nowrap">{interp.range}</span>
                  <span className="text-muted-foreground">— {interp.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
