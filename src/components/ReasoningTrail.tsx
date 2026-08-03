import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ReasoningTrailItem {
  label: string;
  observation: string;
  reference?: string | null;
  verdict?: string | boolean;
  tag?: string;
}

interface ReasoningTrailProps {
  items: ReasoningTrailItem[];
  instrument?: string;
  summary?: string;
  className?: string;
}

function verdictBadge(verdict: string | boolean | undefined) {
  if (verdict === undefined) return null;
  if (typeof verdict === "boolean") {
    return (
      <Badge variant={verdict ? "default" : "secondary"}>
        {verdict ? "Coberto" : "Não coberto"}
      </Badge>
    );
  }
  return <Badge variant="secondary">{verdict}</Badge>;
}

export function ReasoningTrail({ items, instrument, summary, className }: ReasoningTrailProps) {
  const [openItems, setOpenItems] = useState<Record<number, boolean>>({});

  return (
    <div className={cn("space-y-3", className)}>
      {(instrument || summary) && (
        <div className="text-sm">
          {instrument && (
            <p className="text-muted-foreground">
              Instrumento aplicado: <span className="font-medium text-foreground">{instrument}</span>
            </p>
          )}
          {summary && <p className="mt-1">{summary}</p>}
        </div>
      )}
      <div className="space-y-2">
        {items.map((item, i) => (
          <Collapsible
            key={i}
            open={!!openItems[i]}
            onOpenChange={(open) => setOpenItems((prev) => ({ ...prev, [i]: open }))}
            className="rounded-md border"
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{item.label}</span>
                  {item.tag && <Badge variant="outline">{item.tag}</Badge>}
                  {verdictBadge(item.verdict)}
                </span>
                {openItems[i] ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t px-3 py-2 text-sm text-muted-foreground">
              <p>{item.observation}</p>
              {item.reference && <p className="mt-1">📚 {item.reference}</p>}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  );
}
