import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ViewerProvider = "sketchfab" | "biodigital";

interface ProviderToggleProps {
  provider: ViewerProvider;
  onChange: (provider: ViewerProvider) => void;
}

export function ProviderToggle({ provider, onChange }: ProviderToggleProps) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 px-3 text-xs rounded-md transition-all",
          provider === "sketchfab"
            ? "bg-background text-foreground shadow-sm font-medium"
            : "text-muted-foreground hover:text-foreground"
        )}
        onClick={() => onChange("sketchfab")}
      >
        Sketchfab
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 px-3 text-xs rounded-md transition-all",
          provider === "biodigital"
            ? "bg-background text-foreground shadow-sm font-medium"
            : "text-muted-foreground hover:text-foreground"
        )}
        onClick={() => onChange("biodigital")}
      >
        BioDigital
      </Button>
    </div>
  );
}
