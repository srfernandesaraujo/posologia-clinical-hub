import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Pill, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { External3DViewer } from "@/components/medview3d/External3DViewer";
import { MedViewToolbar } from "@/components/medview3d/MedViewToolbar";
import { ProcedureTimeline, type ProcedureStep } from "@/components/medview3d/ProcedureTimeline";
import { ProcedureStepCard } from "@/components/medview3d/ProcedureStepCard";
import { SketchfabModelSearch } from "@/components/medview3d/SketchfabModelSearch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

const steps: ProcedureStep[] = [
  { stepNumber: 1, title: "Avaliação Pré-Procedimento", description: "Confirmação da indicação, exclusão de gravidez e escolha do dispositivo (DIU de cobre ou hormonal)." },
  { stepNumber: 2, title: "Histerometria", description: "Medição da cavidade uterina com histerômetro para confirmar profundidade e angulação adequadas." },
  { stepNumber: 3, title: "Carregamento do Dispositivo", description: "Preparação do DIU no tubo insertor com ajuste da marca limitadora conforme a histerometria." },
  { stepNumber: 4, title: "Inserção Intrauterina", description: "Passagem do insertor pelo canal cervical e liberação do DIU no fundo uterino com técnica de retirada." },
  { stepNumber: 5, title: "Verificação de Posição", description: "Confirmação ultrassonográfica do posicionamento correto do DIU na cavidade uterina." },
];

export default function FarmacologiaDispositivos() {
  const [currentStep, setCurrentStep] = useState(0);
  const [activeModel, setActiveModel] = useState("c1c84fb4d37c4e0e8e8b0c8d5d6f3a2b");
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/medview-3d" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Farmacologia — Dispositivos de Liberação</h1>
          <p className="text-xs text-muted-foreground">DIU, implantes subdérmicos e terapias-alvo</p>
        </div>
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <Pill className="h-3 w-3 mr-1" /> Farmacologia
        </Badge>
      </div>

      <Collapsible open={searchOpen} onOpenChange={setSearchOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Search className="h-4 w-4" /> Buscar modelo 3D no Sketchfab
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <SketchfabModelSearch defaultQuery="uterus anatomy IUD" onSelectModel={(id) => { setActiveModel(id); setSearchOpen(false); }} />
        </CollapsibleContent>
      </Collapsible>

      <div className="flex gap-3" style={{ height: "60vh" }}>
        <div className="flex-1">
          <External3DViewer modelId={activeModel} title="Útero — Inserção de DIU" />
        </div>
        <MedViewToolbar />
      </div>

      <ProcedureTimeline steps={steps} currentStep={currentStep} onStepChange={setCurrentStep} />
      <ProcedureStepCard step={steps[currentStep]} totalSteps={steps.length} />
    </div>
  );
}
