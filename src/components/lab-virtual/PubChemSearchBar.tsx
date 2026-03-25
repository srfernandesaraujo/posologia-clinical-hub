import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Download } from "lucide-react";
import { toast } from "sonner";
import type { DrugProperties } from "./DrugDesignPanel";

const PUBCHEM_BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";

export interface PubChemCompound {
  cid: number;
  name: string;
  smiles: string;
  mw: number;
  logP: number | null;
  hbd: number;
  hba: number;
  tpsa: number;
  formula: string;
  rotatableBonds: number;
}

interface PubChemSearchBarProps {
  onImport: (props: DrugProperties, compound: PubChemCompound) => void;
}

export function PubChemSearchBar({ onImport }: PubChemSearchBarProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PubChemCompound | null>(null);

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const propUrl = `${PUBCHEM_BASE}/compound/name/${encodeURIComponent(query.trim())}/property/SMILES,CanonicalSMILES,IsomericSMILES,ConnectivitySMILES,MolecularWeight,XLogP,HBondDonorCount,HBondAcceptorCount,TPSA,MolecularFormula,RotatableBondCount/JSON`;
      const res = await fetch(propUrl);
      if (!res.ok) throw new Error("Composto não encontrado no PubChem");

      const json = await res.json();
      const props = json.PropertyTable?.Properties?.[0];
      if (!props) throw new Error("Dados não disponíveis");

      const smiles = [props.CanonicalSMILES, props.IsomericSMILES, props.SMILES, props.ConnectivitySMILES]
        .find((v) => typeof v === "string" && v.trim().length > 0)?.trim() || "";
      if (!smiles) throw new Error("SMILES não disponível");

      const compound: PubChemCompound = {
        cid: Number(props.CID),
        name: query.trim(),
        smiles,
        mw: Number(props.MolecularWeight) || 0,
        logP: props.XLogP != null ? Number(props.XLogP) : null,
        hbd: Number(props.HBondDonorCount) || 0,
        hba: Number(props.HBondAcceptorCount) || 0,
        tpsa: Number(props.TPSA) || 0,
        formula: props.MolecularFormula || "",
        rotatableBonds: Number(props.RotatableBondCount) || 0,
      };

      setResult(compound);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao buscar composto");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleImport = () => {
    if (!result) return;
    onImport(
      {
        mw: Math.round(result.mw),
        logP: result.logP != null ? Math.round(result.logP * 10) / 10 : 2.5,
        hbd: result.hbd,
        hba: result.hba,
      },
      result,
    );
    toast.success(`Propriedades de "${result.name}" importadas do PubChem!`);
  };

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[10px] shrink-0">PubChem</Badge>
        <span className="text-xs text-muted-foreground">Buscar composto real e importar propriedades</span>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Ex: Aspirina, Metformina, Atorvastatina..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          disabled={loading}
          className="text-sm"
        />
        <Button onClick={search} disabled={loading || !query.trim()} size="sm" variant="outline">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>
      {result && (
        <div className="flex items-center justify-between gap-2 bg-background rounded-md border border-border p-2">
          <div className="text-xs space-y-0.5 min-w-0">
            <p className="font-medium truncate">{result.name} <span className="text-muted-foreground">(CID: {result.cid})</span></p>
            <p className="text-muted-foreground">
              MW: {result.mw.toFixed(1)} | LogP: {result.logP ?? "N/A"} | HBD: {result.hbd} | HBA: {result.hba} | TPSA: {result.tpsa.toFixed(1)}
            </p>
          </div>
          <Button size="sm" onClick={handleImport} className="shrink-0">
            <Download className="h-3.5 w-3.5 mr-1" /> Importar
          </Button>
        </div>
      )}
    </div>
  );
}
