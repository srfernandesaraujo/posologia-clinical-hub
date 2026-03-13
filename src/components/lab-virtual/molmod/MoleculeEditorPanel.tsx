import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Atom, Undo2, Edit3, Plus } from "lucide-react";

declare global {
  interface Window {
    $3Dmol: any;
  }
}

interface Modification {
  label: string;
  smiles: string;
  timestamp: number;
}

interface MoleculeEditorPanelProps {
  smiles: string;
  onSmilesChange: (smiles: string) => void;
  compoundName?: string;
  originalCid?: number;
  disabled?: boolean;
}

const FUNCTIONAL_GROUPS = [
  { label: "Metila (–CH₃)", suffix: "C", color: "hsl(var(--primary))" },
  { label: "Hidroxila (–OH)", suffix: "O", color: "hsl(142 71% 45%)" },
  { label: "Amina (–NH₂)", suffix: "N", color: "hsl(262 83% 58%)" },
  { label: "Flúor (–F)", suffix: "F", color: "hsl(199 89% 48%)" },
  { label: "Cloro (–Cl)", suffix: "Cl", color: "hsl(25 95% 53%)" },
  { label: "Carbonila (=O)", suffix: "C(=O)", color: "hsl(340 82% 52%)" },
];

const PUBCHEM_BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";

export function MoleculeEditorPanel({
  smiles,
  onSmilesChange,
  compoundName,
  originalCid,
  disabled,
}: MoleculeEditorPanelProps) {
  const [manualSmiles, setManualSmiles] = useState(smiles);
  const [history, setHistory] = useState<Modification[]>([]);
  const viewerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync manual input when smiles changes externally
  useEffect(() => {
    setManualSmiles(smiles);
  }, [smiles]);

  // 3D viewer — init once, update model on smiles change
  useEffect(() => {
    if (!containerRef.current || !window.$3Dmol) return;

    // Create viewer only once
    if (!viewerRef.current) {
      viewerRef.current = window.$3Dmol.createViewer(containerRef.current, {
        backgroundColor: "0x1a1a2e",
      });
    }

    const viewer = viewerRef.current;

    if (!smiles) return;

    viewer.removeAllModels();

    // Try to load SDF from PubChem for 3D
    const sdfUrl = `${PUBCHEM_BASE}/compound/smiles/${encodeURIComponent(smiles)}/SDF?record_type=3d`;
    let cancelled = false;

    fetch(sdfUrl)
      .then((res) => {
        if (!res.ok) throw new Error("no 3d");
        return res.text();
      })
      .then((sdf) => {
        if (cancelled) return;
        viewer.addModel(sdf, "sdf");
        viewer.setStyle({}, { stick: { radius: 0.12 }, sphere: { scale: 0.25 } });
        viewer.zoomTo();
        viewer.render();
      })
      .catch(() => {
        if (cancelled) return;
        // Fallback: parse SMILES directly
        try {
          viewer.addModel(smiles, "smiles");
          viewer.setStyle({}, { stick: { radius: 0.12 } });
          viewer.zoomTo();
          viewer.render();
        } catch {
          // silently fail
        }
      });

    return () => {
      cancelled = true;
    };
  }, [smiles]);

  // Cleanup viewer on unmount
  useEffect(() => {
    return () => {
      if (viewerRef.current) {
        try { viewerRef.current.clear(); } catch {}
        viewerRef.current = null;
      }
    };
  }, []);

  const applyModification = (group: typeof FUNCTIONAL_GROUPS[0]) => {
    setHistory((h) => [...h, { label: group.label, smiles, timestamp: Date.now() }]);
    const newSmiles = smiles + group.suffix;
    onSmilesChange(newSmiles);
  };

  const applyManual = () => {
    if (manualSmiles.trim() && manualSmiles.trim() !== smiles) {
      setHistory((h) => [...h, { label: "Edição manual", smiles, timestamp: Date.now() }]);
      onSmilesChange(manualSmiles.trim());
    }
  };

  const undoLast = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    onSmilesChange(last.smiles);
  };

  const imgUrl = `${PUBCHEM_BASE}/compound/smiles/${encodeURIComponent(smiles)}/PNG?image_size=280x280`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Atom className="h-4 w-4 text-primary" />
          M2 — Editor Molecular
          {compoundName && (
            <Badge variant="outline" className="text-[10px] ml-auto">{compoundName}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Visualizations side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 2D */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Estrutura 2D</p>
          <div className="flex justify-center items-center bg-background rounded-lg border border-border p-2 h-[200px]">
              {smiles ? (
                <img
                  key={smiles}
                  src={imgUrl}
                  alt="Estrutura 2D"
                  className="max-h-full object-contain"
                  loading="lazy"
                />
              ) : (
                <span className="text-xs text-muted-foreground">Selecione um composto em M1</span>
              )}
            </div>
          </div>
          {/* 3D */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Estrutura 3D</p>
            <div
              ref={containerRef}
              className="w-full h-[200px] rounded-lg border border-border overflow-hidden"
              style={{ position: "relative", minHeight: "200px" }}
            />
          </div>
        </div>

        {/* SMILES input */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase">SMILES Atual</p>
          <div className="flex gap-2">
            <Input
              value={manualSmiles}
              onChange={(e) => setManualSmiles(e.target.value)}
              className="font-mono text-xs"
              disabled={disabled}
            />
            <Button size="sm" variant="outline" onClick={applyManual} disabled={disabled || manualSmiles === smiles}>
              <Edit3 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Functional modifications */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Modificações Funcionais</p>
          <div className="flex flex-wrap gap-1.5">
            {FUNCTIONAL_GROUPS.map((g) => (
              <Button
                key={g.suffix}
                size="sm"
                variant="outline"
                className="text-xs h-7 px-2.5"
                onClick={() => applyModification(g)}
                disabled={disabled || !smiles}
              >
                <Plus className="h-3 w-3 mr-1" />
                {g.label}
              </Button>
            ))}
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Histórico ({history.length})</p>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={undoLast}>
                <Undo2 className="h-3 w-3 mr-1" /> Desfazer
              </Button>
            </div>
            <ScrollArea className="h-[80px]">
              <div className="space-y-1">
                {[...history].reverse().map((h, i) => (
                  <div key={i} className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[9px] px-1 py-0">{h.label}</Badge>
                    <span className="font-mono truncate flex-1">{h.smiles}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
