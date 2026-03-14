import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Scissors, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { External3DViewer } from "@/components/medview3d/External3DViewer";
import { MedViewToolbar } from "@/components/medview3d/MedViewToolbar";
import { ProcedureTimeline, type ProcedureStep } from "@/components/medview3d/ProcedureTimeline";
import { ProcedureStepCard } from "@/components/medview3d/ProcedureStepCard";
import { SketchfabModelSearch } from "@/components/medview3d/SketchfabModelSearch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

const steps: ProcedureStep[] = [
  { stepNumber: 1, title: "Posicionamento e Pneumoperitônio", description: "Paciente em decúbito dorsal, anti-Trendelenburg. Insuflação com CO₂ via agulha de Veress no ponto de Palmer." },
  { stepNumber: 2, title: "Inserção dos Trocartes", description: "Posicionamento de 4 trocartes: umbilical (câmera), epigástrico, flanco direito e hipocôndrio direito." },
  { stepNumber: 3, title: "Exposição do Triângulo de Calot", description: "Tração do fundo vesicular e identificação do ducto cístico e artéria cística na visão crítica de segurança." },
  { stepNumber: 4, title: "Clipagem e Secção", description: "Aplicação de clipes de titânio no ducto e artéria cística, seguida de secção com tesoura laparoscópica." },
  { stepNumber: 5, title: "Dissecção da Vesícula", description: "Separação da vesícula biliar do leito hepático usando eletrocautério monopolar com cuidado hemostático." },
  { stepNumber: 6, title: "Extração e Revisão", description: "Retirada da vesícula pelo portal umbilical em endobag, revisão da hemostasia e desinsuflação." },
];

export default function CirurgiaGeralLaparoscopia() {
  const [currentStep, setCurrentStep] = useState(0);
  const [activeModel, setActiveModel] = useState("b5d3e7f1a2c4b6d8e0f2a4c6b8d0e2f4");
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/medview-3d" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Cirurgia Geral — Laparoscopia</h1>
          <p className="text-xs text-muted-foreground">Colecistectomia e apendicectomia laparoscópica</p>
        </div>
        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
          <Scissors className="h-3 w-3 mr-1" /> Cirurgia Geral
        </Badge>
      </div>

      <Collapsible open={searchOpen} onOpenChange={setSearchOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Search className="h-4 w-4" /> Buscar modelo 3D no Sketchfab
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <SketchfabModelSearch defaultQuery="abdomen gallbladder liver anatomy" onSelectModel={(id) => { setActiveModel(id); setSearchOpen(false); }} />
        </CollapsibleContent>
      </Collapsible>

      <div className="flex gap-3" style={{ height: "60vh" }}>
        <div className="flex-1">
          <External3DViewer modelId={activeModel} title="Abdômen — Colecistectomia" />
        </div>
        <MedViewToolbar />
      </div>

      <ProcedureTimeline steps={steps} currentStep={currentStep} onStepChange={setCurrentStep} />
      <ProcedureStepCard step={steps[currentStep]} totalSteps={steps.length} />
    </div>
  );
}
