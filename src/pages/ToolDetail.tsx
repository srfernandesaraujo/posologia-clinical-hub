import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Calculator, FileText, Trash2, MessageCircleWarning, Loader2, User, Pill, ClipboardCheck, CheckCircle, XCircle, ChevronDown, ChevronUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useCallback, useMemo } from "react";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "sonner";
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
  type?: string;
  patient?: any;
  history?: any;
  prescription?: any[];
  answers?: any[];
}

type PRM_TYPE = "Seguranca" | "Efetividade" | "Indicacao" | "Adesao" | null;
interface UserAnswer {
  hasPRM: boolean | null;
  type: PRM_TYPE;
  suggestion: string;
}

const PRM_LABELS: Record<string, string> = {
  Seguranca: "Segurança",
  Efetividade: "Efetividade",
  Indicacao: "Indicação",
  Adesao: "Adesão",
};

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

/* ══════════════════════════════════════════════════════════════
   SIMULATOR RENDERER (PRM-style interactive case)
   ══════════════════════════════════════════════════════════════ */
function SimulatorRenderer({ formula, toolName, authorName, hasCreator }: {
  formula: ToolFormula;
  toolName: string;
  authorName: string;
  hasCreator: boolean;
}) {
  const [screen, setScreen] = useState<"sim" | "report">("sim");
  const [userAnswers, setUserAnswers] = useState<Record<number, UserAnswer>>({});
  const [selectedDrug, setSelectedDrug] = useState<number | null>(null);
  const [reviewed, setReviewed] = useState<Set<number>>(new Set());
  const [expandedFeedback, setExpandedFeedback] = useState<Set<number>>(new Set());

  const patient = formula.patient;
  const history = formula.history;
  const prescription = formula.prescription || [];
  const answers = formula.answers || [];

  const markReviewed = (i: number) => {
    setReviewed(p => new Set(p).add(i));
    if (!userAnswers[i]) setUserAnswers(p => ({ ...p, [i]: { hasPRM: null, type: null, suggestion: "" } }));
  };

  const allReviewed = prescription.every((_: any, i: number) => reviewed.has(i));

  const getScore = () => {
    const realPRMs = answers.filter((a: any) => a.hasPRM);
    let found = 0;
    const details = answers.map((ans: any) => {
      const ua = userAnswers[ans.drugIndex];
      const correct = ans.hasPRM
        ? (ua?.hasPRM === true && ua?.type === ans.type)
        : (ua?.hasPRM === false || ua?.hasPRM === null);
      if (ans.hasPRM && ua?.hasPRM === true) found++;
      return { ...ans, userAnswer: ua, correct, drug: prescription[ans.drugIndex] };
    });
    return { found, total: realPRMs.length, details };
  };

  if (screen === "report") {
    const { found, total, details } = getScore();
    return (
      <div>
        <Button variant="ghost" onClick={() => { setScreen("sim"); setReviewed(new Set()); setUserAnswers({}); setSelectedDrug(null); }} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />Tentar Novamente
        </Button>
        <Card className="mb-6">
          <CardHeader><CardTitle>Relatório de Desempenho</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <div className="text-5xl font-bold mb-2">{found}/{total}</div>
              <p className="text-muted-foreground">PRMs identificados corretamente</p>
              <div className="w-full bg-muted rounded-full h-3 mt-4 max-w-xs mx-auto">
                <div className="bg-primary rounded-full h-3 transition-all" style={{ width: `${total > 0 ? (found / total) * 100 : 0}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-3">
          {details.map((d: any, i: number) => (
            <Card key={i} className={`border-l-4 ${d.correct ? "border-l-green-500" : d.hasPRM ? "border-l-red-500" : "border-l-muted"}`}>
              <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpandedFeedback(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; })}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {d.correct ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                    <span className="font-semibold">{d.drug?.drug} {d.drug?.dose}</span>
                    {d.hasPRM && <Badge variant="destructive" className="text-xs">PRM: {PRM_LABELS[d.type!] || d.type}</Badge>}
                  </div>
                  {expandedFeedback.has(i) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
              {expandedFeedback.has(i) && (
                <CardContent className="text-sm space-y-2">
                  {d.hasPRM && <div className="bg-muted p-3 rounded"><strong>Justificativa:</strong> {d.justification}</div>}
                  {d.userAnswer && (
                    <div className="text-muted-foreground">
                      <strong>Sua resposta:</strong> {d.userAnswer.hasPRM ? `PRM - ${PRM_LABELS[d.userAnswer.type!] || "Não classificado"}` : "Sem PRM"}
                      {d.userAnswer.suggestion && <p className="mt-1"><strong>Intervenção sugerida:</strong> {d.userAnswer.suggestion}</p>}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-6">
          Autor: {authorName}{!hasCreator && " • Posologia Produções"}
        </p>
      </div>
    );
  }

  // Simulation screen
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{toolName}</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Patient profile */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" />Perfil do Paciente</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p><strong>{patient?.name}</strong></p>
            <p>{patient?.age} anos | {patient?.sex} | {patient?.weight}kg | {patient?.height}cm</p>
            <Separator />
            <p className="font-medium">Doenças:</p>
            <ul className="list-disc list-inside">
              {history?.diseases?.map((d: string, i: number) => <li key={i}>{d}</li>)}
            </ul>
            <p><strong>Queixa:</strong> {history?.mainComplaint}</p>
            {history?.allergies?.length > 0 && (
              <p className="text-red-600"><strong>Alergias:</strong> {history.allergies.join(", ")}</p>
            )}
            {history?.creatinineClearance != null && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="flex items-center gap-1"><strong>ClCr:</strong> {history.creatinineClearance} mL/min <Info className="h-3 w-3" /></p>
                </TooltipTrigger>
                <TooltipContent>Clearance de Creatinina estimado</TooltipContent>
              </Tooltip>
            )}
            {history?.vitalSigns && (
              <>
                <Separator />
                <p className="font-medium">Sinais Vitais:</p>
                {history.vitalSigns.bp && <p>PA: {history.vitalSigns.bp}</p>}
                {history.vitalSigns.hr && <p>FC: {history.vitalSigns.hr}</p>}
                {history.vitalSigns.temp && <p>Temp: {history.vitalSigns.temp}</p>}
                {history.vitalSigns.spo2 && <p>SpO2: {history.vitalSigns.spo2}</p>}
              </>
            )}
          </CardContent>
        </Card>

        {/* Prescription */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><Pill className="h-4 w-4" />Prescrição Médica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {prescription.map((p: any, i: number) => (
              <div
                key={i}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedDrug === i
                    ? "ring-2 ring-primary border-primary"
                    : reviewed.has(i)
                    ? "border-green-300 bg-green-50 dark:bg-green-950/20"
                    : "hover:border-primary/50"
                }`}
                onClick={() => { setSelectedDrug(i); markReviewed(i); }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{p.drug}</p>
                    <p className="text-xs text-muted-foreground">{p.dose} - {p.route} - {p.frequency}</p>
                  </div>
                  {reviewed.has(i) && <CheckCircle className="h-4 w-4 text-green-500" />}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Analysis panel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="h-4 w-4" />Análise</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDrug !== null ? (
              <div className="space-y-4">
                <p className="font-medium">{prescription[selectedDrug]?.drug}</p>
                <div>
                  <Label className="text-sm">Há algum PRM?</Label>
                  <RadioGroup
                    value={userAnswers[selectedDrug]?.hasPRM === true ? "yes" : userAnswers[selectedDrug]?.hasPRM === false ? "no" : ""}
                    onValueChange={(v) => setUserAnswers(p => ({
                      ...p,
                      [selectedDrug]: { ...p[selectedDrug], hasPRM: v === "yes", type: v === "no" ? null : p[selectedDrug]?.type || null, suggestion: p[selectedDrug]?.suggestion || "" }
                    }))}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id={`prm-yes-${selectedDrug}`} />
                      <Label htmlFor={`prm-yes-${selectedDrug}`}>Sim</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id={`prm-no-${selectedDrug}`} />
                      <Label htmlFor={`prm-no-${selectedDrug}`}>Não</Label>
                    </div>
                  </RadioGroup>
                </div>

                {userAnswers[selectedDrug]?.hasPRM && (
                  <div>
                    <Label className="text-sm">Tipo do PRM</Label>
                    <RadioGroup
                      value={userAnswers[selectedDrug]?.type || ""}
                      onValueChange={(v) => setUserAnswers(p => ({
                        ...p,
                        [selectedDrug]: { ...p[selectedDrug], type: v as PRM_TYPE }
                      }))}
                      className="mt-2"
                    >
                      {Object.entries(PRM_LABELS).map(([key, label]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <RadioGroupItem value={key} id={`type-${key}-${selectedDrug}`} />
                          <Label htmlFor={`type-${key}-${selectedDrug}`}>{label}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                {userAnswers[selectedDrug]?.hasPRM && (
                  <div>
                    <Label className="text-sm">Sugestão de intervenção</Label>
                    <Textarea
                      placeholder="Descreva a intervenção sugerida..."
                      value={userAnswers[selectedDrug]?.suggestion || ""}
                      onChange={(e) => setUserAnswers(p => ({
                        ...p,
                        [selectedDrug]: { ...p[selectedDrug], suggestion: e.target.value }
                      }))}
                      rows={3}
                      className="mt-2"
                    />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">
                Clique em um medicamento para avaliar
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Finalize button */}
      <div className="flex justify-end mt-6">
        <Button
          size="lg"
          className="gap-2"
          disabled={!allReviewed}
          onClick={() => setScreen("report")}
        >
          <ClipboardCheck className="h-4 w-4" />
          Finalizar Avaliação
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">
        Autor: {authorName}{!hasCreator && " • Posologia Produções"}
      </p>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */
export default function ToolDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Interpretation | null>(null);
  const [calculated, setCalculated] = useState(false);
  const [fixDialogOpen, setFixDialogOpen] = useState(false);
  const [fixDescription, setFixDescription] = useState("");
  const [fixLoading, setFixLoading] = useState(false);
  const [calculatedScore, setCalculatedScore] = useState<number | null>(null);

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

  const isOwner = tool?.created_by && user?.id === tool.created_by;

  const { data: authorProfile } = useQuery({
    queryKey: ["author-profile", tool?.created_by],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", tool!.created_by!)
        .single();
      return data;
    },
    enabled: !!tool?.created_by,
  });

  const authorName = tool?.created_by ? (authorProfile?.full_name || "Usuário") : "Sérgio Araújo";

  const handleDelete = async () => {
    if (!tool || !isOwner) return;
    if (!confirm("Tem certeza que deseja excluir esta ferramenta?")) return;
    const { error } = await supabase.from("tools").delete().eq("id", tool.id);
    if (error) {
      toast.error("Erro ao excluir ferramenta");
    } else {
      toast.success("Ferramenta excluída com sucesso");
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      queryClient.invalidateQueries({ queryKey: ["user-tools"] });
      navigate(tool.type === "calculadora" ? "/calculadoras" : "/simuladores");
    }
  };

  const handleFixWithAI = async () => {
    if (!fixDescription.trim() || !tool) return;
    setFixLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-tool", {
        body: {
          prompt: fixDescription,
          type: tool.type,
          mode: "edit",
          existingTool: {
            name: tool.name,
            description: tool.description,
            short_description: tool.short_description,
            fields: tool.fields,
            formula: tool.formula,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const updated = data.tool;
      if (!updated) throw new Error("A IA não retornou dados válidos para a correção");

      const { error: updateError } = await supabase.from("tools").update({
        fields: updated.fields,
        formula: updated.formula,
        description: updated.description || tool.description,
        short_description: updated.short_description || tool.short_description,
      }).eq("id", tool.id);

      if (updateError) throw updateError;

      setValues({});
      setResult(null);
      setCalculated(false);
      setCalculatedScore(null);

      await queryClient.refetchQueries({ queryKey: ["tool", slug] });

      toast.success("Ferramenta corrigida com sucesso!");
      setFixDialogOpen(false);
      setFixDescription("");
    } catch (e: any) {
      console.error("Fix with AI error:", e);
      toast.error(e.message || "Erro ao corrigir com IA");
    } finally {
      setFixLoading(false);
    }
  };

  const fields = tool ? parseFields(tool.fields) : [];
  const formula = tool ? parseFormula(tool.formula) : null;
  const sections = useMemo(() => groupBySection(fields), [fields]);
  const isSimulatorType = formula?.type === "simulator";

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

  const evaluateFormula = useCallback((expression: string, vals: Record<string, string>, fieldsList: ToolField[]): number => {
    const context: Record<string, number> = {};
    for (const f of fieldsList) {
      const raw = vals[f.name];
      if (f.type === "switch" || f.type === "checkbox") {
        context[f.name] = (raw === "1" || raw === "true") ? 1 : 0;
      } else {
        context[f.name] = parseFloat(raw || "0") || 0;
      }
    }

    try {
      const keys = Object.keys(context);
      const vals2 = Object.values(context);
      const fn = new Function(...keys, `"use strict"; return (${expression});`);
      const result = fn(...vals2);
      if (typeof result === "number" && !isNaN(result)) return result;
    } catch { /* fall through */ }

    let sum = 0;
    for (const v of Object.values(context)) sum += v;
    return sum;
  }, []);

  const matchInterpretation = useCallback((score: number, interpretations: Interpretation[]): Interpretation | null => {
    for (const interp of interpretations) {
      const range = interp.range;
      const exactMatch = range.match(/^(\d+)(?:\s|$|[^-\d])/);
      const rangeMatch = range.match(/(\d+)\s*[-–a]\s*(\d+)/);
      const gteMatch = range.match(/>=?\s*(\d+)/);
      const lteMatch = range.match(/<=?\s*(\d+)/);

      if (rangeMatch) {
        const low = parseInt(rangeMatch[1]);
        const high = parseInt(rangeMatch[2]);
        if (score >= low && score <= high) return interp;
      } else if (gteMatch) {
        if (score >= parseInt(gteMatch[1])) return interp;
      } else if (lteMatch) {
        if (score <= parseInt(lteMatch[1])) return interp;
      } else if (exactMatch) {
        if (score === parseInt(exactMatch[1])) return interp;
      } else {
        const num = parseInt(range);
        if (!isNaN(num) && score === num) return interp;
      }
    }
    if (interpretations.length > 0) return interpretations[interpretations.length - 1];
    return null;
  }, []);

  const handleCalculate = () => {
    const missing = fields.filter(f => f.required && f.type !== "switch" && f.type !== "checkbox" && !values[f.name]);
    if (missing.length) {
      toast.error(`Preencha os campos obrigatórios: ${missing.map(f => f.label).join(", ")}`);
      return;
    }
    setCalculated(true);
    if (formula) {
      const score = evaluateFormula(formula.expression, values, fields);
      setCalculatedScore(score);
      if (formula.interpretation?.length) {
        const matched = matchInterpretation(score, formula.interpretation);
        setResult(matched);
      }
    }
  };

  const handleReset = () => {
    setValues({});
    setResult(null);
    setCalculated(false);
    setCalculatedScore(null);
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
    <div className="max-w-7xl mx-auto">
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
          {isOwner && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setFixDialogOpen(true)}>
                <MessageCircleWarning className="h-4 w-4" />
                Corrigir com IA
              </Button>
              <Button variant="destructive" size="sm" className="gap-1.5" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ─── SIMULATOR RENDERING ─── */}
      {isSimulatorType && formula ? (
        <SimulatorRenderer
          formula={formula}
          toolName={tool.name}
          authorName={authorName}
          hasCreator={!!tool.created_by}
        />
      ) : fields.length > 0 ? (
        /* ─── CALCULATOR RENDERING ─── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Input sections */}
          <div className="lg:col-span-2 space-y-6">
            {inputSections.map((section, si) => (
              <div key={si}>
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
                  {calculatedScore !== null && (
                    <p className="text-4xl font-bold mb-1" style={{ color: result.color }}>
                      {calculatedScore}
                    </p>
                  )}
                  <p className="text-2xl font-bold" style={{ color: result.color }}>
                    {result.label}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">{result.description}</p>
                </div>

                {result.recommendations && result.recommendations.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <h3 className="font-semibold mb-3">Condutas Sugeridas</h3>
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
              Autor: {authorName}{!tool.created_by && " • Posologia Produções"}
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

      {/* AI Fix Dialog */}
      <Dialog open={fixDialogOpen} onOpenChange={setFixDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Corrigir com IA</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Descreva o que não está funcionando corretamente nesta ferramenta. A IA irá analisar e corrigir automaticamente.
            </p>
            <Textarea
              placeholder="Ex: O botão calcular não funciona, os valores das faixas estão errados, falta o campo de idade..."
              value={fixDescription}
              onChange={(e) => setFixDescription(e.target.value)}
              rows={4}
            />
            <Button onClick={handleFixWithAI} disabled={fixLoading || !fixDescription.trim()} className="w-full gap-2">
              {fixLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircleWarning className="h-4 w-4" />}
              {fixLoading ? "Corrigindo..." : "Enviar para IA corrigir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
