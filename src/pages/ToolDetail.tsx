import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Calculator, FileText, Stethoscope, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useState, useCallback, useMemo } from "react";
import type { Json } from "@/integrations/supabase/types";
import jsPDF from "jspdf";

/* ─── Types ─── */
interface ToolField {
  name: string;
  label: string;
  type: "number" | "select" | "switch" | "checkbox" | "text";
  unit?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  defaultValue?: string;
  section?: string;
}

interface Interpretation {
  range: string;
  label: string;
  description: string;
  color?: string;
  recommendations?: string[];
}

interface ToolFormula {
  expression: string;
  interpretation: Interpretation[];
  sections?: { title: string; fields: any[] }[];
}

type Modo = "pro" | "paciente";

/* ─── Parsers ─── */
function parseFields(raw: Json | null): ToolField[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw as unknown as ToolField[];
}

function parseFormula(raw: Json | null): ToolFormula | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as unknown as ToolFormula;
}

/* ─── Group fields by section ─── */
function groupBySection(fields: ToolField[]): { title: string; fields: ToolField[] }[] {
  const map = new Map<string, ToolField[]>();
  for (const f of fields) {
    const section = f.section || "Dados";
    if (!map.has(section)) map.set(section, []);
    map.get(section)!.push(f);
  }
  return Array.from(map.entries()).map(([title, fields]) => ({ title, fields }));
}

