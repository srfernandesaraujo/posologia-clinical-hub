import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, FlaskConical, AlertTriangle, CheckCircle2, XCircle, Activity, ArrowRight, GitCompareArrows, Sparkles, TrendingUp, TrendingDown, Minus, Lightbulb, Beaker } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface LipinskiData {
  mw: number;
  logP: number | null;
  hbd: number;
  hba: number;
  tpsa: number;
}

interface AdmetPrediction {
  property: string;
  score: number;
  risk: "low" | "moderate" | "high";
  explanation: string;
}

interface AdmetResult {
  predictions: AdmetPrediction[];
  half_life_estimate: string;
  overall_score: number;
  summary: string;
}

interface ModificationAnalysis {
  modifications_detected: Array<{
    group: string;
    action: "adicionado" | "removido" | "substituído";
    position_hint: string;
  }>;
  property_impacts: Array<{
    property: string;
    direction: "melhorou" | "piorou" | "estável";
    explanation: string;
  }>;
  overall_assessment: string;
  optimization_suggestions: Array<{
    suggestion: string;
    expected_benefit: string;
  }>;
}

interface InSilicoPredictionPanelProps {
  smiles: string;
  originalSmiles?: string;
  compoundName?: string;
  disabled?: boolean;
  onLipinskiCalculated?: (data: LipinskiData | null) => void;
}

const PUBCHEM_BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";

const LIPINSKI_RULES = [
  { key: "mw", label: "MW ≤ 500", max: 500, unit: "g/mol" },
  { key: "logP", label: "LogP ≤ 5", max: 5, unit: "" },
  { key: "hbd", label: "HBD ≤ 5", max: 5, unit: "" },
  { key: "hba", label: "HBA ≤ 10", max: 10, unit: "" },
] as const;

const PROPERTY_LABELS: Record<string, string> = {
  absorption: "Absorção Oral",
  solubility: "Solubilidade",
  hepatotoxicity: "Hepatotoxicidade",
  mutagenicity: "Mutagenicidade",
  bbb_penetration: "Penetração BHE",
  plasma_binding: "Ligação Plasmática",
  cyp_inhibition: "Inibição CYP450",
};

function RiskBadge({ risk }: { risk: string }) {
  if (risk === "low") return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-[10px] px-1.5 py-0">Risco Baixo</Badge>;
  if (risk === "moderate") return <Badge className="bg-amber-500 hover:bg-amber-600 text-[10px] px-1.5 py-0">Risco Moderado</Badge>;
  return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Risco Alto</Badge>;
}

function LipinskiIndicator({ value, max, label, unit }: { value: number | null; max: number; label: string; unit: string }) {
  if (value === null || !Number.isFinite(value)) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[10px]">?</span>
        {label}: N/A
      </div>
    );
  }
  const ok = value <= max;
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-destructive shrink-0" />
      )}
      <span className={ok ? "text-foreground" : "text-destructive font-medium"}>
        {label}: {value.toFixed(1)}{unit && ` ${unit}`}
      </span>
    </div>
  );
}

function countViolations(lip: LipinskiData | null): number {
  if (!lip) return 0;
  return [lip.mw > 500, lip.logP !== null && lip.logP > 5, lip.hbd > 5, lip.hba > 10].filter(Boolean).length;
}

async function fetchLipinskiFromPubChem(smi: string): Promise<LipinskiData | null> {
  try {
    const url = `${PUBCHEM_BASE}/compound/smiles/${encodeURIComponent(smi)}/property/MolecularWeight,XLogP,HBondDonorCount,HBondAcceptorCount,TPSA/JSON`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const p = json.PropertyTable?.Properties?.[0];
    if (!p) return null;
    const mw = Number(p.MolecularWeight);
    const hbd = Number(p.HBondDonorCount);
    const hba = Number(p.HBondAcceptorCount);
    const tpsa = Number(p.TPSA);
    const logPValue = p.XLogP == null ? null : Number(p.XLogP);
    const logP = logPValue !== null && Number.isFinite(logPValue) ? logPValue : null;
    if (![mw, hbd, hba, tpsa].every(Number.isFinite)) return null;
    return { mw, logP, hbd, hba, tpsa };
  } catch {
    return null;
  }
}

function DeltaBadge({ original, modified, unit, invert }: { original: number; modified: number; unit?: string; invert?: boolean }) {
  const diff = modified - original;
  if (Math.abs(diff) < 0.1) return null;
  const positive = invert ? diff < 0 : diff > 0;
  return (
    <span className={`text-[10px] font-medium ${positive ? "text-emerald-500" : "text-destructive"}`}>
      {diff > 0 ? "+" : ""}{diff.toFixed(1)}{unit || ""}
    </span>
  );
}

