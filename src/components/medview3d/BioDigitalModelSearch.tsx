import { useState, useMemo } from "react";
import { Search, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { biodigitalModels, type BioDigitalModel } from "@/data/biodigitalModels";

interface BioDigitalModelSearchProps {
  onSelectModel: (modelId: string) => void;
  specialty?: string;
}

export function BioDigitalModelSearch({ onSelectModel, specialty }: BioDigitalModelSearchProps) {
  const [query, setQuery] = useState("");

  const filteredModels = useMemo(() => {
    let models = biodigitalModels;
    if (specialty) {
      models = models.filter((m) => m.specialty === specialty);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      models = models.filter((m) =>
        m.name.toLowerCase().includes(q) || m.specialty.toLowerCase().includes(q)
      );
    }
    return models;
  }, [query, specialty]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Filtrar modelos anatômicos..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-xs"
          onClick={() => window.open("https://human.biodigital.com/explore", "_blank")}
        >
          <ExternalLink className="h-3 w-3" /> Explorar BioDigital
        </Button>
      </div>

      {filteredModels.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhum modelo encontrado. Tente outro termo.</p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-[250px] overflow-y-auto">
        {filteredModels.map((model) => (
          <BioDigitalModelCard key={model.id} model={model} onSelect={onSelectModel} />
        ))}
      </div>
    </div>
  );
}

function BioDigitalModelCard({ model, onSelect }: { model: BioDigitalModel; onSelect: (id: string) => void }) {
  return (
    <Card
      className="p-3 cursor-pointer hover:border-primary/50 transition-colors group"
      onClick={() => onSelect(model.id)}
    >
      <p className="text-xs font-medium truncate">{model.name}</p>
      <Badge variant="outline" className="mt-1 text-[10px]">
        {model.specialty}
      </Badge>
    </Card>
  );
}
