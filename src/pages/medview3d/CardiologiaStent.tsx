import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Heart, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { External3DViewer, type External3DViewerHandle } from "@/components/medview3d/External3DViewer";
import { MedViewToolbar } from "@/components/medview3d/MedViewToolbar";
import { ProcedureTimeline, type ProcedureStep } from "@/components/medview3d/ProcedureTimeline";
import { ProcedureStepCard } from "@/components/medview3d/ProcedureStepCard";
import { SketchfabModelSearch } from "@/components/medview3d/SketchfabModelSearch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

const steps: ProcedureStep[] = [
  { stepNumber: 1, title: "Identificação da Lesão", description: "Visualização da artéria coronária com placa aterosclerótica causando estenose significativa (>70%)." },
  { stepNumber: 2, title: "Acesso Vascular", description: "Punção da artéria femoral ou radial e inserção da bainha introdutora para passagem do cateter-guia." },
  { stepNumber: 3, title: "Posicionamento do Cateter", description: "Avanço do cateter-guia sob fluoroscopia até o óstio coronário com fio-guia 0.014 polegadas." },
  { stepNumber: 4, title: "Pré-dilatação com Balão", description: "Inflação do cateter-balão na região da estenose para pré-dilatar a placa aterosclerótica." },
  { stepNumber: 5, title: "Implante do Stent", description: "Posicionamento e expansão do stent farmacológico na lesão, restaurando o lúmen arterial." },
  { stepNumber: 6, title: "Resultado Final", description: "Confirmação angiográfica do fluxo restaurado (TIMI 3) e remoção do sistema de entrega." },
];

export default function CardiologiaStent() {
  const [currentStep, setCurrentStep] = useState(0);
  const [activeModel, setActiveModel] = useState("0d3a1e7e90224cecb1e41a9e83ad32ec");
  const [searchOpen, setSearchOpen] = useState(false);
  const viewerRef = useRef<External3DViewerHandle>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/medview-3d" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Cardiologia — Angioplastia e Stent</h1>
          <p className="text-xs text-muted-foreground">Cateterismo cardíaco com implante de stent coronário</p>
        </div>
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          <Heart className="h-3 w-3 mr-1" /> Cardiologia
        </Badge>
      </div>

      <Collapsible open={searchOpen} onOpenChange={setSearchOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Search className="h-4 w-4" /> Buscar modelo 3D no Sketchfab
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <SketchfabModelSearch defaultQuery="heart anatomy coronary" onSelectModel={(id) => { setActiveModel(id); setSearchOpen(false); }} />
        </CollapsibleContent>
      </Collapsible>

      <div className="flex gap-3" style={{ height: "60vh" }}>
        <div className="flex-1">
          <External3DViewer ref={viewerRef} modelId={activeModel} title="Coração — Angioplastia" />
        </div>
        <MedViewToolbar api={viewerRef.current?.api} isReady={viewerRef.current?.isReady} />
      </div>

      <ProcedureTimeline steps={steps} currentStep={currentStep} onStepChange={setCurrentStep} />
      <ProcedureStepCard step={steps[currentStep]} totalSteps={steps.length} />
    </div>
  );
}
