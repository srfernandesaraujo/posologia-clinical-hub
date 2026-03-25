import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ShieldCheck, Info } from "lucide-react";
import type { CompoundData } from "./CompoundSearchPanel";

interface DruglikenessPanelProps {
  compound: CompoundData | null;
  smiles?: string;
  rotatableBonds?: number;
}

interface RuleResult {
  name: string;
  description: string;
  passed: boolean;
  details: string;
}

function checkPAINS(smiles: string): { alerts: string[]; clean: boolean } {
  const alerts: string[] = [];
  if (!smiles) return { alerts: [], clean: true };
  const patterns: [RegExp, string][] = [
    [/S\(=O\)\(=O\)N.*N=N/i, "Sulfamida com azo"],
    [/N=N.*c.*c.*N=N/i, "Diazo aromático"],
    [/\[N+\]\(=O\)\[O-\]/i, "Nitro aromático"],
    [/C#N.*C#N/i, "Dicianeto"],
    [/S.*S.*S/i, "Polissulfeto"],
  ];
  for (const [pattern, name] of patterns) {
    if (pattern.test(smiles)) alerts.push(name);
  }
  return { alerts, clean: alerts.length === 0 };
}

function evaluateRules(c: CompoundData, rotBonds?: number, smiles?: string): RuleResult[] {
  const rules: RuleResult[] = [];
  const logP = c.xLogP ?? 0;

  const lipV = [c.mw > 500, logP > 5, c.hbd > 5, c.hba > 10].filter(Boolean).length;
  rules.push({
    name: "Lipinski (Ro5)",
    description: "MW ≤500, LogP ≤5, HBD ≤5, HBA ≤10. Máximo 1 violação.",
    passed: lipV <= 1,
    details: lipV === 0 ? "Nenhuma violação" : `${lipV} violação(ões)`,
  });

  const veberTPSA = c.tpsa <= 140;
  const veberRot = rotBonds != null ? rotBonds <= 10 : true;
  rules.push({
    name: "Veber",
    description: "TPSA ≤140 Å² e rotatable bonds ≤10 para biodisponibilidade oral.",
    passed: veberTPSA && veberRot,
    details: `TPSA: ${c.tpsa.toFixed(1)} Å² | Rot. Bonds: ${rotBonds ?? "N/A"}`,
  });

  const leadLike = c.mw >= 250 && c.mw <= 350 && logP >= -1 && logP <= 3;
  rules.push({
    name: "Lead-likeness",
    description: "MW 250-350, LogP -1 a 3. Faixa ideal para otimização Hit-to-Lead.",
    passed: leadLike,
    details: `MW: ${c.mw.toFixed(0)} | LogP: ${logP.toFixed(1)}`,
  });

  const painsResult = checkPAINS(smiles || c.smiles);
  rules.push({
    name: "PAINS",
    description: "Pan-Assay Interference Compounds. Alertas estruturais de falso-positivo.",
    passed: painsResult.clean,
    details: painsResult.clean ? "Sem alertas" : `Alertas: ${painsResult.alerts.join(", ")}`,
  });

  const ghose = c.mw >= 160 && c.mw <= 480 && logP >= -0.4 && logP <= 5.6;
  rules.push({
    name: "Ghose",
    description: "MW 160-480, LogP -0.4 a 5.6. Filtro de drug-likeness alternativo.",
    passed: ghose,
    details: `MW: ${c.mw.toFixed(0)} | LogP: ${logP.toFixed(1)}`,
  });

  return rules;
}

export function DruglikenessPanel({ compound, smiles, rotatableBonds }: DruglikenessPanelProps) {
  const rules = useMemo(() =>
    compound ? evaluateRules(compound, rotatableBonds, smiles) : [],
  [compound, rotatableBonds, smiles]);

  const overallScore = useMemo(() => {
    const weights = [30, 20, 15, 20, 15];
    let score = 0;
    rules.forEach((r, i) => { if (r.passed) score += weights[i]; });
    return score;
  }, [rules]);

  if (!compound) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Druglikeness Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground text-center py-4">Selecione um composto em M1</p>
        </CardContent>
      </Card>
    );
  }

  const passedCount = rules.filter(r => r.passed).length;
  const scoreColor = overallScore >= 70 ? "text-emerald-500" : overallScore >= 40 ? "text-yellow-500" : "text-destructive";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Druglikeness Score
          <Badge variant="outline" className="text-[10px] ml-auto">{passedCount}/{rules.length} regras</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <span className={`text-4xl font-bold font-mono ${scoreColor}`}>{overallScore}</span>
          <span className="text-lg text-muted-foreground">/100</span>
          <Progress value={overallScore} className="mt-2 h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {overallScore >= 70 ? "Perfil favorável para candidato a fármaco" :
             overallScore >= 40 ? "Necessita otimização estrutural" :
             "Alto risco — redesenhar molécula"}
          </p>
        </div>

        <div className="space-y-2">
          {rules.map(r => (
            <div key={r.name} className={`rounded-md border p-2.5 ${r.passed ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Badge variant={r.passed ? "default" : "destructive"} className={`text-[10px] ${r.passed ? "bg-emerald-600" : ""}`}>
                    {r.passed ? "✓" : "✗"}
                  </Badge>
                  <span className="text-sm font-medium">{r.name}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">{r.description}</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{r.details}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
