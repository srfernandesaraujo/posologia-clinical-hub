import { useState, useEffect, useRef } from "react";
import { Search, Loader2, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSketchfabSearch, type SketchfabModel } from "@/hooks/useSketchfabSearch";

interface SketchfabModelSearchProps {
  onSelectModel: (modelId: string) => void;
  defaultQuery?: string;
  activeQuery?: string;
}

export function SketchfabModelSearch({ onSelectModel, defaultQuery = "", activeQuery }: SketchfabModelSearchProps) {
  const [query, setQuery] = useState(activeQuery || defaultQuery);
  const [hasSearched, setHasSearched] = useState(false);
  const { models, isLoading, totalCount, searchModels } = useSketchfabSearch();
  const lastSearchedRef = useRef("");

  useEffect(() => {
    if (activeQuery && activeQuery !== lastSearchedRef.current) {
      setQuery(activeQuery);
      setHasSearched(true);
      lastSearchedRef.current = activeQuery;
      searchModels(activeQuery, 8);
    }
  }, [activeQuery, searchModels]);

  const handleSearch = () => {
    if (query.trim()) {
      setHasSearched(true);
      lastSearchedRef.current = query.trim();
      searchModels(query.trim(), 8);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Buscar modelo anatômico no Sketchfab..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1"
        />
        <Button onClick={handleSearch} disabled={isLoading} size="sm">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Buscar
        </Button>
      </div>

      {totalCount > 0 && <p className="text-xs text-muted-foreground">{totalCount} modelos encontrados</p>}

      {hasSearched && !isLoading && models.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhum modelo encontrado para esse termo. Tente uma busca mais curta (ex: “dental implant”).</p>
      )}

      {models.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto">
          {models.map((model) => (
            <SketchfabModelCard key={model.uid} model={model} onSelect={onSelectModel} />
          ))}
        </div>
      )}
    </div>
  );
}

function SketchfabModelCard({ model, onSelect }: { model: SketchfabModel; onSelect: (id: string) => void }) {
  return (
    <Card
      className="p-2 cursor-pointer hover:border-primary/50 transition-colors group"
      onClick={() => onSelect(model.uid)}
    >
      {model.thumbnailUrl && (
        <img
          src={model.thumbnailUrl}
          alt={model.name}
          className="w-full h-20 object-cover rounded mb-1"
          loading="lazy"
        />
      )}
      <p className="text-xs font-medium truncate">{model.name}</p>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-muted-foreground truncate">{model.user}</span>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Eye className="h-3 w-3" /> {model.viewCount}
        </div>
      </div>
    </Card>
  );
}
