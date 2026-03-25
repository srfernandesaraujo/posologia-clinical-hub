import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Dna, ExternalLink } from "lucide-react";
import { toast } from "sonner";

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

interface ProteinTargetPanelProps {
  disabled?: boolean;
}

export function ProteinTargetPanel({ disabled }: ProteinTargetPanelProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [protein, setProtein] = useState<ProteinInfo | null>(null);
  const [selectedPdb, setSelectedPdb] = useState<string>("");
  const [pdbLoading, setPdbLoading] = useState(false);
  const viewerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchProtein = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setProtein(null);
    setSelectedPdb("");

    try {
      const url = `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(query.trim())}&fields=accession,protein_name,gene_names,organism_name,cc_function,xref_pdb&size=1&format=json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Proteína não encontrada");

      const json = await res.json();
      const entry = json.results?.[0];
      if (!entry) throw new Error("Nenhum resultado encontrado no UniProt");

      const pdbRefs = entry.uniProtKBCrossReferences
        ?.filter((x: any) => x.database === "PDB")
        ?.map((x: any) => x.id) || [];

      const funcComment = entry.comments?.find((c: any) => c.commentType === "FUNCTION");
      const funcText = funcComment?.texts?.[0]?.value || "Função não disponível";

      const info: ProteinInfo = {
        accession: entry.primaryAccession || "",
        name: entry.proteinDescription?.recommendedName?.fullName?.value ||
              entry.proteinDescription?.submissionNames?.[0]?.fullName?.value || query,
        gene: entry.genes?.[0]?.geneName?.value || "—",
        organism: entry.organism?.scientificName || "—",
        function: funcText,
        pdbIds: pdbRefs.slice(0, 10),
      };

      setProtein(info);
      if (info.pdbIds.length > 0) {
        setSelectedPdb(info.pdbIds[0]);
      }
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
      viewerRef.current = window.$3Dmol.createViewer(containerRef.current, {
        backgroundColor: "0x1a1a2e",
      });
    }

    const viewer = viewerRef.current;
    viewer.removeAllModels();
    viewer.removeAllSurfaces();

    let cancelled = false;

    fetch(`https://files.rcsb.org/download/${selectedPdb}.pdb`)
      .then(res => {
        if (!res.ok) throw new Error("PDB não encontrado");
        return res.text();
      })
      .then(pdb => {
        if (cancelled) return;
        viewer.addModel(pdb, "pdb");
        viewer.setStyle({}, { cartoon: { color: "spectrum" } });
        viewer.zoomTo();
        viewer.render();
      })
      .catch(() => {
        if (!cancelled) toast.error("Erro ao carregar estrutura 3D");
      })
      .finally(() => {
        if (!cancelled) setPdbLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedPdb]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (viewerRef.current) {
        try { viewerRef.current.clear(); } catch {}
        viewerRef.current = null;
      }
    };
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Dna className="h-4 w-4 text-primary" />
          Alvo Proteico
          <Badge variant="outline" className="text-[10px] ml-auto">UniProt + RCSB PDB</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Nome da proteína ou gene (ex: ACE2, EGFR)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchProtein()}
            disabled={loading || disabled}
          />
          <Button onClick={searchProtein} disabled={loading || !query.trim() || disabled} size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {protein && (
          <div className="space-y-3">
            {/* Protein info */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">{protein.name}</h4>
                <a
                  href={`https://www.uniprot.org/uniprot/${protein.accession}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
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
              <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-3">{protein.function}</p>
            </div>

            {/* PDB selection */}
            {protein.pdbIds.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Estruturas 3D disponíveis ({protein.pdbIds.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {protein.pdbIds.map(pdb => (
                    <Button
                      key={pdb}
                      size="sm"
                      variant={selectedPdb === pdb ? "default" : "outline"}
                      className="text-xs h-6 px-2"
                      onClick={() => setSelectedPdb(pdb)}
                    >
                      {pdb}
                    </Button>
                  ))}
                </div>

                {/* 3D viewer */}
                <div className="relative">
                  {pdbLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 rounded-lg">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                  <div
                    ref={containerRef}
                    className="w-full h-[250px] rounded-lg border border-border overflow-hidden"
                    style={{ position: "relative", minHeight: "250px" }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground text-center">
                  PDB: {selectedPdb} — Fonte: RCSB Protein Data Bank
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-3">
                Nenhuma estrutura 3D disponível no PDB para esta proteína
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
