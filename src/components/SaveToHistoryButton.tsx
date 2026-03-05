import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  calculatorName: string;
  calculatorSlug: string;
  summary: string;
  details: Record<string, string | number>;
  date?: string;
  disabled?: boolean;
}

export function SaveToHistoryButton({ calculatorName, calculatorSlug, summary, details, date, disabled }: Props) {
  const { user } = useAuth();
  const { saveCalculation } = useCalculationHistory();
  const [patientName, setPatientName] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const handleSave = async () => {
    setSaving(true);
    await saveCalculation({
      calculatorName,
      calculatorSlug,
      patientName: patientName.trim() || undefined,
      date: date || new Date().toISOString().slice(0, 10),
      summary,
      details,
    });
    setSaving(false);
    setOpen(false);
    setPatientName("");
    toast.success("Resultado salvo no histórico!");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" disabled={disabled}>
          <Save className="h-4 w-4" />
          Salvar no Histórico
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm mb-1">Salvar Resultado</h4>
            <p className="text-xs text-muted-foreground">{summary}</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Nome do Paciente (opcional)</Label>
            <Input
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Ex: João Silva"
              className="h-8 text-sm"
            />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full" size="sm">
            {saving ? "Salvando..." : "Confirmar"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
