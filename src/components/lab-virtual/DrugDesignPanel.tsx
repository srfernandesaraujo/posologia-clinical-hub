import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FlaskConical, Info } from "lucide-react";

export interface DrugProperties {
  mw: number;
  logP: number;
  hbd: number;
  hba: number;
}

interface DrugDesignPanelProps {
  properties: DrugProperties;
  onChange: (props: DrugProperties) => void;
}

const LIPINSKI = {
  mw: { max: 500, label: "MW ≤ 500" },
  logP: { max: 5, label: "LogP ≤ 5" },
  hbd: { max: 5, label: "HBD ≤ 5" },
  hba: { max: 10, label: "HBA ≤ 10" },
};

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

export function DrugDesignPanel({ properties, onChange }: DrugDesignPanelProps) {
  const violations = [
    properties.mw > 500,
    properties.logP > 5,
    properties.hbd > 5,
    properties.hba > 10,
  ].filter(Boolean).length;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="h-5 w-5 text-primary" />
          Módulo 2 — Design do Protótipo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <PropertySlider
          label="Peso Molecular"
          tooltip="Moléculas com MW > 500 g/mol têm menor absorção oral. A Regra de Lipinski limita a 500."
          value={properties.mw}
          min={100}
          max={800}
          step={10}
          unit="g/mol"
          onChange={(v) => onChange({ ...properties, mw: v })}
        />
        <PropertySlider
          label="LogP (Lipofilicidade)"
          tooltip="Mede a partição entre fase lipídica e aquosa. LogP > 5 indica excesso de lipofilicidade, dificultando solubilidade e distribuição."
          value={properties.logP}
          min={-2}
          max={7}
          step={0.1}
          unit=""
          onChange={(v) => onChange({ ...properties, logP: Math.round(v * 10) / 10 })}
        />
        <PropertySlider
          label="Doadores de Ligação H"
          tooltip="Grupos -OH e -NH que doam hidrogênio em ligações de hidrogênio. Mais de 5 doadores reduz a permeabilidade pela membrana biológica."
          value={properties.hbd}
          min={0}
          max={10}
          step={1}
          unit=""
          onChange={(v) => onChange({ ...properties, hbd: v })}
        />
        <PropertySlider
          label="Aceitadores de Ligação H"
          tooltip="Átomos com pares de elétrons isolados (O, N). Mais de 10 aceitadores pode comprometer a biodisponibilidade oral."
          value={properties.hba}
          min={0}
          max={15}
          step={1}
          unit=""
          onChange={(v) => onChange({ ...properties, hba: v })}
        />

        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Regra dos 5 de Lipinski</span>
            <Badge variant={violations === 0 ? "default" : "destructive"} className={violations === 0 ? "bg-emerald-600" : ""}>
              {violations === 0 ? "Aprovado" : `${violations} violação(ões)`}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <LipinskiIndicator value={properties.mw} max={500} label={LIPINSKI.mw.label} />
            <LipinskiIndicator value={properties.logP} max={5} label={LIPINSKI.logP.label} />
            <LipinskiIndicator value={properties.hbd} max={5} label={LIPINSKI.hbd.label} />
            <LipinskiIndicator value={properties.hba} max={10} label={LIPINSKI.hba.label} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
