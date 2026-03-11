import { useRef, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    $3Dmol: any;
  }
}

interface MoleculeViewerProps {
  pdbUrl: string | null;
  isLoading: boolean;
}

export function MoleculeViewer({ pdbUrl, isLoading }: MoleculeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [viewMode, setViewMode] = useState<"cartoon" | "surface">("cartoon");

  useEffect(() => {
    if (!pdbUrl || !containerRef.current || !window.$3Dmol) return;

    const viewer = window.$3Dmol.createViewer(containerRef.current, {
      backgroundColor: "hsl(222, 47%, 6%)",
    });
    viewerRef.current = viewer;

    fetch(pdbUrl)
      .then((res) => res.text())
      .then((data) => {
        viewer.addModel(data, pdbUrl.endsWith(".pdb") ? "pdb" : "cif");
        applyStyle(viewer, viewMode);
        viewer.zoomTo();
        viewer.render();
      });

    return () => {
      if (viewerRef.current) {
        viewerRef.current.clear();
      }
    };
  }, [pdbUrl]);

  useEffect(() => {
    if (viewerRef.current) {
      applyStyle(viewerRef.current, viewMode);
      viewerRef.current.render();
    }
  }, [viewMode]);

  function applyStyle(viewer: any, mode: "cartoon" | "surface") {
    viewer.setStyle({}, {});
    if (mode === "cartoon") {
      viewer.setStyle({}, { cartoon: { color: "spectrum" } });
    } else {
      viewer.setStyle({}, { stick: { radius: 0.15 } });
      viewer.addSurface(window.$3Dmol.SurfaceType.VDW, {
        opacity: 0.7,
        color: "white",
      });
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-background rounded-lg border border-border">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pdbUrl) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-background rounded-lg border border-border">
        <p className="text-muted-foreground text-sm">Selecione um alvo para visualizar a estrutura 3D</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="w-full h-[300px] rounded-lg border border-border overflow-hidden"
        style={{ position: "relative" }}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={viewMode === "cartoon" ? "default" : "outline"}
          onClick={() => setViewMode("cartoon")}
        >
          Ribbon
        </Button>
        <Button
          size="sm"
          variant={viewMode === "surface" ? "default" : "outline"}
          onClick={() => setViewMode("surface")}
        >
          Surface
        </Button>
      </div>
    </div>
  );
}
