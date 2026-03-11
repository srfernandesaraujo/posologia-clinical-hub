import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FlaskConical, Info, AlertTriangle, Beaker, Atom } from "lucide-react";

export interface DrugProperties {
  mw: number;
  logP: number;
  hbd: number;
  hba: number;
}

interface DrugDesignPanelProps {
  properties: DrugProperties;
  onChange: (props: DrugProperties) => void;
  activeTab: "sliders" | "smiles";
  onTabChange: (tab: "sliders" | "smiles") => void;
}

const SMILES_EXAMPLES = [
  { name: "Aspirina", smiles: "CC(=O)Oc1ccccc1C(=O)O" },
  { name: "Ibuprofeno", smiles: "CC(C)Cc1ccc(cc1)C(C)C(=O)O" },
  { name: "Paracetamol", smiles: "CC(=O)Nc1ccc(O)cc1" },
];

function LipinskiIndicator({ value, max, label }: { value: number; max: number; label: string }) {
  const ok = value <= max;
  return (
    <Badge variant={ok ? "default" : "destructive"} className={ok ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
      {ok ? "✓" : "✗"} {label}
    </Badge>
  );
}

function PropertySlider({
  label,
  tooltip,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  tooltip: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium">{label}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">{tooltip}</TooltipContent>
          </Tooltip>
        </div>
        <span className="text-sm font-mono text-primary">
          {value} {unit}
        </span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

function LipinskiSection({ properties }: { properties: DrugProperties }) {
  const violations = [
    properties.mw > 500,
    properties.logP > 5,
    properties.hbd > 5,
    properties.hba > 10,
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      {violations > 1 && (
        <Alert className="border-yellow-600/50 bg-yellow-950/30">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-yellow-200 text-xs">
            Atenção: Alta probabilidade de baixa absorção oral ({violations} violações).
          </AlertDescription>
        </Alert>
      )}
      <div className="pt-2 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground font-medium">Regra dos 5 de Lipinski</span>
          <Badge variant={violations === 0 ? "default" : "destructive"} className={violations === 0 ? "bg-emerald-600" : ""}>
            {violations === 0 ? "Aprovado" : `${violations} violação(ões)`}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <LipinskiIndicator value={properties.mw} max={500} label="MW ≤ 500" />
          <LipinskiIndicator value={properties.logP} max={5} label="LogP ≤ 5" />
          <LipinskiIndicator value={properties.hbd} max={5} label="HBD ≤ 5" />
          <LipinskiIndicator value={properties.hba} max={10} label="HBA ≤ 10" />
        </div>
      </div>
    </div>
  );
}

function SlidersTab({ properties, onChange }: { properties: DrugProperties; onChange: (p: DrugProperties) => void }) {
  return (
    <div className="space-y-5">
      <PropertySlider label="Peso Molecular" tooltip="Moléculas com MW > 500 g/mol têm menor absorção oral. A Regra de Lipinski limita a 500." value={properties.mw} min={100} max={800} step={10} unit="g/mol" onChange={(v) => onChange({ ...properties, mw: v })} />
      <PropertySlider label="LogP (Lipofilicidade)" tooltip="Mede a partição entre fase lipídica e aquosa. LogP > 5 indica excesso de lipofilicidade, dificultando solubilidade e distribuição." value={properties.logP} min={-2} max={7} step={0.1} unit="" onChange={(v) => onChange({ ...properties, logP: Math.round(v * 10) / 10 })} />
      <PropertySlider label="Doadores de Ligação H" tooltip="Grupos -OH e -NH que doam hidrogênio em ligações de hidrogênio. Mais de 5 doadores reduz a permeabilidade pela membrana biológica." value={properties.hbd} min={0} max={10} step={1} unit="" onChange={(v) => onChange({ ...properties, hbd: v })} />
      <PropertySlider label="Aceitadores de Ligação H" tooltip="Átomos com pares de elétrons isolados (O, N). Mais de 10 aceitadores pode comprometer a biodisponibilidade oral." value={properties.hba} min={0} max={15} step={1} unit="" onChange={(v) => onChange({ ...properties, hba: v })} />
      <LipinskiSection properties={properties} />
    </div>
  );
}

function SmilesTab({ properties, onChange }: { properties: DrugProperties; onChange: (p: DrugProperties) => void }) {
  const [smiles, setSmiles] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const fetchImage = useCallback((smilesStr: string) => {
    if (!smilesStr.trim()) {
      setImageUrl(null);
      setImageError(false);
      return;
    }
    setImageLoading(true);
    setImageError(false);
    const encoded = encodeURIComponent(smilesStr);
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encoded}/PNG?image_size=300x300`;
    setImageUrl(url);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchImage(smiles), 500);
    return () => clearTimeout(timer);
  }, [smiles, fetchImage]);

  const handleExample = (smilesStr: string) => {
    setSmiles(smilesStr);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Insira a notação SMILES do candidato a fármaco</label>
          <Input value={smiles} onChange={(e) => setSmiles(e.target.value)} placeholder="Ex: CC(=O)Oc1ccccc1C(=O)O" className="font-mono text-sm bg-muted/30 border-border" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {SMILES_EXAMPLES.map((ex) => (
            <Button key={ex.name} variant="outline" size="sm" className="text-xs h-7" onClick={() => handleExample(ex.smiles)}>{ex.name}</Button>
          ))}
        </div>
        <div className="rounded-lg border border-border bg-muted/20 flex items-center justify-center min-h-[220px] overflow-hidden">
          {imageUrl && !imageError ? (
            <img src={imageUrl} alt="Estrutura 2D da molécula" className="max-w-full max-h-[220px] object-contain" onLoad={() => setImageLoading(false)} onError={() => { setImageError(true); setImageLoading(false); }} style={{ filter: "invert(0.85) hue-rotate(180deg)" }} />
          ) : imageError ? (
            <div className="text-center text-muted-foreground text-xs p-4">
              <Atom className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>Não foi possível renderizar a molécula.</p>
              <p>Verifique a notação SMILES.</p>
            </div>
          ) : (
            <div className="text-center text-muted-foreground text-xs p-4">
              <Beaker className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>Insira um código SMILES para visualizar a estrutura 2D.</p>
            </div>
          )}
        </div>
      </div>
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">Ajuste manualmente as propriedades físico-químicas teóricas da molécula inserida.</p>
        <PropertySlider label="Peso Molecular" tooltip="Moléculas com MW > 500 Da têm menor absorção oral." value={properties.mw} min={0} max={1000} step={10} unit="Da" onChange={(v) => onChange({ ...properties, mw: v })} />
        <PropertySlider label="LogP (Lipofilicidade)" tooltip="Mede a partição entre fase lipídica e aquosa. LogP > 5 dificulta solubilidade." value={properties.logP} min={-5} max={10} step={0.1} unit="" onChange={(v) => onChange({ ...properties, logP: Math.round(v * 10) / 10 })} />
        <PropertySlider label="Doadores de Ligação H" tooltip="Grupos -OH e -NH. Mais de 5 doadores reduz a permeabilidade de membrana." value={properties.hbd} min={0} max={15} step={1} unit="" onChange={(v) => onChange({ ...properties, hbd: v })} />
        <PropertySlider label="Aceitadores de Ligação H" tooltip="Átomos com pares de elétrons isolados (O, N). Mais de 10 compromete a biodisponibilidade oral." value={properties.hba} min={0} max={20} step={1} unit="" onChange={(v) => onChange({ ...properties, hba: v })} />
        <LipinskiSection properties={properties} />
      </div>
    </div>
  );
}

export function DrugDesignPanel({ properties, onChange, activeTab, onTabChange }: DrugDesignPanelProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="h-5 w-5 text-primary" />
          Módulo 2 — Design do Protótipo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as "sliders" | "smiles")} className="w-full">
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="sliders" className="flex-1">Sliders</TabsTrigger>
            <TabsTrigger value="smiles" className="flex-1">SMILES</TabsTrigger>
          </TabsList>
          <TabsContent value="sliders">
            <SlidersTab properties={properties} onChange={onChange} />
          </TabsContent>
          <TabsContent value="smiles">
            <SmilesTab properties={properties} onChange={onChange} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
