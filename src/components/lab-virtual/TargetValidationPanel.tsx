import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Dna } from "lucide-react";
import { MoleculeViewer } from "./MoleculeViewer";

const PRESET_TARGETS = [
  { id: "P08588", name: "Receptor Beta-1 Adrenérgico", category: "Receptor", drugs: "Atenolol" },
  { id: "P35372", name: "Receptor Opioide Mi", category: "Receptor", drugs: "Morfina, Naloxona" },
  { id: "P04150", name: "Receptor de Glicocorticoides", category: "Receptor", drugs: "Dexametasona" },
  { id: "P35354", name: "COX-2", category: "Enzima", drugs: "Ibuprofeno, Celecoxibe" },
  { id: "P12821", name: "ECA", category: "Enzima", drugs: "Captopril, Enalapril" },
  { id: "P04035", name: "HMG-CoA Redutase", category: "Enzima", drugs: "Sinvastatina" },
  { id: "P22303", name: "Acetilcolinesterase", category: "Enzima", drugs: "Donepezila" },
  { id: "P0DTD1", name: "Protease Mpro SARS-CoV-2", category: "Antiviral", drugs: "Nirmatrelvir" },
  { id: "P0A050", name: "PBP2 S. aureus", category: "Antimicrobiano", drugs: "Beta-lactâmicos" },
];

interface TargetValidationPanelProps {
  onTargetSelected: (target: { id: string; name: string } | null) => void;
}

export function TargetValidationPanel({ onTargetSelected }: TargetValidationPanelProps) {
  const [selectedPreset, setSelectedPreset] = useState("");
  const [customId, setCustomId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pdbUrl, setPdbUrl] = useState<string | null>(null);
  const [proteinInfo, setProteinInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchProtein = async (uniprotId: string) => {
    setIsLoading(true);
    setError(null);
    setPdbUrl(null);
    setProteinInfo(null);

    try {
      const res = await fetch(`https://alphafold.ebi.ac.uk/api/prediction/${uniprotId}`);
      if (!res.ok) throw new Error("Proteína não encontrada");
      const data = await res.json();
      const entry = Array.isArray(data) ? data[0] : data;
      setPdbUrl(entry.pdbUrl || entry.cifUrl);
      setProteinInfo({
        name: entry.uniprotDescription || uniprotId,
        organism: entry.organismScientificName || "—",
        confidence: entry.globalMetricValue != null ? `${(entry.globalMetricValue * 100).toFixed(1)}%` : "—",
      });
      const preset = PRESET_TARGETS.find((t) => t.id === uniprotId);
      onTargetSelected({ id: uniprotId, name: preset?.name || entry.uniprotDescription || uniprotId });
    } catch {
      setError("Não foi possível carregar a proteína. Verifique o ID UniProt.");
      onTargetSelected(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    setCustomId("");
    fetchProtein(value);
  };

  const handleCustomSearch = () => {
    if (customId.trim()) {
      setSelectedPreset("");
      fetchProtein(customId.trim().toUpperCase());
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Dna className="h-5 w-5 text-primary" />
          Módulo 1 — Validação do Alvo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Alvos Farmacológicos Clássicos</label>
          <Select value={selectedPreset} onValueChange={handlePresetChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma proteína..." />
            </SelectTrigger>
            <SelectContent>
              {PRESET_TARGETS.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="flex items-center gap-2">
                    {t.name}
                    <span className="text-muted-foreground text-xs">({t.id})</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Ou insira um ID UniProt (ex: P00533)"
            value={customId}
            onChange={(e) => setCustomId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCustomSearch()}
          />
          <Button size="icon" variant="outline" onClick={handleCustomSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        {proteinInfo && (
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary">{proteinInfo.name}</Badge>
            <Badge variant="outline">{proteinInfo.organism}</Badge>
            <Badge variant="outline">Confiança: {proteinInfo.confidence}</Badge>
          </div>
        )}

        <MoleculeViewer pdbUrl={pdbUrl} isLoading={isLoading} />
      </CardContent>
    </Card>
  );
}
