import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dna, ClipboardCheck, Loader2, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { ForensicScenario, DNAProfile } from "@/data/forensicScenarios";
import { LOCI } from "@/data/forensicScenarios";

interface DNALabPanelProps {
  scenario: ForensicScenario;
  isUnlocked: boolean;
  onComplete: (result: {
    matchedSuspect: string;
    locusComparison: Record<string, Record<string, boolean>>;
  }) => void;
}

function profileToChartData(profile: DNAProfile) {
  return profile.peaks.map((p) => ({
    locus: p.locus,
    allele1: p.alleles[0],
    allele2: p.alleles[1] ?? 0,
    ...(p.alleles[2] ? { allele3: p.alleles[2] } : {}),
  }));
}

function ElectropherogramChart({ profile, color, highlight, degradedLoci, mixtureLoci }: {
  profile: DNAProfile; color: string; highlight?: boolean;
  degradedLoci?: string[]; mixtureLoci?: string[];
}) {
  const data = profileToChartData(profile);

  return (
    <div className={`bg-muted/30 rounded-lg p-2 border ${highlight ? "border-primary ring-1 ring-primary/30" : "border-border/50"}`}>
      <div className="flex items-center gap-2 mb-1">
        <p className="text-[11px] font-semibold text-muted-foreground">{profile.label}</p>
        {mixtureLoci && mixtureLoci.length > 0 && (
          <Badge variant="outline" className="text-[9px] h-4">
            <AlertTriangle className="h-2 w-2 mr-0.5" /> Possível mistura
          </Badge>
        )}
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={data} barGap={2} barSize={12}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
          <XAxis dataKey="locus" tick={{ fontSize: 9 }} />
          <YAxis hide domain={[0, 30]} />
          <Tooltip
            formatter={(v: number, name: string) => [v, name === "allele1" ? "Alelo 1" : name === "allele2" ? "Alelo 2" : "Alelo 3"]}
            labelFormatter={(l) => {
              if (degradedLoci?.includes(l as string)) return `${l} ⚠ DEGRADADO`;
              if (mixtureLoci?.includes(l as string)) return `${l} ⚠ MISTURA`;
              return l;
            }}
          />
          <Bar dataKey="allele1" fill={color} radius={[2, 2, 0, 0]} />
          <Bar dataKey="allele2" fill={`${color}99`} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      {degradedLoci && degradedLoci.length > 0 && (
        <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-0.5">
          ⚠ Loci degradados (sem resultado confiável): {degradedLoci.join(", ")}
        </p>
      )}
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

  // Locus-by-locus comparison: { "suspectIndex-locus": true/false }
  const [locusChecks, setLocusChecks] = useState<Record<string, boolean>>({});

  const dna = scenario.dnaAnalysis;
  const activeLoci = LOCI.filter((l) => !dna.degradedLoci.includes(l));

  const extractScene = () => {
    setExtractingScene(true);
    setTimeout(() => { setSceneExtracted(true); setExtractingScene(false); }, 1500);
  };

  const extractSuspects = () => {
    setExtractingSuspects(true);
    setTimeout(() => { setSuspectsExtracted(true); setExtractingSuspects(false); }, 2000);
  };

  const toggleLocusCheck = (suspectIdx: number, locus: string) => {
    const key = `${suspectIdx}-${locus}`;
    setLocusChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const confirmMatch = () => {
    if (selectedSuspect === null) return;
    setConfirmed(true);

    // Build comparison data
    const comparison: Record<string, Record<string, boolean>> = {};
    dna.suspects.forEach((s, i) => {
      comparison[s.label] = {};
      activeLoci.forEach((locus) => {
        comparison[s.label][locus] = locusChecks[`${i}-${locus}`] || false;
      });
    });

    onComplete({
      matchedSuspect: dna.suspects[selectedSuspect].label,
      locusComparison: comparison,
    });
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
          {confirmed && <Badge variant="secondary" className="ml-auto text-xs">✓ Resposta registrada</Badge>}
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
            <ElectropherogramChart
              profile={dna.sceneSample}
              color="hsl(262, 83%, 58%)"
              degradedLoci={dna.degradedLoci}
              mixtureLoci={dna.mixtureLoci}
            />
          </div>
        )}

        {/* Suspects electropherograms */}
        {suspectsExtracted && sceneExtracted && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">Perfis dos Suspeitos</h4>
            {dna.suspects.map((s, i) => (
              <ElectropherogramChart key={i} profile={s} color="hsl(215, 20%, 65%)" />
            ))}
          </div>
        )}

        {/* Locus-by-locus comparison form */}
        {suspectsExtracted && sceneExtracted && !confirmed && (
          <div className="bg-background rounded-lg p-3 border border-border/50 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Comparação Locus-por-Locus</p>
            <p className="text-xs text-muted-foreground">
              Compare os alelos de cada locus entre a amostra da cena e cada suspeito. Marque os loci onde há coincidência de AMBOS os alelos.
            </p>

            {dna.degradedLoci.length > 0 && (
              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-400">
                ⚠ Loci degradados ({dna.degradedLoci.join(", ")}): sem resultado confiável — desconsidere na comparação.
              </div>
            )}

            {dna.mixtureLoci.length > 0 && (
              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-400">
                ⚠ Possível mistura de DNA nos loci: {dna.mixtureLoci.join(", ")}. Pode conter alelos de mais de um contribuidor.
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-1 pr-2 font-semibold text-muted-foreground">Locus</th>
                    <th className="text-center py-1 px-2 font-semibold text-muted-foreground">Cena</th>
                    {dna.suspects.map((s, i) => (
                      <th key={i} className="text-center py-1 px-1 font-semibold text-muted-foreground min-w-[80px]">
                        <span className="block">{s.label.split("—")[0]?.trim()}</span>
                        <span className="block text-[9px] font-normal">{s.label.split("—")[1]?.trim()}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {LOCI.map((locus) => {
                    const isDegraded = dna.degradedLoci.includes(locus);
                    const isMixture = dna.mixtureLoci.includes(locus);
                    const sceneAlleles = dna.sceneSample.peaks.find((p) => p.locus === locus)?.alleles || [];

                    return (
                      <tr key={locus} className={`border-b border-border/20 ${isDegraded ? "opacity-50" : ""}`}>
                        <td className="py-2 pr-2 font-medium">
                          {locus}
                          {isDegraded && <span className="text-amber-500 ml-1">⚠</span>}
                          {isMixture && <span className="text-amber-500 ml-1">⚠</span>}
                        </td>
                        <td className="py-2 px-2 text-center font-mono">
                          {isDegraded ? "—" : sceneAlleles.join(" / ")}
                        </td>
                        {dna.suspects.map((suspect, si) => {
                          const suspectAlleles = suspect.peaks.find((p) => p.locus === locus)?.alleles || [];
                          return (
                            <td key={si} className="py-2 px-1 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <span className="font-mono text-[10px]">{suspectAlleles.join("/")}</span>
                                {!isDegraded && (
                                  <Checkbox
                                    checked={locusChecks[`${si}-${locus}`] || false}
                                    onCheckedChange={() => toggleLocusCheck(si, locus)}
                                    className="h-3.5 w-3.5"
                                  />
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium">Com base na comparação, qual suspeito apresenta match?</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                {dna.suspects.map((s, i) => {
                  const matchCount = activeLoci.filter((l) => locusChecks[`${i}-${l}`]).length;
                  return (
                    <Button
                      key={i}
                      variant={selectedSuspect === i ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-auto py-2 flex-col items-start"
                      onClick={() => setSelectedSuspect(i)}
                    >
                      <span className="font-medium">{s.label.split("—")[1]?.trim() || s.label}</span>
                      <span className="text-[10px] opacity-70">{matchCount}/{activeLoci.length} loci marcados</span>
                    </Button>
                  );
                })}
              </div>

              <Button onClick={confirmMatch} disabled={selectedSuspect === null} size="sm" className="w-full">
                <ClipboardCheck className="h-3 w-3 mr-1" /> Registrar Análise
              </Button>
            </div>
          </div>
        )}

        {confirmed && (
          <div className="p-3 rounded-lg border border-border bg-muted/20">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ClipboardCheck className="h-4 w-4" />
              Resposta registrada. O resultado será revelado na conclusão pericial.
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              <p>Suspeito selecionado: <span className="font-medium">{selectedSuspect !== null ? dna.suspects[selectedSuspect].label : "—"}</span></p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
