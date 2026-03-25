import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Loader2, GitCompare, Plus } from "lucide-react";
import { toast } from "sonner";
import type { CompoundData } from "./CompoundSearchPanel";

interface SimilarCompound {
  cid: number;
  name: string;
  smiles: string;
  mw: number;
  xLogP: number | null;
  hbd: number;
  hba: number;
  tpsa: number;
  formula: string;
}

interface SimilaritySearchPanelProps {
  smiles: string;
  compoundName?: string;
  disabled?: boolean;
  onAddToLibrary: (compound: CompoundData) => void;
}

const PUBCHEM_BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";

export function SimilaritySearchPanel({ smiles, compoundName, disabled, onAddToLibrary }: SimilaritySearchPanelProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SimilarCompound[]>([]);
  const [threshold, setThreshold] = useState(80);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async () => {
    if (!smiles) return;
    setLoading(true);
    setSearched(true);
    setResults([]);

    try {
      // Step 1: POST SMILES to get CID list via fastsimilarity_2d
      const listRes = await fetch(
        `${PUBCHEM_BASE}/compound/fastsimilarity_2d/smiles/cids/JSON?Threshold=${threshold}&MaxRecords=10`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `smiles=${encodeURIComponent(smiles)}`,
        }
      );
      if (!listRes.ok) throw new Error("Busca de similaridade falhou");

      const listJson = await listRes.json();
      const cids: number[] = listJson.IdentifierList?.CID || [];
      if (cids.length === 0) {
        setResults([]);
        toast.info("Nenhum análogo encontrado com esse limiar de similaridade");
        return;
      }

      // Step 2: Fetch properties for found CIDs
      const propRes = await fetch(
        `${PUBCHEM_BASE}/compound/cid/${cids.join(",")}/property/CID,Title,CanonicalSMILES,MolecularWeight,XLogP,HBondDonorCount,HBondAcceptorCount,TPSA,MolecularFormula/JSON`
      );
      if (!propRes.ok) throw new Error("Erro ao buscar propriedades dos análogos");

      const propJson = await propRes.json();
      const props = propJson.PropertyTable?.Properties || [];

      const compounds: SimilarCompound[] = props
        .filter((p: any) => p.CanonicalSMILES)
        .map((p: any) => ({
          cid: Number(p.CID),
          name: p.Title || `CID ${p.CID}`,
          smiles: p.CanonicalSMILES,
          mw: Number(p.MolecularWeight) || 0,
          xLogP: p.XLogP != null ? Number(p.XLogP) : null,
          hbd: Number(p.HBondDonorCount) || 0,
          hba: Number(p.HBondAcceptorCount) || 0,
          tpsa: Number(p.TPSA) || 0,
          formula: p.MolecularFormula || "",
        }));

      setResults(compounds);
      if (compounds.length === 0) {
        toast.info("Nenhum análogo encontrado com esse limiar de similaridade");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro na busca de similaridade");
    } finally {
      setLoading(false);
    }
  }, [smiles, threshold]);

  const handleAdd = (c: SimilarCompound) => {
    onAddToLibrary({
      cid: c.cid,
      name: c.name,
      smiles: c.smiles,
      mw: c.mw,
      xLogP: c.xLogP,
      hbd: c.hbd,
      hba: c.hba,
      tpsa: c.tpsa,
      formula: c.formula,
    });
    toast.success(`${c.name} adicionado à biblioteca`);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <GitCompare className="h-4 w-4 text-primary" />
          Busca de Similaridade Molecular
          <Badge variant="outline" className="text-[10px] ml-auto">PubChem 2D</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Limiar Tanimoto</span>
            <Badge variant="secondary" className="text-[10px]">{threshold}%</Badge>
          </div>
          <Slider
            value={[threshold]}
            onValueChange={([v]) => setThreshold(v)}
            min={60}
            max={99}
            step={1}
            disabled={disabled}
          />
        </div>

        <Button
          className="w-full"
          variant="outline"
          onClick={search}
          disabled={!smiles || loading || disabled}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <GitCompare className="h-4 w-4 mr-2" />}
          Buscar Análogos de "{compoundName || "..."}"
        </Button>

        {searched && results.length > 0 && (
          <div className="space-y-2 max-h-[300px] overflow-auto">
            {results.map(c => (
              <div key={c.cid} className="flex items-center gap-3 bg-muted/30 rounded-lg p-2.5">
                <img
                  src={`${PUBCHEM_BASE}/compound/cid/${c.cid}/PNG?image_size=80x80`}
                  alt={c.name}
                  className="w-16 h-16 rounded border border-border object-contain bg-background shrink-0"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">{c.formula}</p>
                  <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                    <span>MW: {c.mw.toFixed(1)}</span>
                    <span>LogP: {c.xLogP?.toFixed(1) ?? "N/A"}</span>
                    <span>TPSA: {c.tpsa.toFixed(1)}</span>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-7 text-xs shrink-0" onClick={() => handleAdd(c)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Biblioteca
                </Button>
              </div>
            ))}
          </div>
        )}

        {searched && !loading && results.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">
            Nenhum análogo encontrado. Tente reduzir o limiar Tanimoto.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
