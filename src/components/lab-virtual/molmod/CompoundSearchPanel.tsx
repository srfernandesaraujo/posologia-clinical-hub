import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ArrowRight, Beaker } from "lucide-react";
import { toast } from "sonner";

export interface CompoundData {
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

interface CompoundSearchPanelProps {
  onCompoundSelected: (data: CompoundData) => void;
  disabled?: boolean;
}

const PUBCHEM_BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";

export function CompoundSearchPanel({ onCompoundSelected, disabled }: CompoundSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompoundData | null>(null);

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      // Fetch compound properties
      const propUrl = `${PUBCHEM_BASE}/compound/name/${encodeURIComponent(query.trim())}/property/SMILES,ConnectivitySMILES,CanonicalSMILES,IsomericSMILES,MolecularWeight,XLogP,HBondDonorCount,HBondAcceptorCount,TPSA,MolecularFormula/JSON`;
      const res = await fetch(propUrl);
      if (!res.ok) throw new Error("Composto não encontrado no PubChem");

      const json = await res.json();
      const props = json.PropertyTable?.Properties?.[0];
      if (!props) throw new Error("Dados não disponíveis");

      const resolvedSmiles = [
        props.SMILES,
        props.ConnectivitySMILES,
        props.CanonicalSMILES,
        props.IsomericSMILES,
      ].find((value) => typeof value === "string" && value.trim().length > 0)?.trim();

      if (!resolvedSmiles) {
        throw new Error("O PubChem não retornou um SMILES válido para este composto");
      }

      const compound: CompoundData = {
        cid: Number(props.CID),
        name: query.trim(),
        smiles: resolvedSmiles,
        mw: Number(props.MolecularWeight) || 0,
        xLogP: props.XLogP != null ? Number(props.XLogP) : null,
        hbd: Number(props.HBondDonorCount) || 0,
        hba: Number(props.HBondAcceptorCount) || 0,
        tpsa: Number(props.TPSA) || 0,
        formula: props.MolecularFormula || "",
      };

      setResult(compound);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao buscar composto");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const imgUrl = result
    ? `${PUBCHEM_BASE}/compound/cid/${result.cid}/PNG?image_size=300x300`
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          M1 — Busca de Composto
          <Badge variant="outline" className="text-[10px] ml-auto">PubChem</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search bar */}
        <div className="flex gap-2">
          <Input
            placeholder="Nome do fármaco (ex: Paracetamol)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            disabled={loading || disabled}
          />
          <Button onClick={search} disabled={loading || !query.trim() || disabled} size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {result && (
          <div className="space-y-3">
            {/* 2D structure */}
            {imgUrl && (
              <div className="flex justify-center bg-background rounded-lg border border-border p-2">
                <img
                  src={imgUrl}
                  alt={`Estrutura 2D de ${result.name}`}
                  className="max-h-[200px] object-contain"
                  loading="lazy"
                />
              </div>
            )}

            {/* Properties */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Beaker className="h-3.5 w-3.5" />
                Dados Clínicos Originais
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <span className="text-muted-foreground">Fórmula:</span>
                <span className="font-medium">{result.formula}</span>
                <span className="text-muted-foreground">SMILES:</span>
                <span className="font-mono text-[10px] break-all">{result.smiles}</span>
                <span className="text-muted-foreground">MW:</span>
                <span className="font-medium">{result.mw.toFixed(2)} g/mol</span>
                <span className="text-muted-foreground">XLogP:</span>
                <span className="font-medium">{result.xLogP ?? "N/A"}</span>
                <span className="text-muted-foreground">HBD:</span>
                <span className="font-medium">{result.hbd}</span>
                <span className="text-muted-foreground">HBA:</span>
                <span className="font-medium">{result.hba}</span>
                <span className="text-muted-foreground">TPSA:</span>
                <span className="font-medium">{result.tpsa.toFixed(1)} Å²</span>
                <span className="text-muted-foreground">CID:</span>
                <span className="font-medium">{result.cid}</span>
              </div>
            </div>

            {/* Use compound button */}
            <Button
              className="w-full"
              onClick={() => onCompoundSelected(result)}
              disabled={disabled}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Usar este composto no Editor
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
