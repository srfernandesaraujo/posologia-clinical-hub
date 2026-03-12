import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dna, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { ForensicScenario, DNAProfile } from "@/data/forensicScenarios";

interface DNALabPanelProps {
  scenario: ForensicScenario;
  isUnlocked: boolean;
  onComplete: (result: { matchedSuspect: string; correct: boolean }) => void;
}

function profileToChartData(profile: DNAProfile) {
  const data: { locus: string; allele1: number; allele2: number }[] = [];
  for (const p of profile.peaks) {
    data.push({ locus: p.locus, allele1: p.alleles[0], allele2: p.alleles[1] });
  }
  return data;
}

function ElectropherogramChart({ profile, color, highlight }: { profile: DNAProfile; color: string; highlight?: boolean }) {
  const data = profileToChartData(profile);
  return (
    <div className={`bg-muted/30 rounded-lg p-2 border ${highlight ? "border-primary ring-1 ring-primary/30" : "border-border/50"}`}>
      <p className="text-[11px] font-semibold text-muted-foreground mb-1">{profile.label}</p>
      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={data} barGap={2} barSize={12}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
          <XAxis dataKey="locus" tick={{ fontSize: 9 }} />
          <YAxis hide domain={[0, 30]} />
          <Tooltip formatter={(v: number) => [v, "Alelo"]} />
          <Bar dataKey="allele1" fill={color} radius={[2, 2, 0, 0]} />
          <Bar dataKey="allele2" fill={`${color}99`} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DNALabPanel({ scenario, isUnlocked, onComplete }: DNALabPanelProps) {
  const [sceneExtracted, setSceneExtracted] = useState(false);
  const [suspectsExtracted, setSuspectsExtracted] = useState(false);
  const [extractingScene, setExtractingScene] = useState(false);
  const [extractingSuspects, setExtractingSuspects] = useState(false);
  const [selectedSuspect, setSelectedSuspect] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const dna = scenario.dnaAnalysis;

  const extractScene = () => {
    setExtractingScene(true);
    setTimeout(() => { setSceneExtracted(true); setExtractingScene(false); }, 1500);
  };

  const extractSuspects = () => {
    setExtractingSuspects(true);
    setTimeout(() => { setSuspectsExtracted(true); setExtractingSuspects(false); }, 2000);
  };

  const confirmMatch = () => {
    if (selectedSuspect === null) return;
    const correct = selectedSuspect === dna.correctSuspectIndex;
    setIsCorrect(correct);
    setConfirmed(true);
    onComplete({ matchedSuspect: dna.suspects[selectedSuspect].label, correct });
  };

  if (!isUnlocked) {
    return (
      <Card className="opacity-50">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Dna className="h-4 w-4" /> Lab DNA — Perfil Genético</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">🔒 Complete o Lab Toxicológico para desbloquear.</p></CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-violet-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Dna className="h-4 w-4 text-violet-500" />
          Laboratório de DNA — Perfil Genético
          {confirmed && <Badge variant={isCorrect ? "default" : "destructive"} className="ml-auto text-xs">{isCorrect ? "✓ Match" : "✗ Exclusão"}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Extraction buttons */}
        <div className="flex gap-2">
          <Button onClick={extractScene} disabled={sceneExtracted || extractingScene} size="sm" variant="outline">
            {extractingScene ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Dna className="h-3 w-3 mr-1" />}
            {sceneExtracted ? "DNA Cena ✓" : "Extrair DNA (Cena)"}
          </Button>
          <Button onClick={extractSuspects} disabled={suspectsExtracted || extractingSuspects} size="sm" variant="outline">
            {extractingSuspects ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Dna className="h-3 w-3 mr-1" />}
            {suspectsExtracted ? "DNA Suspeitos ✓" : "Extrair DNA (Suspeitos)"}
          </Button>
        </div>

        {/* Scene electropherogram */}
        {sceneExtracted && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Amostra da Cena do Crime</h4>
            <ElectropherogramChart profile={dna.sceneSample} color="hsl(262, 83%, 58%)" />
          </div>
        )}

        {/* Suspects electropherograms */}
        {suspectsExtracted && sceneExtracted && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">Perfis dos Suspeitos — Clique para selecionar</h4>
            {dna.suspects.map((s, i) => (
              <div
                key={i}
                onClick={() => !confirmed && setSelectedSuspect(i)}
                className={`cursor-pointer transition-all rounded-lg ${
                  selectedSuspect === i ? "ring-2 ring-primary" : ""
                } ${confirmed ? "pointer-events-none" : ""}`}
              >
                <ElectropherogramChart
                  profile={s}
                  color={selectedSuspect === i ? "hsl(142, 71%, 45%)" : "hsl(215, 20%, 65%)"}
                  highlight={selectedSuspect === i}
                />
              </div>
            ))}
          </div>
        )}

        {/* Confirm */}
        {sceneExtracted && suspectsExtracted && !confirmed && (
          <Button onClick={confirmMatch} disabled={selectedSuspect === null} size="sm" className="w-full">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Confirmar Match
          </Button>
        )}

        {confirmed && (
          <div className={`p-3 rounded-lg border ${isCorrect ? "border-green-500/30 bg-green-500/10" : "border-destructive/30 bg-destructive/10"}`}>
            <div className="flex items-center gap-2 text-sm font-medium">
              {isCorrect ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-destructive" />}
              {isCorrect ? "Identidade Confirmada! Os perfis genéticos coincidem." : `Exclusão de Autoria. O match correto era ${dna.suspects[dna.correctSuspectIndex].label}.`}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