/* ─── PDF ─── */
function gerarPDF(toolName: string, values: Record<string, string>, fields: ToolField[], result: Interpretation | null) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(toolName, w / 2, y, { align: "center" });
  y += 7;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Relatório Individual", w / 2, y, { align: "center" });
  y += 5;
  doc.text("Autor: Sérgio Araújo • Posologia Produções", w / 2, y, { align: "center" });
  y += 10;
  doc.setDrawColor(200);
  doc.line(14, y, w - 14, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.text("Dados Preenchidos:", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");

  for (const f of fields) {
    const val = values[f.name];
    if (!val && val !== "0") continue;
    let display = val;
    if (f.type === "switch" || f.type === "checkbox") display = val === "1" || val === "true" ? "Sim" : "Não";
    if (f.type === "select" && f.options) {
      const opt = f.options.find(o => o.value === val);
      if (opt) display = opt.label;
    }
    const line = `• ${f.label}${f.unit ? ` (${f.unit})` : ""}: ${display}`;
    doc.text(line, 18, y);
    y += 5;
    if (y > 270) { doc.addPage(); y = 20; }
  }

  if (result) {
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Resultado: ${result.label}`, 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(result.description, 18, y);
    y += 8;

    if (result.recommendations?.length) {
      doc.setFont("helvetica", "bold");
      doc.text("Recomendações:", 14, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      for (const r of result.recommendations) {
        const lines = doc.splitTextToSize(`• ${r}`, w - 32);
        doc.text(lines, 18, y);
        y += lines.length * 5 + 2;
        if (y > 270) { doc.addPage(); y = 20; }
      }
    }
  }

  y += 10;
  doc.setFontSize(8);
  doc.setTextColor(130);
  doc.text("Este relatório é uma estimativa e não substitui avaliação médica presencial.", 14, y);
  y += 4;
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, y);

  doc.save(`relatorio-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* ─── Component ─── */
export default function ToolDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Interpretation | null>(null);
  const [calculated, setCalculated] = useState(false);
  const [modo, setModo] = useState<Modo>("pro");

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
  const sections = useMemo(() => groupBySection(fields), [fields]);

  // Separate switch fields into their own section at the end
  const inputSections = useMemo(() => {
    return sections.map(s => ({
      ...s,
      regularFields: s.fields.filter(f => f.type !== "switch" && f.type !== "checkbox"),
      switchFields: s.fields.filter(f => f.type === "switch" || f.type === "checkbox"),
    }));
  }, [sections]);

  const handleChange = useCallback((name: string, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }));
    setCalculated(false);
    setResult(null);
  }, []);

  const handleCalculate = () => {
    // Validate required fields
    const missing = fields.filter(f => f.required && !values[f.name]);
    if (missing.length) {
      return;
    }
    setCalculated(true);
    if (formula?.interpretation?.length) {
      // Show all interpretations for user reference
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
      <div className="max-w-4xl mx-auto">
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

  const toolType = tool.type === "calculadora" ? "Calculadoras" : "Simuladores";
  const backPath = tool.type === "calculadora" ? "/calculadoras" : "/simuladores";

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate(backPath)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar às {toolType}
      </button>

      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3">
              <Calculator className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{tool.name}</h1>
              {tool.short_description && (
                <p className="text-sm text-muted-foreground mt-0.5">{tool.short_description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Modo:</span>
            <button
              onClick={() => setModo("pro")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                modo === "pro" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Stethoscope className="h-3.5 w-3.5" />
              Profissional
            </button>
            <button
              onClick={() => setModo("paciente")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                modo === "paciente" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              Paciente
            </button>
          </div>
        </div>
      </div>

      {fields.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Input sections */}
          <div className="lg:col-span-2 space-y-6">
            {inputSections.map((section, si) => (
              <div key={si}>
                {/* Regular fields in a card */}
                {section.regularFields.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-6 mb-6">
                    <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
                      {section.title}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {section.regularFields.map(field => (
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
                              placeholder={field.unit || "Valor"}
                              value={values[field.name] || ""}
                              onChange={e => handleChange(field.name, e.target.value)}
                              className="bg-background"
                            />
                          )}

                          {field.type === "text" && (
                            <Input
                              id={field.name}
                              type="text"
                              placeholder={field.label}
                              value={values[field.name] || ""}
                              onChange={e => handleChange(field.name, e.target.value)}
                              className="bg-background"
                            />
                          )}

                          {field.type === "select" && field.options && (
                            <Select
                              value={values[field.name] || ""}
                              onValueChange={v => handleChange(field.name, v)}
                            >
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {field.options.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Switch fields in a card */}
                {section.switchFields.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-6">
                    {section.regularFields.length === 0 && (
                      <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
                        {section.title}
                      </h2>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {section.switchFields.map(field => (
                        <div key={field.name} className="flex items-center justify-between rounded-lg bg-background p-3">
                          <Label className="cursor-pointer">{field.label}</Label>
                          <Switch
                            checked={values[field.name] === "1" || values[field.name] === "true"}
                            onCheckedChange={v => handleChange(field.name, v ? "1" : "0")}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Actions */}
            <div className="flex gap-3">
              <Button size="lg" onClick={handleCalculate} className="gap-2 flex-1 sm:flex-none">
                <Calculator className="h-4 w-4" />
                Calcular
              </Button>
              <Button size="lg" variant="outline" onClick={handleReset}>
                Limpar
              </Button>
            </div>
          </div>

          {/* Right: Result & legend */}
          <div className="space-y-6">
            {calculated && result ? (
              <>
                <div
                  className="rounded-2xl border p-6"
                  style={{
                    borderColor: result.color ? `${result.color}50` : undefined,
                    backgroundColor: result.color ? `${result.color}15` : undefined,
                  }}
                >
                  <p className="text-sm text-muted-foreground mb-1">Resultado</p>
                  <p className="text-2xl font-bold" style={{ color: result.color }}>
                    {result.label}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">{result.description}</p>
                </div>

                {result.recommendations && result.recommendations.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <h3 className="font-semibold mb-3">
                      {modo === "pro" ? "Condutas Sugeridas" : "Recomendações para Você"}
                    </h3>
                    <ul className="space-y-2.5">
                      {result.recommendations.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span
                            className="mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: result.color || "hsl(var(--primary))" }}
                          />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => gerarPDF(tool.name, values, fields, result)}
                >
                  <FileText className="h-4 w-4" />
                  Gerar Relatório PDF
                </Button>
              </>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-6 text-center">
                <Calculator className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Preencha os dados e clique em <strong>Calcular</strong> para ver o resultado.
                </p>
              </div>
            )}

            {/* Interpretation scale */}
            {formula?.interpretation && formula.interpretation.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Escala de Interpretação
                </h3>
                <div className="space-y-2">
                  {formula.interpretation.map((interp, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span
                        className="h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: interp.color || "hsl(var(--primary))" }}
                      />
                      <span className="font-medium">{interp.label}</span>
                      <span className="text-muted-foreground ml-auto">{interp.range}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Autor: Sérgio Araújo • Posologia Produções
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-8">
          <div className="rounded-xl border border-border bg-muted/50 p-6 text-center">
            <p className="text-muted-foreground">Esta ferramenta não possui campos configurados.</p>
          </div>
          {tool.description && (
            <p className="text-sm text-muted-foreground mt-4">{tool.description}</p>
          )}
        </div>
      )}
    </div>
  );
}
