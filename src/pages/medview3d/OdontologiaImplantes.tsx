import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, SmilePlus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { External3DViewer, type SketchfabApi } from "@/components/medview3d/External3DViewer";
import { MedViewToolbar } from "@/components/medview3d/MedViewToolbar";
import { ProcedureTimeline, type ProcedureStep } from "@/components/medview3d/ProcedureTimeline";
import { SketchfabModelSearch } from "@/components/medview3d/SketchfabModelSearch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

const steps: ProcedureStep[] = [
  { stepNumber: 1, title: "Avaliação Tomográfica", description: "Análise da tomografia cone-beam para avaliação da disponibilidade óssea e planejamento do implante.", searchQuery: "dental jaw anatomy" },
  { stepNumber: 2, title: "Guia Cirúrgico", description: "Confecção do guia cirúrgico com base no planejamento digital para posicionamento preciso do implante.", searchQuery: "dental implant guide" },
  { stepNumber: 3, title: "Incisão e Descolamento", description: "Incisão mucoperiostal e descolamento do retalho para exposição da crista óssea alveolar.", searchQuery: "oral surgery jaw flap" },
  { stepNumber: 4, title: "Fresagem Óssea", description: "Perfuração sequencial com brocas de diâmetro crescente seguindo o protocolo do sistema de implantes.", searchQuery: "dental implant drill" },
  { stepNumber: 5, title: "Instalação do Implante", description: "Inserção do implante de titânio no leito ósseo preparado com torque de inserção controlado.", searchQuery: "dental implant fixture" },
  { stepNumber: 6, title: "Cicatrização e Prótese", description: "Período de osseointegração e posterior instalação do pilar protético e coroa definitiva.", searchQuery: "dental crown abutment" },
];

export default function OdontologiaImplantes() {
  const [currentStep, setCurrentStep] = useState(0);
  const [activeModel, setActiveModel] = useState("1a9c9c9af4c64c6d97f9a2e05a39a48e");
  const [searchOpen, setSearchOpen] = useState(false);
  const [viewerApi, setViewerApi] = useState<SketchfabApi | null>(null);
  const [viewerReady, setViewerReady] = useState(false);

  useEffect(() => {
    if (!viewerApi || !viewerReady) return;
    viewerApi.recenterCamera();
  }, [currentStep, viewerApi, viewerReady]);

  const currentSearchQuery = steps[currentStep]?.searchQuery;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/medview-3d" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Odontologia — Implantes e Extrações</h1>
          <p className="text-xs text-muted-foreground">Implantes dentários, extrações complexas e movimentação ortodôntica</p>
        </div>
        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
          <SmilePlus className="h-3 w-3 mr-1" /> Odontologia
        </Badge>
      </div>

      <Collapsible open={searchOpen} onOpenChange={setSearchOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Search className="h-4 w-4" /> Buscar modelo 3D no Sketchfab
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <SketchfabModelSearch
            defaultQuery="dental implant jaw mandible"
            activeQuery={currentSearchQuery}
            onSelectModel={(id) => { setActiveModel(id); setSearchOpen(false); }}
          />
        </CollapsibleContent>
      </Collapsible>

      <div className="flex gap-3" style={{ height: "60vh" }}>
        <div className="flex-1">
          <External3DViewer
            modelId={activeModel}
            title="Mandíbula — Implante Dentário"
            onApiReady={(api) => { setViewerApi(api); setViewerReady(true); }}
          />
        </div>
        <MedViewToolbar api={viewerApi} isReady={viewerReady} />
      </div>

      <ProcedureTimeline steps={steps} currentStep={currentStep} onStepChange={setCurrentStep} />
    </div>
  );
}
