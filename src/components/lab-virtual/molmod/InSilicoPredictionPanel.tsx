import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, FlaskConical, AlertTriangle, CheckCircle2, XCircle, Activity } from "lucide-react";
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

interface InSilicoPredictionPanelProps {
  smiles: string;
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

export function InSilicoPredictionPanel({ smiles, compoundName, disabled, onLipinskiCalculated }: InSilicoPredictionPanelProps) {
  const { user } = useAuth();
  const [lipinski, setLipinski] = useState<LipinskiData | null>(null);
  const [lipinskiLoading, setLipinskiLoading] = useState(false);
  const [admet, setAdmet] = useState<AdmetResult | null>(null);
  const [admetLoading, setAdmetLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Fetch Lipinski from PubChem when SMILES changes
  const fetchLipinski = useCallback(async (smi: string) => {
    setLipinskiLoading(true);
    setLipinski(null);
    setAdmet(null);
    try {
      const url = `${PUBCHEM_BASE}/compound/smiles/${encodeURIComponent(smi)}/property/MolecularWeight,XLogP,HBondDonorCount,HBondAcceptorCount,TPSA/JSON`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("PubChem lookup failed");
      const json = await res.json();
      const p = json.PropertyTable?.Properties?.[0];
      if (!p) throw new Error("No properties");

      const mw = Number(p.MolecularWeight);
      const hbd = Number(p.HBondDonorCount);
      const hba = Number(p.HBondAcceptorCount);
      const tpsa = Number(p.TPSA);
      const logPValue = p.XLogP == null ? null : Number(p.XLogP);
      const logP = logPValue !== null && Number.isFinite(logPValue) ? logPValue : null;

      if (![mw, hbd, hba, tpsa].every((value) => Number.isFinite(value))) {
        throw new Error("PubChem returned invalid numeric properties");
      }

      const data: LipinskiData = {
        mw,
        logP,
        hbd,
        hba,
        tpsa,
      };
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
    if (!smiles) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchLipinski(smiles), 600);
    return () => clearTimeout(debounceRef.current);
  }, [smiles, fetchLipinski]);

  const lipinskiViolations = lipinski
    ? [
        lipinski.mw > 500,
        lipinski.logP !== null && lipinski.logP > 5,
        lipinski.hbd > 5,
        lipinski.hba > 10,
      ].filter(Boolean).length
    : 0;

  const runAdmet = async () => {
    setAdmetLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("predict-admet", {
        body: { smiles, compoundName, userId: user?.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAdmet(data as AdmetResult);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro na análise ADMET");
    } finally {
      setAdmetLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-primary" />
          M3 — Predição In Silico
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lipinski */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Regra dos 5 (Lipinski)</h4>
            {lipinskiLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>

          {lipinski ? (
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
          Executar Análise de Toxicidade (ADMET)
        </Button>

        {/* ADMET results */}
        {admet && (
          <div className="space-y-3">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
