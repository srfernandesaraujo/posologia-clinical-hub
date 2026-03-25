import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Search, Dna, ExternalLink, FlaskConical, Sparkles, Trophy, ThumbsUp, ThumbsDown, Target } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { CompoundData } from "./CompoundSearchPanel";

declare global {
  interface Window {
    $3Dmol: any;
  }
}

interface ProteinInfo {
  accession: string;
  name: string;
  gene: string;
  organism: string;
  function: string;
  pdbIds: string[];
}

interface DockingCompound {
  label: string;
  name: string;
  smiles: string;
  mw: number;
  logP: number | null;
  hbd: number;
  hba: number;
  tpsa: number;
}

interface CompoundAnalysis {
  label: string;
  affinity_score: number;
  binding_mode: string;
  strengths: string[];
  weaknesses: string[];
  refined_deltaG: number;
  refined_ki: string;
}

interface DockingResult {
  compound_analyses: CompoundAnalysis[];
  ranking: string[];
  comparative_summary: string;
}

interface DockingComparativoPanelProps {
  originalCompound: CompoundData | null;
  modifiedSmiles: string;
  analogCompound: CompoundData | null;
  disabled?: boolean;
}

// Simplified ΔG estimation: ΔG ≈ -0.73 * ln(MW) + 0.1 * LogP - 0.02 * TPSA - 0.5 * HBD
function estimateDeltaG(mw: number, logP: number | null, tpsa: number, hbd: number): number {
  const lp = logP ?? 2;
  const dG = -0.73 * Math.log(mw > 0 ? mw : 300) + 0.1 * lp - 0.02 * tpsa - 0.5 * hbd;
  return Math.round(dG * 100) / 100;
}

// Ki from ΔG: Ki = exp(ΔG / (R*T)) where R*T ≈ 0.592 kcal/mol at 298K, result in nM
function estimateKi(deltaG: number): string {
  const RT = 0.592;
  const kiMolar = Math.exp(deltaG / RT);
  const kiNM = kiMolar * 1e9;
  if (kiNM < 1) return `${(kiNM * 1000).toFixed(1)} pM`;
  if (kiNM < 1000) return `${kiNM.toFixed(1)} nM`;
  return `${(kiNM / 1000).toFixed(1)} µM`;
}