function DirectionIcon({ direction }: { direction: string }) {
  if (direction === "melhorou") return <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />;
  if (direction === "piorou") return <TrendingDown className="h-3.5 w-3.5 text-destructive shrink-0" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
}

function ModificationAnalysisSection({ analysis, loading, onRun, canRun }: {
  analysis: ModificationAnalysis | null;
  loading: boolean;
  onRun: () => void;
  canRun: boolean;
}) {
  if (!canRun && !analysis) return null;

  return (
    <div className="space-y-3 border-t border-border/50 pt-3">
      {!analysis && (
        <Button
          className="w-full"
          variant="secondary"
          size="sm"
          onClick={onRun}
          disabled={loading || !canRun}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Analisar Impacto das Modificações (IA)
        </Button>
      )}

      {loading && !analysis && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Analisando modificações estruturais e seus impactos farmacológicos...
        </div>
      )}

      {analysis && (
        <div className="space-y-3">
          {/* Modifications Detected */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Beaker className="h-3.5 w-3.5" />
              Modificações Identificadas
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {analysis.modifications_detected.map((mod, i) => (
                <Badge key={i} variant="outline" className="text-[11px] gap-1">
                  <span className={
                    mod.action === "adicionado" ? "text-emerald-500" :
                    mod.action === "removido" ? "text-destructive" : "text-amber-500"
                  }>
                    {mod.action === "adicionado" ? "+" : mod.action === "removido" ? "−" : "↔"}
                  </span>
                  {mod.group}
                  {mod.position_hint && (
                    <span className="text-muted-foreground">({mod.position_hint})</span>
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Property Impacts */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              Análise de Impacto por Propriedade
            </h4>
            <div className="space-y-2">
              {analysis.property_impacts.map((impact, i) => (
                <div key={i} className={`rounded-md border p-2.5 text-xs ${
                  impact.direction === "melhorou" ? "border-emerald-500/30 bg-emerald-500/5" :
                  impact.direction === "piorou" ? "border-destructive/30 bg-destructive/5" :
                  "border-border/50 bg-muted/10"
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <DirectionIcon direction={impact.direction} />
                    <span className="font-medium">{PROPERTY_LABELS[impact.property] || impact.property}</span>
                    <Badge variant="outline" className={`text-[10px] ${
                      impact.direction === "melhorou" ? "text-emerald-500 border-emerald-500/50" :
                      impact.direction === "piorou" ? "text-destructive border-destructive/50" :
                      "text-muted-foreground"
                    }`}>
                      {impact.direction === "melhorou" ? "Melhorou" : impact.direction === "piorou" ? "Piorou" : "Estável"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{impact.explanation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Overall Assessment */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-1.5">
            <h4 className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Avaliação Geral da Modificação
            </h4>
            <p className="text-xs text-foreground leading-relaxed">{analysis.overall_assessment}</p>
          </div>

          {/* Optimization Suggestions */}
          {analysis.optimization_suggestions.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                Sugestões de Otimização
              </h4>
              <div className="space-y-1.5">
                {analysis.optimization_suggestions.map((sug, i) => (
                  <div key={i} className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs">
                    <p className="font-medium text-foreground">{sug.suggestion}</p>
                    <p className="text-muted-foreground mt-0.5">Benefício esperado: {sug.expected_benefit}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function InSilicoPredictionPanel({ smiles, originalSmiles, compoundName, disabled, onLipinskiCalculated }: InSilicoPredictionPanelProps) {
  const { user } = useAuth();
  const [lipinski, setLipinski] = useState<LipinskiData | null>(null);
  const [originalLipinski, setOriginalLipinski] = useState<LipinskiData | null>(null);
  const [lipinskiLoading, setLipinskiLoading] = useState(false);
  const [admet, setAdmet] = useState<AdmetResult | null>(null);
  const [originalAdmet, setOriginalAdmet] = useState<AdmetResult | null>(null);
  const [admetLoading, setAdmetLoading] = useState(false);
  const [modAnalysis, setModAnalysis] = useState<ModificationAnalysis | null>(null);
  const [modAnalysisLoading, setModAnalysisLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const isModified = useMemo(() => originalSmiles && smiles && originalSmiles !== smiles, [originalSmiles, smiles]);

  const fetchLipinski = useCallback(async (smi: string) => {
    setLipinskiLoading(true);
    setLipinski(null);
    setAdmet(null);
    setModAnalysis(null);
    try {
      const data = await fetchLipinskiFromPubChem(smi);
      setLipinski(data);
      onLipinskiCalculated?.(data);
    } catch {
      setLipinski(null);
      onLipinskiCalculated?.(null);
    } finally {
      setLipinskiLoading(false);
    }
  }, [onLipinskiCalculated]);

  useEffect(() => {
    if (!originalSmiles) { setOriginalLipinski(null); return; }
    fetchLipinskiFromPubChem(originalSmiles).then(setOriginalLipinski);
  }, [originalSmiles]);

  useEffect(() => {
    if (!smiles) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchLipinski(smiles), 600);
    return () => clearTimeout(debounceRef.current);
  }, [smiles, fetchLipinski]);

  const lipinskiViolations = countViolations(lipinski);
  const originalViolations = countViolations(originalLipinski);

  const runAdmet = async () => {
    setAdmetLoading(true);
    setModAnalysis(null);
    try {
      if (isModified && originalSmiles) {
        const [modifiedRes, originalRes] = await Promise.all([
          supabase.functions.invoke("predict-admet", { body: { smiles, compoundName: `${compoundName} (modificado)`, userId: user?.id } }),
          originalAdmet ? Promise.resolve({ data: originalAdmet, error: null }) :
            supabase.functions.invoke("predict-admet", { body: { smiles: originalSmiles, compoundName, userId: user?.id } }),
        ]);
        if (modifiedRes.error) throw modifiedRes.error;
        if (modifiedRes.data?.error) throw new Error(modifiedRes.data.error);
        setAdmet(modifiedRes.data as AdmetResult);

        if (!originalAdmet) {
          if (originalRes.error) throw originalRes.error;
          if ((originalRes.data as any)?.error) throw new Error((originalRes.data as any).error);
          setOriginalAdmet(originalRes.data as AdmetResult);
        }
      } else {
        const { data, error } = await supabase.functions.invoke("predict-admet", { body: { smiles, compoundName, userId: user?.id } });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setAdmet(data as AdmetResult);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro na análise ADMET");
    } finally {
      setAdmetLoading(false);
    }
  };

  const runModificationAnalysis = async () => {
    if (!originalSmiles || !admet || !originalAdmet) return;
    setModAnalysisLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-modification", {
        body: {
          originalSmiles,
          modifiedSmiles: smiles,
          compoundName,
          originalAdmet,
          modifiedAdmet: admet,
          userId: user?.id,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setModAnalysis(data as ModificationAnalysis);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro na análise de modificações");
    } finally {
      setModAnalysisLoading(false);
    }
  };

  useEffect(() => {
    setOriginalAdmet(null);
    setModAnalysis(null);
  }, [originalSmiles]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-primary" />
          M3 — Predição In Silico
          {isModified && (
            <Badge variant="secondary" className="text-[10px] ml-auto gap-1">
              <GitCompareArrows className="h-3 w-3" />
              Comparação ativa
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lipinski Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Regra dos 5 (Lipinski)</h4>
            {lipinskiLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>

          {lipinski ? (
            <>
              {isModified && originalLipinski ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                    <span>Original</span>
                    <span></span>
                    <span>Modificado</span>
                  </div>
                  {LIPINSKI_RULES.map(rule => {
                    const origVal = originalLipinski[rule.key as keyof LipinskiData] as number | null;
                    const modVal = lipinski[rule.key as keyof LipinskiData] as number | null;
                    return (
                      <div key={rule.key} className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                        <LipinskiIndicator value={origVal} max={rule.max} label={rule.label} unit={rule.unit} />
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        <div className="flex items-center gap-1">
                          <LipinskiIndicator value={modVal} max={rule.max} label={rule.label} unit={rule.unit} />
                          {origVal !== null && modVal !== null && (
                            <DeltaBadge original={origVal} modified={modVal} invert={rule.key === "mw" || rule.key === "logP"} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-xs mt-1">
                    <div>
                      <span className="text-muted-foreground">TPSA: </span>
                      <span className="font-medium">{originalLipinski.tpsa.toFixed(1)} Å²</span>
                      <span className="text-muted-foreground ml-2">Viol.: </span>
                      <Badge variant={originalViolations <= 1 ? "default" : "destructive"} className="text-[10px]">{originalViolations}/4</Badge>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">TPSA: </span>
                      <span className="font-medium">{lipinski.tpsa.toFixed(1)} Å²</span>
                      <DeltaBadge original={originalLipinski.tpsa} modified={lipinski.tpsa} unit=" Å²" invert />
                      <span className="text-muted-foreground ml-2">Viol.: </span>
                      <Badge variant={lipinskiViolations <= 1 ? "default" : "destructive"} className="text-[10px]">{lipinskiViolations}/4</Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <LipinskiIndicator value={lipinski.mw} max={500} label="MW ≤ 500" unit="g/mol" />
                    <LipinskiIndicator value={lipinski.logP} max={5} label="LogP ≤ 5" unit="" />
                    <LipinskiIndicator value={lipinski.hbd} max={5} label="HBD ≤ 5" unit="" />
                    <LipinskiIndicator value={lipinski.hba} max={10} label="HBA ≤ 10" unit="" />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">TPSA:</span>
                    <span className="font-medium">{Number.isFinite(lipinski.tpsa) ? `${lipinski.tpsa.toFixed(1)} Å²` : "N/A"}</span>
                    <span className="text-muted-foreground ml-2">Violações:</span>
                    <Badge variant={lipinskiViolations === 0 ? "default" : lipinskiViolations <= 1 ? "secondary" : "destructive"} className="text-[10px]">
                      {lipinskiViolations}/4
                    </Badge>
                  </div>
                  {lipinskiViolations >= 2 && (
                    <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-500/10 rounded p-2">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      Mais de 1 violação de Lipinski — baixa probabilidade de absorção oral
                    </div>
                  )}
                </>
              )}
            </>
          ) : !lipinskiLoading ? (
            <p className="text-xs text-muted-foreground">Busque um composto ou insira um SMILES para calcular</p>
          ) : null}
        </div>

        {/* ADMET button */}
        <Button
          className="w-full"
          variant="outline"
          onClick={runAdmet}
          disabled={!smiles || admetLoading || disabled}
        >
          {admetLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Activity className="h-4 w-4 mr-2" />
          )}
          {isModified ? "Comparar ADMET: Original vs Modificado" : "Executar Análise de Toxicidade (ADMET)"}
        </Button>

        {/* ADMET results */}
        {admet && (
          <div className="space-y-3">
            {isModified && originalAdmet ? (
              <>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  <div className="flex items-center justify-between">
                    <span>Original</span>
                    <Badge variant="outline" className="text-[10px]">Score: {originalAdmet.overall_score}/100</Badge>
                  </div>
                  <span></span>
                  <div className="flex items-center justify-between">
                    <span>Modificado</span>
                    <Badge variant="outline" className="text-[10px]">Score: {admet.overall_score}/100</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                  <Progress value={originalAdmet.overall_score} className="h-2" />
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <div className="flex items-center gap-1">
                    <Progress value={admet.overall_score} className="h-2 flex-1" />
                    <DeltaBadge original={originalAdmet.overall_score} modified={admet.overall_score} />
                  </div>
                </div>

                <div className="space-y-2">
                  {admet.predictions.map((modPred) => {
                    const origPred = originalAdmet.predictions.find(p => p.property === modPred.property);
                    return (
                      <div key={modPred.property} className="rounded-md border border-border/50 bg-muted/20 p-2.5 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{PROPERTY_LABELS[modPred.property] || modPred.property}</span>
                        </div>
                        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                          <div className="flex items-center gap-2">
                            {origPred && <RiskBadge risk={origPred.risk} />}
                            <span className="text-sm font-bold">{origPred?.score ?? "—"}<span className="text-[10px] text-muted-foreground">/100</span></span>
                          </div>
                          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          <div className="flex items-center gap-2">
                            <RiskBadge risk={modPred.risk} />
                            <span className="text-sm font-bold">{modPred.score}<span className="text-[10px] text-muted-foreground">/100</span></span>
                            {origPred && <DeltaBadge original={origPred.score} modified={modPred.score} />}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                          <p>{origPred?.explanation}</p>
                          <p>{modPred.explanation}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {(admet.half_life_estimate || originalAdmet.half_life_estimate) && (
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-2 text-xs text-muted-foreground items-center">
                    <div>Meia-vida: <span className="font-medium text-foreground">{originalAdmet.half_life_estimate}</span></div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <div>Meia-vida: <span className="font-medium text-foreground">{admet.half_life_estimate}</span></div>
                  </div>
                )}

                {/* Modification Impact Analysis */}
                <ModificationAnalysisSection
                  analysis={modAnalysis}
                  loading={modAnalysisLoading}
                  onRun={runModificationAnalysis}
                  canRun={!!originalAdmet && !!admet && !!originalSmiles}
                />
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resultados ADMET</h4>
                  <Badge variant="outline" className="text-[10px]">
                    Score Geral: {admet.overall_score}/100
                  </Badge>
                </div>

                <Progress value={admet.overall_score} className="h-2" />

                <div className="space-y-2">
                  {admet.predictions.map((pred) => (
                    <div key={pred.property} className="flex items-center gap-2 text-xs bg-muted/30 rounded p-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium">{PROPERTY_LABELS[pred.property] || pred.property}</span>
                          <RiskBadge risk={pred.risk} />
                        </div>
                        <p className="text-[10px] text-muted-foreground">{pred.explanation}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold">{pred.score}</span>
                        <span className="text-[10px] text-muted-foreground">/100</span>
                      </div>
                    </div>
                  ))}
                </div>

                {admet.half_life_estimate && (
                  <div className="text-xs text-muted-foreground">
                    Meia-vida estimada: <span className="font-medium text-foreground">{admet.half_life_estimate}</span>
                  </div>
                )}

                <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">
                  {admet.summary}
                </p>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
