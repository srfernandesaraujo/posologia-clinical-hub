import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft, Calculator, FileText, Trash2, MessageCircleWarning, Loader2,
  User, ClipboardCheck, CheckCircle, XCircle, ChevronRight, Info,
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useCallback, useMemo } from "react";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "sonner";
import jsPDF from "jspdf";

/* ─── Types ─── */
interface ToolField {
  name: string; label: string;
  type: "number" | "select" | "switch" | "checkbox" | "text";
  unit?: string; options?: { value: string; label: string }[];
  required?: boolean; defaultValue?: string; section?: string;
}
interface Interpretation {
  range: string; label: string; description: string; color?: string; recommendations?: string[];
}
interface SimPanel {
  title: string; type: "info" | "checklist" | "radio" | "text";
  content?: string; options?: string[];
  correctAnswers?: string[]; correctText?: string;
}
interface SimStep {
  title: string; feedback: string; panels: SimPanel[];
}
interface ToolFormula {
  expression: string; interpretation: Interpretation[];
  sections?: { title: string; fields: any[] }[];
  type?: string; patient_summary?: string; steps?: SimStep[];
  // Legacy PRM fields
  patient?: any; history?: any; prescription?: any[]; answers?: any[];
}

/* ─── Parsers ─── */
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

/* ─── PDF ─── */
function gerarPDF(toolName: string, values: Record<string, string>, fields: ToolField[], result: Interpretation | null) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 20;
  doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text(toolName, w / 2, y, { align: "center" }); y += 7;
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text("Relatório Individual", w / 2, y, { align: "center" }); y += 5;
  doc.text("Autor: Sérgio Araújo • Posologia Produções", w / 2, y, { align: "center" }); y += 10;
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
  doc.text("Este relatório é uma estimativa e não substitui avaliação médica presencial.", 14, y); y += 4;
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, y);
  doc.save(`relatorio-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* ═══════════════════════════════════════════════════════════════
   GENERIC STEP-BASED SIMULATOR RENDERER
   ═══════════════════════════════════════════════════════════════ */
function SimulatorRenderer({ formula, toolName, toolId, toolSlug, authorName, hasCreator, isOwner }: {
  formula: ToolFormula; toolName: string; toolId: string; toolSlug: string;
  authorName: string; hasCreator: boolean; isOwner: boolean;
}) {
  const queryClient = useQueryClient();
  const [screen, setScreen] = useState<"dashboard" | "sim" | "report">("dashboard");
  const [activeCase, setActiveCase] = useState<{ steps: SimStep[]; patient_summary?: string; title: string; difficulty: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch additional AI-generated cases from simulator_cases table
  const { data: dbCases = [] } = useQuery({
    queryKey: ["simulator-cases-tool", toolSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("simulator_cases" as any)
        .select("*")
        .eq("simulator_slug", toolSlug)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]).map((c: any) => ({
        id: c.id,
        title: c.title,
        difficulty: c.difficulty,
        isAI: true,
        steps: c.case_data?.steps || [],
        patient_summary: c.case_data?.patient_summary || "",
      }));
    },
  });

  // Original case from the tool's formula
  const originalCase = {
    title: toolName,
    difficulty: "Médio",
    steps: formula.steps || [],
    patient_summary: formula.patient_summary || "",
    isOriginal: true,
  };

  const allCases = [originalCase, ...dbCases];

  const generateCase = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-case", {
        body: { tool_id: toolId, simulator_slug: toolSlug },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const generated = data.case;

      const { error: insertError } = await supabase
        .from("simulator_cases" as any)
        .insert({
          simulator_slug: toolSlug,
          title: generated.title,
          difficulty: generated.difficulty,
          case_data: generated.case_data,
          is_ai_generated: true,
        } as any);

      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ["simulator-cases-tool", toolSlug] });
      toast.success("Caso clínico gerado com sucesso!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao gerar caso clínico");
    } finally {
      setIsGenerating(false);
    }
  };

  const startCase = (c: any) => {
    if (c.isOriginal) {
      setActiveCase({ steps: c.steps, patient_summary: c.patient_summary, title: c.title, difficulty: c.difficulty });
    } else {
      // DB case: steps are in case_data
      setActiveCase({ steps: c.steps, patient_summary: c.patient_summary, title: c.title, difficulty: c.difficulty });
    }
    setScreen("sim");
  };

  // ─── Dashboard ───
  if (screen === "dashboard") {
    return (
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCases.map((c: any, i: number) => (
            <Card key={c.id || i} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => startCase(c)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant={c.difficulty === "Fácil" ? "secondary" : c.difficulty === "Difícil" ? "destructive" : "default"}>
                    {c.difficulty}
                  </Badge>
                  {c.isAI && <Badge variant="outline" className="text-xs"><Sparkles className="h-3 w-3 mr-1" />IA</Badge>}
                </div>
                <CardTitle className="text-lg mt-2">{c.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{c.patient_summary || "Caso clínico"}</p>
              </CardContent>
            </Card>
          ))}
          {isOwner && (
            <Card className="border-dashed hover:shadow-lg transition-shadow cursor-pointer flex items-center justify-center min-h-[140px]" onClick={generateCase}>
              <div className="text-center p-6">
                {isGenerating ? <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /> : <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />}
                <p className="font-medium">{isGenerating ? "Gerando caso..." : "Gerar com IA"}</p>
              </div>
            </Card>
          )}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-6">
          Autor: {authorName}{!hasCreator && " • Posologia Produções"}
        </p>
      </div>
    );
  }

  // ─── Simulation & Report ───
  const caseData = activeCase;
  if (!caseData) return null;

  return (
    <SimulatorCaseView
      caseData={caseData}
      authorName={authorName}
      hasCreator={hasCreator}
      onBack={() => { setScreen("dashboard"); setActiveCase(null); }}
    />
  );
}

/* Sparkles icon import helper */
import { Sparkles } from "lucide-react";

/* ─── Simulator Case View (step-based runner) ─── */
function SimulatorCaseView({ caseData, authorName, hasCreator, onBack }: {
  caseData: { steps: SimStep[]; patient_summary?: string; title: string; difficulty: string };
  authorName: string; hasCreator: boolean; onBack: () => void;
}) {
  const steps = caseData.steps || [];
  const [currentStep, setCurrentStep] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showReport, setShowReport] = useState(false);
  const [answers, setAnswers] = useState<Record<number, Record<number, any>>>({});

  const step = steps[currentStep];

  const setAnswer = (panelIdx: number, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [currentStep]: { ...(prev[currentStep] || {}), [panelIdx]: value },
    }));
  };

  const toggleChecklist = (panelIdx: number, option: string) => {
    const current: string[] = answers[currentStep]?.[panelIdx] || [];
    const next = current.includes(option) ? current.filter(o => o !== option) : [...current, option];
    setAnswer(panelIdx, next);
  };

  const handleFinishStep = () => {
    setShowFeedback(true);
    setCompletedSteps(prev => new Set(prev).add(currentStep));
  };

  const handleNextStep = () => {
    setShowFeedback(false);
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
    else setShowReport(true);
  };

  const getStepScore = (stepIdx: number) => {
    const s = steps[stepIdx];
    if (!s) return { correct: 0, total: 0 };
    let correct = 0, total = 0;
    s.panels.forEach((panel, pi) => {
      if (panel.type === "info") return;
      total++;
      const userAns = answers[stepIdx]?.[pi];
      if (panel.type === "checklist" && panel.correctAnswers) {
        const selected: string[] = userAns || [];
        if (panel.correctAnswers.length === selected.length && panel.correctAnswers.every(a => selected.includes(a))) correct++;
      } else if (panel.type === "radio" && panel.correctAnswers) {
        if (panel.correctAnswers.includes(userAns)) correct++;
      } else if (panel.type === "text" && panel.correctText) {
        if (userAns?.trim()) correct++;
      }
    });
    return { correct, total };
  };

  const hasInteractivePanels = step?.panels.some(p => p.type !== "info");
  const hasAnswered = step?.panels.some((p, pi) => {
    if (p.type === "info") return false;
    const ans = answers[currentStep]?.[pi];
    if (p.type === "checklist") return (ans as string[] || []).length > 0;
    if (p.type === "radio") return !!ans;
    if (p.type === "text") return !!(ans as string)?.trim();
    return false;
  });

  if (showReport) {
    const totalCorrect = steps.reduce((sum, _, i) => sum + getStepScore(i).correct, 0);
    const totalQuestions = steps.reduce((sum, _, i) => sum + getStepScore(i).total, 0);

    return (
      <div>
        <Button variant="ghost" onClick={onBack} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Voltar aos Casos</Button>
        <Card className="mb-6">
          <CardHeader><CardTitle>Relatório de Desempenho</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <div className="text-5xl font-bold mb-2">{totalCorrect}/{totalQuestions}</div>
              <p className="text-muted-foreground">Questões respondidas corretamente</p>
              <div className="w-full bg-muted rounded-full h-3 mt-4 max-w-xs mx-auto">
                <div className="bg-primary rounded-full h-3 transition-all" style={{ width: `${totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          {steps.map((s, si) => (
            <Card key={si}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {getStepScore(si).correct === getStepScore(si).total && getStepScore(si).total > 0
                    ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                  {s.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="bg-muted p-3 rounded mb-2"><strong>Feedback:</strong> {s.feedback}</div>
                {s.panels.filter(p => p.type !== "info").map((panel, pi) => {
                  const userAns = answers[si]?.[pi];
                  return (
                    <div key={pi} className="mt-2 text-muted-foreground">
                      <strong>{panel.title}:</strong>{" "}
                      {(panel.type === "checklist" || panel.type === "radio") ? (
                        <>
                          <span>Sua resposta: {Array.isArray(userAns) ? userAns.join(", ") : userAns || "—"}</span>
                          {panel.correctAnswers && <span className="ml-2 text-primary">| Correto: {panel.correctAnswers.join(", ")}</span>}
                        </>
                      ) : <span>{userAns || "—"}</span>}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex gap-3 mt-6">
          <Button onClick={() => { setShowReport(false); setCurrentStep(0); setCompletedSteps(new Set()); setAnswers({}); setShowFeedback(false); }}>Tentar Novamente</Button>
          <Button variant="outline" onClick={onBack}>Voltar aos Casos</Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4">Autor: {authorName}{!hasCreator && " • Posologia Produções"}</p>
      </div>
    );
  }

  if (!step) return null;

  return (
    <div>
      <Button variant="ghost" onClick={onBack} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Voltar aos Casos</Button>

      {/* Step progress bar */}
      <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              onClick={() => { if (completedSteps.has(i) || i === currentStep) { setCurrentStep(i); setShowFeedback(completedSteps.has(i)); } }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                i === currentStep ? "bg-primary text-primary-foreground"
                  : completedSteps.has(i) ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {completedSteps.has(i) && <CheckCircle className="h-3 w-3" />}
              {s.title}
            </button>
            {i < steps.length - 1 && <div className="w-6 h-px bg-border" />}
          </div>
        ))}
      </div>

      {caseData.patient_summary && (
        <p className="text-sm text-muted-foreground mb-4 flex items-center gap-1.5"><User className="h-4 w-4" />{caseData.patient_summary}</p>
      )}

      {/* Panels grid */}
      <div className={`grid grid-cols-1 ${step.panels.length >= 3 ? "lg:grid-cols-3" : step.panels.length === 2 ? "lg:grid-cols-2" : ""} gap-4`}>
        {step.panels.map((panel, pi) => (
          <Card key={pi}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                {panel.type === "info" ? <Info className="h-4 w-4" /> : <ClipboardCheck className="h-4 w-4" />}
                {panel.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {panel.type === "info" && panel.content && (
                <div className="text-sm space-y-2 whitespace-pre-line">
                  {panel.content.split("\n").map((line, li) => {
                    const parts = line.split(/(\*\*[^*]+\*\*)/g);
                    return <p key={li}>{parts.map((part, pi2) => part.startsWith("**") && part.endsWith("**") ? <strong key={pi2}>{part.slice(2, -2)}</strong> : <span key={pi2}>{part}</span>)}</p>;
                  })}
                </div>
              )}

              {panel.type === "checklist" && panel.options && (
                <div className="space-y-2">
                  {showFeedback && panel.correctAnswers && (
                    <p className="text-xs text-muted-foreground mb-2">Corretas: <span className="text-primary font-medium">{panel.correctAnswers.join(", ")}</span></p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {panel.options.map((opt, oi) => {
                      const selected = (answers[currentStep]?.[pi] as string[] || []).includes(opt);
                      const isCorrect = showFeedback && panel.correctAnswers?.includes(opt);
                      const isWrong = showFeedback && selected && !panel.correctAnswers?.includes(opt);
                      return (
                        <label key={oi} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-sm ${
                          showFeedback ? (isCorrect ? "border-green-500 bg-green-50 dark:bg-green-950/20" : isWrong ? "border-red-500 bg-red-50 dark:bg-red-950/20" : "") : selected ? "border-primary bg-primary/5" : "hover:border-primary/50"
                        }`}>
                          <Checkbox checked={selected} disabled={showFeedback} onCheckedChange={() => toggleChecklist(pi, opt)} />
                          {opt}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {panel.type === "radio" && panel.options && (
                <div className="space-y-2">
                  {showFeedback && panel.correctAnswers && (
                    <p className="text-xs text-muted-foreground mb-2">Correta: <span className="text-primary font-medium">{panel.correctAnswers.join(", ")}</span></p>
                  )}
                  <RadioGroup value={answers[currentStep]?.[pi] || ""} onValueChange={(v) => setAnswer(pi, v)} disabled={showFeedback}>
                    {panel.options.map((opt, oi) => {
                      const isCorrect = showFeedback && panel.correctAnswers?.includes(opt);
                      const isSelected = answers[currentStep]?.[pi] === opt;
                      const isWrong = showFeedback && isSelected && !panel.correctAnswers?.includes(opt);
                      return (
                        <label key={oi} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-sm ${
                          showFeedback ? (isCorrect ? "border-green-500 bg-green-50 dark:bg-green-950/20" : isWrong ? "border-red-500 bg-red-50 dark:bg-red-950/20" : "") : isSelected ? "border-primary bg-primary/5" : "hover:border-primary/50"
                        }`}>
                          <RadioGroupItem value={opt} />{opt}
                        </label>
                      );
                    })}
                  </RadioGroup>
                </div>
              )}

              {panel.type === "text" && (
                <div className="space-y-2">
                  <Textarea placeholder="Digite sua resposta..." value={answers[currentStep]?.[pi] || ""} onChange={(e) => setAnswer(pi, e.target.value)} rows={3} disabled={showFeedback} />
                  {showFeedback && panel.correctText && (
                    <div className="text-sm bg-muted p-3 rounded"><strong>Resposta esperada:</strong> {panel.correctText}</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {showFeedback && step.feedback && (
        <Card className="mt-4 border-primary/30 bg-primary/5">
          <CardContent className="pt-4">
            <p className="text-sm font-medium mb-1">Feedback:</p>
            <p className="text-sm text-muted-foreground">{step.feedback}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end mt-6 gap-3">
        {!showFeedback ? (
          <Button size="lg" className="gap-2" disabled={hasInteractivePanels && !hasAnswered} onClick={handleFinishStep}>
            <ClipboardCheck className="h-4 w-4" />{hasInteractivePanels ? "Finalizar Etapa" : "Ver Feedback"}
          </Button>
        ) : (
          <Button size="lg" className="gap-2" onClick={handleNextStep}>
            {currentStep < steps.length - 1 ? <>Avançar <ChevronRight className="h-4 w-4" /></> : <>Ver Relatório <ChevronRight className="h-4 w-4" /></>}
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">Autor: {authorName}{!hasCreator && " • Posologia Produções"}</p>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
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
      const { data, error } = await supabase.from("tools").select("*, categories(name)").eq("slug", slug).single();
      if (error) throw error;
      if (user && data) { supabase.from("usage_logs").insert({ user_id: user.id, tool_id: data.id }); }
      return data;
    },
    enabled: !!slug,
  });

  const isOwner = tool?.created_by && user?.id === tool.created_by;

  const { data: authorProfile } = useQuery({
    queryKey: ["author-profile", tool?.created_by],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("user_id", tool!.created_by!).single();
      return data;
    },
    enabled: !!tool?.created_by,
  });

  const authorName = tool?.created_by ? (authorProfile?.full_name || "Usuário") : "Sérgio Araújo";

  const handleDelete = async () => {
    if (!tool || !isOwner) return;
    if (!confirm("Tem certeza que deseja excluir esta ferramenta?")) return;
    const { error } = await supabase.from("tools").delete().eq("id", tool.id);
    if (error) { toast.error("Erro ao excluir ferramenta"); }
    else {
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
          prompt: fixDescription, type: tool.type, mode: "edit",
          existingTool: { name: tool.name, description: tool.description, short_description: tool.short_description, fields: tool.fields, formula: tool.formula },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const updated = data.tool;
      if (!updated) throw new Error("A IA não retornou dados válidos");

      const { error: updateError } = await supabase.from("tools").update({
        fields: updated.fields, formula: updated.formula,
        description: updated.description || tool.description,
        short_description: updated.short_description || tool.short_description,
      }).eq("id", tool.id);
      if (updateError) throw updateError;

      setValues({}); setResult(null); setCalculated(false); setCalculatedScore(null);
      await queryClient.refetchQueries({ queryKey: ["tool", slug] });
      toast.success("Ferramenta corrigida com sucesso!");
      setFixDialogOpen(false); setFixDescription("");
    } catch (e: any) {
      console.error("Fix with AI error:", e);
      toast.error(e.message || "Erro ao corrigir com IA");
    } finally { setFixLoading(false); }
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
    setValues(prev => ({ ...prev, [name]: value })); setCalculated(false); setResult(null);
  }, []);

  const evaluateFormula = useCallback((expression: string, vals: Record<string, string>, fieldsList: ToolField[]): number => {
    const context: Record<string, number> = {};
    for (const f of fieldsList) {
      const raw = vals[f.name];
      if (f.type === "switch" || f.type === "checkbox") context[f.name] = (raw === "1" || raw === "true") ? 1 : 0;
      else context[f.name] = parseFloat(raw || "0") || 0;
    }
    try {
      const keys = Object.keys(context); const vals2 = Object.values(context);
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
    if (missing.length) { toast.error(`Preencha: ${missing.map(f => f.label).join(", ")}`); return; }
    setCalculated(true);
    if (formula) {
      const score = evaluateFormula(formula.expression, values, fields);
      setCalculatedScore(score);
      if (formula.interpretation?.length) setResult(matchInterpretation(score, formula.interpretation));
    }
  };

  const handleReset = () => { setValues({}); setResult(null); setCalculated(false); setCalculatedScore(null); };

  if (isLoading) return (
    <div className="max-w-4xl mx-auto">
      <div className="h-8 w-48 bg-muted animate-pulse rounded mb-4" />
      <div className="h-64 bg-muted animate-pulse rounded-2xl" />
    </div>
  );

  if (!tool) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground mb-4">Ferramenta não encontrada.</p>
      <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
    </div>
  );

  const toolType = tool.type === "calculadora" ? "Calculadoras" : "Simuladores";
  const backPath = tool.type === "calculadora" ? "/calculadoras" : "/simuladores";

  return (
    <div className="max-w-7xl mx-auto">
      <button onClick={() => navigate(backPath)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" />Voltar às {toolType}
      </button>

      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3"><Calculator className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold">{tool.name}</h1>
              {tool.short_description && <p className="text-sm text-muted-foreground mt-0.5">{tool.short_description}</p>}
            </div>
          </div>
          {isOwner && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setFixDialogOpen(true)}>
                <MessageCircleWarning className="h-4 w-4" />Corrigir com IA
              </Button>
              <Button variant="destructive" size="sm" className="gap-1.5" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />Excluir
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ─── SIMULATOR ─── */}
      {isSimulatorType && formula ? (
        <SimulatorRenderer formula={formula} toolName={tool.name} toolId={tool.id} toolSlug={tool.slug} authorName={authorName} hasCreator={!!tool.created_by} isOwner={!!user && tool.created_by === user.id} />
      ) : fields.length > 0 ? (
        /* ─── CALCULATOR ─── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {inputSections.map((section, si) => (
              <div key={si}>
                {section.regularFields.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-6 mb-6">
                    <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">{section.title}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {section.regularFields.map(field => (
                        <div key={field.name} className="space-y-1.5">
                          <Label htmlFor={field.name} className="text-sm font-medium">
                            {field.label}{field.unit && <span className="text-muted-foreground ml-1">({field.unit})</span>}
                            {field.required && <span className="text-destructive ml-0.5">*</span>}
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
                  <div className="rounded-2xl border border-border bg-card p-6">
                    {section.regularFields.length === 0 && <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">{section.title}</h2>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {section.switchFields.map(field => (
                        <div key={field.name} className="flex items-center justify-between rounded-lg bg-background p-3">
                          <Label className="cursor-pointer">{field.label}</Label>
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

          <div className="space-y-6">
            {calculated && result ? (
              <>
                <div className="rounded-2xl border p-6" style={{ borderColor: result.color ? `${result.color}50` : undefined, backgroundColor: result.color ? `${result.color}15` : undefined }}>
                  <p className="text-sm text-muted-foreground mb-1">Resultado</p>
                  {calculatedScore !== null && <p className="text-4xl font-bold mb-1" style={{ color: result.color }}>{calculatedScore}</p>}
                  <p className="text-2xl font-bold" style={{ color: result.color }}>{result.label}</p>
                  <p className="text-sm text-muted-foreground mt-2">{result.description}</p>
                </div>
                {result.recommendations && result.recommendations.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <h3 className="font-semibold mb-3">Condutas Sugeridas</h3>
                    <ul className="space-y-2.5">
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
              <div className="rounded-2xl border border-border bg-card p-6 text-center">
                <Calculator className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Preencha os dados e clique em <strong>Calcular</strong>.</p>
              </div>
            )}
            {formula?.interpretation && formula.interpretation.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Escala de Interpretação</h3>
                <div className="space-y-2">
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
            <p className="text-xs text-muted-foreground text-center">Autor: {authorName}{!tool.created_by && " • Posologia Produções"}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-8">
          <div className="rounded-xl border border-border bg-muted/50 p-6 text-center">
            <p className="text-muted-foreground">Esta ferramenta não possui campos configurados.</p>
          </div>
          {tool.description && <p className="text-sm text-muted-foreground mt-4">{tool.description}</p>}
        </div>
      )}

      {/* AI Fix Dialog */}
      <Dialog open={fixDialogOpen} onOpenChange={setFixDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Corrigir com IA</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Descreva o problema. A IA irá analisar e corrigir automaticamente.</p>
            <Textarea placeholder="Ex: O feedback está incorreto, faltam opções..." value={fixDescription} onChange={(e) => setFixDescription(e.target.value)} rows={4} />
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
