import { useState } from "react";
import { Braces, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import type { FhirBundleView } from "@/lib/fhirMappers";

interface FhirSectionViewerProps {
  label: string;
  bundleView: FhirBundleView;
}

export function FhirSectionViewer({ label, bundleView }: FhirSectionViewerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-3 rounded-md border">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between text-xs">
          <span className="flex items-center gap-1.5">
            <Braces className="h-3.5 w-3.5" />
            Ver como FHIR — {label}
          </span>
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t p-3">
        <p className="text-xs text-muted-foreground mb-2">
          Ilustração de como estes dados trafegariam como recursos FHIR R4 (não validado contra o schema oficial do HL7).
        </p>
        <pre className="text-xs font-mono whitespace-pre-wrap bg-muted p-3 rounded overflow-x-auto">
          {bundleView.annotatedJson}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}
