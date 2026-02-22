import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useCallback, useMemo } from "react";
import { Calculator, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Json } from "@/integrations/supabase/types";
import jsPDF from "jspdf";

/* ─── Types (duplicated from ToolDetail for isolation) ─── */
interface ToolField {
  name: string; label: string;
  type: "number" | "select" | "switch" | "checkbox" | "text";
  unit?: string; options?: { value: string; label: string }[];
  required?: boolean; defaultValue?: string; section?: string;
}
interface Interpretation {
  range: string; label: string; description: string; color?: string; recommendations?: string[];
}
interface ToolFormula {
  expression: string; interpretation: Interpretation[];
}

function parseFields(raw: Json | null): ToolField[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw as unknown as ToolField[];
}
function parseFormula(raw: Json | null): ToolFormula | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as unknown as ToolFormula;
}
function groupBySection(fields: ToolField[]): { title: string; fields: ToolField[] }[] {
  const map = new Map<string, ToolField[]>();
  for (const f of fields) {
    const section = f.section || "Dados";
    if (!map.has(section)) map.set(section, []);
    map.get(section)!.push(f);
  }
  return Array.from(map.entries()).map(([title, fields]) => ({ title, fields }));
}

function gerarPDF(toolName: string, values: Record<string, string>, fields: ToolField[], result: Interpretation | null) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;
  doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text(toolName, w / 2, y, { align: "center" }); y += 7;
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text("Relatório Individual", w / 2, y, { align: "center" }); y += 5;
  doc.text("Posologia Produções", w / 2, y, { align: "center" }); y += 10;
  doc.setDrawColor(200); doc.line(14, y, w - 14, y); y += 8;
  doc.setFont("helvetica", "bold"); doc.text("Dados Preenchidos:", 14, y); y += 6;
  doc.setFont("helvetica", "normal");
  for (const f of fields) {
    const val = values[f.name]; if (!val && val !== "0") continue;
    let display = val;
    if (f.type === "switch" || f.type === "checkbox") display = val === "1" || val === "true" ? "Sim" : "Não";
    if (f.type === "select" && f.options) { const opt = f.options.find(o => o.value === val); if (opt) display = opt.label; }
    doc.text(`• ${f.label}${f.unit ? ` (${f.unit})` : ""}: ${display}`, 18, y); y += 5;
    if (y > 270) { doc.addPage(); y = 20; }
  }
  if (result) {
    y += 5; doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text(`Resultado: ${result.label}`, 14, y); y += 6;
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(result.description, 18, y); y += 8;
    if (result.recommendations?.length) {
      doc.setFont("helvetica", "bold"); doc.text("Recomendações:", 14, y); y += 6;
      doc.setFont("helvetica", "normal");
      for (const r of result.recommendations) {
        const lines = doc.splitTextToSize(`• ${r}`, w - 32); doc.text(lines, 18, y); y += lines.length * 5 + 2;
        if (y > 270) { doc.addPage(); y = 20; }
      }
    }
  }
  y += 10; doc.setFontSize(8); doc.setTextColor(130);
  doc.text("Este relatório é uma estimativa e não substitui avaliação médica presencial.", 14, y);
  doc.save(`relatorio-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export default function EmbedTool() {
  const { token } = useParams<{ token: string }>();
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Interpretation | null>(null);
  const [calculated, setCalculated] = useState(false);
  const [calculatedScore, setCalculatedScore] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["embed-tool", token],
    queryFn: async () => {
      // Use edge function to verify share is active AND user still has premium
      const { data: result, error: fnErr } = await supabase.functions.invoke("verify-share", {
        body: { share_token: token },
      });
      if (fnErr) throw new Error("Erro ao verificar link");
      if (!result?.active) throw new Error(result?.reason || "Link inativo");
      return result;
    },
    enabled: !!token,
  });

  const tool = data?.tool as any;
  const fields = tool ? parseFields(tool.fields) : [];
  const formula = tool ? parseFormula(tool.formula) : null;
  const isSimulator = formula && (formula as any).type === "simulator";

  const sections = useMemo(() => {
    const grouped = groupBySection(fields);
    return grouped.map(s => ({
      ...s,
      regularFields: s.fields.filter(f => f.type !== "switch" && f.type !== "checkbox"),
      switchFields: s.fields.filter(f => f.type === "switch" || f.type === "checkbox"),
    }));
  }, [fields]);

  const handleChange = useCallback((name: string, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }));
    setCalculated(false);
    setResult(null);
  }, []);

  const evaluateFormula = useCallback((expression: string, vals: Record<string, string>, fieldsList: ToolField[]): number => {
    const context: Record<string, number> = {};
    for (const f of fieldsList) {
      const raw = vals[f.name];
      if (f.type === "switch" || f.type === "checkbox") context[f.name] = (raw === "1" || raw === "true") ? 1 : 0;
      else context[f.name] = parseFloat(raw || "0") || 0;
    }
    try {
      const keys = Object.keys(context);
      const vals2 = Object.values(context);
      const fn = new Function(...keys, `"use strict"; return (${expression});`);
      const r = fn(...vals2);
      if (typeof r === "number" && !isNaN(r)) return r;
    } catch { /* fall through */ }
    return Object.values(context).reduce((s, v) => s + v, 0);
  }, []);

  const matchInterpretation = useCallback((score: number, interpretations: Interpretation[]): Interpretation | null => {
    for (const interp of interpretations) {
      const range = interp.range;
      const rangeMatch = range.match(/(\d+)\s*[-–a]\s*(\d+)/);
      const gteMatch = range.match(/>=?\s*(\d+)/);
      const lteMatch = range.match(/<=?\s*(\d+)/);
      const exactMatch = range.match(/^(\d+)(?:\s|$|[^-\d])/);
      if (rangeMatch) { if (score >= parseInt(rangeMatch[1]) && score <= parseInt(rangeMatch[2])) return interp; }
      else if (gteMatch) { if (score >= parseInt(gteMatch[1])) return interp; }
      else if (lteMatch) { if (score <= parseInt(lteMatch[1])) return interp; }
      else if (exactMatch) { if (score === parseInt(exactMatch[1])) return interp; }
      else { const num = parseInt(range); if (!isNaN(num) && score === num) return interp; }
    }
    return interpretations.length > 0 ? interpretations[interpretations.length - 1] : null;
  }, []);

  const handleCalculate = () => {
    const missing = fields.filter(f => f.required && f.type !== "switch" && f.type !== "checkbox" && !values[f.name]);
    if (missing.length) return;
    setCalculated(true);
    if (formula) {
      const score = evaluateFormula(formula.expression, values, fields);
      setCalculatedScore(score);
      if (formula.interpretation?.length) setResult(matchInterpretation(score, formula.interpretation));
    }
  };

  const handleReset = () => { setValues({}); setResult(null); setCalculated(false); setCalculatedScore(null); };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="h-8 w-48 bg-muted animate-pulse rounded" />
    </div>
  );

  if (error || !tool) return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="text-center">
        <Calculator className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">Este link de compartilhamento não está mais ativo.</p>
      </div>
    </div>
  );

  if (isSimulator) return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="text-center">
        <p className="text-muted-foreground">Simuladores não podem ser incorporados via embed.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="rounded-2xl border border-border bg-card p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5"><Calculator className="h-5 w-5 text-primary" /></div>
            <div>
              <h1 className="text-xl font-bold">{tool.name}</h1>
              {tool.short_description && <p className="text-xs text-muted-foreground">{tool.short_description}</p>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {sections.map((section, si) => (
              <div key={si}>
                {section.regularFields.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-4 mb-4">
                    <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">{section.title}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {section.regularFields.map(field => (
                        <div key={field.name} className="space-y-1">
                          <Label htmlFor={field.name} className="text-sm font-medium">
                            {field.label}{field.unit && <span className="text-muted-foreground ml-1">({field.unit})</span>}
                          </Label>
                          {field.type === "number" && <Input id={field.name} type="number" placeholder={field.unit || "Valor"} value={values[field.name] || ""} onChange={e => handleChange(field.name, e.target.value)} className="bg-background" />}
                          {field.type === "text" && <Input id={field.name} type="text" placeholder={field.label} value={values[field.name] || ""} onChange={e => handleChange(field.name, e.target.value)} className="bg-background" />}
                          {field.type === "select" && field.options && (
                            <Select value={values[field.name] || ""} onValueChange={v => handleChange(field.name, v)}>
                              <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>{field.options.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                            </Select>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {section.switchFields.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {section.switchFields.map(field => (
                        <div key={field.name} className="flex items-center justify-between rounded-lg bg-background p-3">
                          <Label className="cursor-pointer text-sm">{field.label}</Label>
                          <Switch checked={values[field.name] === "1" || values[field.name] === "true"} onCheckedChange={v => handleChange(field.name, v ? "1" : "0")} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div className="flex gap-3">
              <Button size="lg" onClick={handleCalculate} className="gap-2 flex-1 sm:flex-none"><Calculator className="h-4 w-4" />Calcular</Button>
              <Button size="lg" variant="outline" onClick={handleReset}>Limpar</Button>
            </div>
          </div>

          <div className="space-y-4">
            {calculated && result ? (
              <>
                <div className="rounded-2xl border p-4" style={{ borderColor: result.color ? `${result.color}50` : undefined, backgroundColor: result.color ? `${result.color}15` : undefined }}>
                  <p className="text-sm text-muted-foreground mb-1">Resultado</p>
                  {calculatedScore !== null && <p className="text-4xl font-bold mb-1" style={{ color: result.color }}>{calculatedScore}</p>}
                  <p className="text-2xl font-bold" style={{ color: result.color }}>{result.label}</p>
                  <p className="text-sm text-muted-foreground mt-2">{result.description}</p>
                </div>
                {result.recommendations && result.recommendations.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <h3 className="font-semibold mb-2 text-sm">Condutas Sugeridas</h3>
                    <ul className="space-y-2">
                      {result.recommendations.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: result.color || "hsl(var(--primary))" }} />{r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button variant="outline" className="w-full gap-2" onClick={() => gerarPDF(tool.name, values, fields, result)}>
                  <FileText className="h-4 w-4" />Gerar Relatório PDF
                </Button>
              </>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-4 text-center">
                <Calculator className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Preencha os dados e clique em <strong>Calcular</strong>.</p>
              </div>
            )}
            {formula?.interpretation && formula.interpretation.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Escala de Interpretação</h3>
                <div className="space-y-1.5">
                  {formula.interpretation.map((interp, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: interp.color || "hsl(var(--primary))" }} />
                      <span className="font-medium">{interp.label}</span>
                      <span className="text-muted-foreground ml-auto">{interp.range}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Powered by <a href={window.location.origin} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Posologia</a>
        </p>
      </div>
    </div>
  );
}
