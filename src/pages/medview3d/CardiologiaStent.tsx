import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { External3DViewer } from "@/components/medview3d/External3DViewer";
import { MedViewToolbar } from "@/components/medview3d/MedViewToolbar";
import { ProcedureTimeline, type ProcedureStep } from "@/components/medview3d/ProcedureTimeline";
import { ProcedureStepCard } from "@/components/medview3d/ProcedureStepCard";

const steps: ProcedureStep[] = [
  { stepNumber: 1, title: "Identificação da Lesão", description: "Visualização da artéria coronária com placa aterosclerótica causando estenose significativa (>70%).", modelId: "1cf79cab36f44e0a96289de9be7a5ea2" },
  { stepNumber: 2, title: "Acesso Vascular", description: "Punção da artéria femoral ou radial e inserção da bainha introdutora para passagem do cateter-guia.", modelId: "1cf79cab36f44e0a96289de9be7a5ea2" },
  { stepNumber: 3, title: "Posicionamento do Cateter", description: "Avanço do cateter-guia sob fluoroscopia até o óstio coronário com fio-guia 0.014 polegadas.", modelId: "1cf79cab36f44e0a96289de9be7a5ea2" },
  { stepNumber: 4, title: "Pré-dilatação com Balão", description: "Inflação do cateter-balão na região da estenose para pré-dilatar a placa aterosclerótica.", modelId: "1cf79cab36f44e0a96289de9be7a5ea2" },
  { stepNumber: 5, title: "Implante do Stent", description: "Posicionamento e expansão do stent farmacológico na lesão, restaurando o lúmen arterial.", modelId: "1cf79cab36f44e0a96289de9be7a5ea2" },
  { stepNumber: 6, title: "Resultado Final", description: "Confirmação angiográfica do fluxo restaurado (TIMI 3) e remoção do sistema de entrega.", modelId: "1cf79cab36f44e0a96289de9be7a5ea2" },
];

const DEFAULT_MODEL = "1cf79cab36f44e0a96289de9be7a5ea2";

export default function CardiologiaStent() {
  const [currentStep, setCurrentStep] = useState(0);
  const activeModel = steps[currentStep]?.modelId || DEFAULT_MODEL;

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

      <div className="flex gap-3" style={{ height: "60vh" }}>
        <div className="flex-1">
          <External3DViewer modelId={activeModel} title="Coração — Angioplastia" />
        </div>
        <MedViewToolbar />
      </div>

      <ProcedureTimeline steps={steps} currentStep={currentStep} onStepChange={setCurrentStep} />
      <ProcedureStepCard step={steps[currentStep]} totalSteps={steps.length} />
    </div>
  );
}