export function DockingComparativoPanel({ originalCompound, modifiedSmiles, analogCompound, disabled }: DockingComparativoPanelProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [protein, setProtein] = useState<ProteinInfo | null>(null);
  const [selectedPdb, setSelectedPdb] = useState("");
  const [pdbLoading, setPdbLoading] = useState(false);
  const viewerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [dockingResult, setDockingResult] = useState<DockingResult | null>(null);
  const [dockingLoading, setDockingLoading] = useState(false);

  // Build list of available compounds for docking
  const dockingCompounds: DockingCompound[] = [];
  if (originalCompound) {
    dockingCompounds.push({
      label: "Original",
      name: originalCompound.name,
      smiles: originalCompound.smiles,
      mw: originalCompound.mw,
      logP: originalCompound.xLogP,
      hbd: originalCompound.hbd,
      hba: originalCompound.hba,
      tpsa: originalCompound.tpsa,
    });
  }
  if (modifiedSmiles && originalCompound && modifiedSmiles !== originalCompound.smiles) {
    dockingCompounds.push({
      label: "Modificado",
      name: `${originalCompound.name} (mod.)`,
      smiles: modifiedSmiles,
      mw: originalCompound.mw, // approximate
      logP: originalCompound.xLogP,
      hbd: originalCompound.hbd,
      hba: originalCompound.hba,
      tpsa: originalCompound.tpsa,
    });
  }
  if (analogCompound) {
    dockingCompounds.push({
      label: "Análogo",
      name: analogCompound.name,
      smiles: analogCompound.smiles,
      mw: analogCompound.mw,
      logP: analogCompound.xLogP,
      hbd: analogCompound.hbd,
      hba: analogCompound.hba,
      tpsa: analogCompound.tpsa,
    });
  }

  const searchProtein = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setProtein(null);
    setSelectedPdb("");
    setDockingResult(null);

    try {
      const url = `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(query.trim())}&fields=accession,protein_name,gene_names,organism_name,cc_function,xref_pdb&size=1&format=json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Proteína não encontrada");
      const json = await res.json();
      const entry = json.results?.[0];
      if (!entry) throw new Error("Nenhum resultado encontrado no UniProt");

      const pdbRefs = entry.uniProtKBCrossReferences?.filter((x: any) => x.database === "PDB")?.map((x: any) => x.id) || [];
      const funcComment = entry.comments?.find((c: any) => c.commentType === "FUNCTION");
      const funcText = funcComment?.texts?.[0]?.value || "Função não disponível";

      const info: ProteinInfo = {
        accession: entry.primaryAccession || "",
        name: entry.proteinDescription?.recommendedName?.fullName?.value || entry.proteinDescription?.submissionNames?.[0]?.fullName?.value || query,
        gene: entry.genes?.[0]?.geneName?.value || "—",
        organism: entry.organism?.scientificName || "—",
        function: funcText,
        pdbIds: pdbRefs.slice(0, 10),
      };

      setProtein(info);
      if (info.pdbIds.length > 0) setSelectedPdb(info.pdbIds[0]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao buscar proteína");
    } finally {
      setLoading(false);
    }
  }, [query]);

  // Load PDB 3D structure
  useEffect(() => {
    if (!selectedPdb || !containerRef.current || !window.$3Dmol) return;
    setPdbLoading(true);

    if (!viewerRef.current) {
      viewerRef.current = window.$3Dmol.createViewer(containerRef.current, { backgroundColor: "0x1a1a2e" });
    }

    const viewer = viewerRef.current;
    viewer.removeAllModels();
    viewer.removeAllSurfaces();

    let cancelled = false;
    fetch(`https://files.rcsb.org/download/${selectedPdb}.pdb`)
      .then(res => { if (!res.ok) throw new Error(); return res.text(); })
      .then(pdb => {
        if (cancelled) return;
        viewer.addModel(pdb, "pdb");
        viewer.setStyle({}, { cartoon: { color: "spectrum" } });
        viewer.zoomTo();
        viewer.render();
      })
      .catch(() => { if (!cancelled) toast.error("Erro ao carregar PDB"); })
      .finally(() => { if (!cancelled) setPdbLoading(false); });

    return () => { cancelled = true; };
  }, [selectedPdb]);

  useEffect(() => {
    return () => { if (viewerRef.current) { try { viewerRef.current.clear(); } catch {} viewerRef.current = null; } };
  }, []);

  // Run docking
  const runDocking = useCallback(async () => {
    if (!protein || dockingCompounds.length === 0) return;
    setDockingLoading(true);
    setDockingResult(null);

    try {
      const compoundsWithEstimates = dockingCompounds.map(c => {
        const dG = estimateDeltaG(c.mw, c.logP, c.tpsa, c.hbd);
        return { ...c, deltaG: dG, ki: estimateKi(dG) };
      });

      const { data, error } = await supabase.functions.invoke("docking-comparativo", {
        body: {
          targetProtein: { ...protein, pdbId: selectedPdb },
          compounds: compoundsWithEstimates,
          userId: user?.id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDockingResult(data as DockingResult);
      toast.success("Docking comparativo concluído!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no docking comparativo");
    } finally {
      setDockingLoading(false);
    }
  }, [protein, dockingCompounds, selectedPdb, user?.id]);

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-400";
    if (score >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  const getRankBadge = (label: string, ranking: string[]) => {
    const pos = ranking.indexOf(label);
    if (pos === 0) return <Badge className="bg-yellow-500/20 text-yellow-400 text-[10px]"><Trophy className="h-3 w-3 mr-1" />1º</Badge>;
    if (pos === 1) return <Badge variant="secondary" className="text-[10px]">2º</Badge>;
    return <Badge variant="outline" className="text-[10px]">3º</Badge>;
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Docking Comparativo
          <Badge variant="outline" className="text-[10px] ml-auto">UniProt + RCSB PDB + IA</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Protein search */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">1. Selecione o Alvo Proteico</label>
          <div className="flex gap-2">
            <Input
              placeholder="Nome da proteína ou gene (ex: ACE2, EGFR, COX-2)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchProtein()}
              disabled={loading || disabled}
            />
            <Button onClick={searchProtein} disabled={loading || !query.trim() || disabled} size="sm">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {protein && (
          <div className="space-y-4">
            {/* Protein info card */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">{protein.name}</h4>
                <a href={`https://www.uniprot.org/uniprot/${protein.accession}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <span className="text-muted-foreground">Accession:</span>
                <span className="font-mono font-medium">{protein.accession}</span>
                <span className="text-muted-foreground">Gene:</span>
                <span className="font-medium">{protein.gene}</span>
                <span className="text-muted-foreground">Organismo:</span>
                <span className="font-medium">{protein.organism}</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{protein.function}</p>
            </div>

            {/* PDB + 3D viewer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                {protein.pdbIds.length > 0 && (
                  <>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase">Estrutura 3D ({protein.pdbIds.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {protein.pdbIds.map(pdb => (
                        <Button key={pdb} size="sm" variant={selectedPdb === pdb ? "default" : "outline"} className="text-xs h-6 px-2" onClick={() => setSelectedPdb(pdb)}>
                          {pdb}
                        </Button>
                      ))}
                    </div>
                  </>
                )}
                <div className="relative">
                  {pdbLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 rounded-lg">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                  <div ref={containerRef} className="w-full h-[220px] rounded-lg border border-border overflow-hidden" style={{ position: "relative", minHeight: "220px" }} />
                  <p className="text-[10px] text-muted-foreground text-center mt-1">PDB: {selectedPdb} — RCSB</p>
                </div>
              </div>

              {/* Compounds for docking */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">2. Compostos para Docking</p>
                {dockingCompounds.length === 0 ? (
                  <div className="bg-muted/30 rounded-lg p-4 text-center">
                    <p className="text-xs text-muted-foreground">Selecione um composto no M1 para iniciar o docking</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dockingCompounds.map((c, i) => {
                      const dG = estimateDeltaG(c.mw, c.logP, c.tpsa, c.hbd);
                      return (
                        <div key={i} className="bg-muted/30 rounded-lg p-2.5 space-y-1">
                          <div className="flex items-center justify-between">
                            <Badge variant={c.label === "Original" ? "default" : c.label === "Modificado" ? "secondary" : "outline"} className="text-[10px]">
                              {c.label}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-mono">{c.name}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-[10px]">
                            <div><span className="text-muted-foreground">MW:</span> {c.mw.toFixed(0)}</div>
                            <div><span className="text-muted-foreground">ΔG:</span> {dG} kcal/mol</div>
                            <div><span className="text-muted-foreground">Ki:</span> {estimateKi(dG)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!analogCompound && (
                  <p className="text-[10px] text-muted-foreground italic">
                    💡 Selecione um análogo na Busca de Similaridade para incluir no docking
                  </p>
                )}

                <Button
                  onClick={runDocking}
                  disabled={dockingLoading || dockingCompounds.length === 0 || !protein}
                  className="w-full"
                  size="sm"
                >
                  {dockingLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Analisando...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" /> Executar Docking Comparativo ({dockingCompounds.length} compostos)</>
                  )}
                </Button>
              </div>
            </div>

            {/* Docking results */}
            {dockingResult && (
              <div className="space-y-4 border-t border-border pt-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  Resultados do Docking Comparativo
                </h4>

                {/* Comparative cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {dockingResult.compound_analyses.map((analysis, i) => (
                    <div key={i} className="bg-muted/30 rounded-lg p-3 space-y-2.5 border border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{analysis.label}</span>
                        {getRankBadge(analysis.label, dockingResult.ranking)}
                      </div>

                      {/* Affinity score */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-muted-foreground">Afinidade</span>
                          <span className={`font-bold ${getScoreColor(analysis.affinity_score)}`}>{analysis.affinity_score}/100</span>
                        </div>
                        <Progress value={analysis.affinity_score} className="h-1.5" />
                      </div>

                      {/* Energies */}
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-muted-foreground block">ΔG (IA)</span>
                          <span className="font-mono font-medium">{analysis.refined_deltaG} kcal/mol</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Ki (IA)</span>
                          <span className="font-mono font-medium">{analysis.refined_ki}</span>
                        </div>
                      </div>

                      {/* Binding mode */}
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{analysis.binding_mode}</p>

                      {/* Strengths / Weaknesses */}
                      <div className="space-y-1">
                        {analysis.strengths.map((s, j) => (
                          <div key={`s-${j}`} className="flex items-start gap-1.5 text-[10px]">
                            <ThumbsUp className="h-3 w-3 text-green-400 shrink-0 mt-0.5" />
                            <span>{s}</span>
                          </div>
                        ))}
                        {analysis.weaknesses.map((w, j) => (
                          <div key={`w-${j}`} className="flex items-start gap-1.5 text-[10px]">
                            <ThumbsDown className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <p className="text-xs leading-relaxed">{dockingResult.comparative_summary}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {!protein && !loading && (
          <div className="text-center py-6">
            <Dna className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Busque um alvo proteico para iniciar o docking comparativo</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              O sistema comparará os compostos Original, Modificado e Análogo contra o alvo selecionado
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
