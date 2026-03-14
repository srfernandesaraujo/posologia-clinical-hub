import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, SmilePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { External3DViewer } from "@/components/medview3d/External3DViewer";
import { MedViewToolbar } from "@/components/medview3d/MedViewToolbar";
import { ProcedureTimeline, type ProcedureStep } from "@/components/medview3d/ProcedureTimeline";
import { ProcedureStepCard } from "@/components/medview3d/ProcedureStepCard";

const steps: ProcedureStep[] = [
  { stepNumber: 1, title: "Avaliação Tomográfica", description: "Análise da tomografia cone-beam para avaliação da disponibilidade óssea e planejamento do implante.", modelId: "ba832f6820834d5da3c37b27eb59a67e" },
  { stepNumber: 2, title: "Guia Cirúrgico", description: "Confecção do guia cirúrgico com base no planejamento digital para posicionamento preciso do implante.", modelId: "ba832f6820834d5da3c37b27eb59a67e" },
  { stepNumber: 3, title: "Incisão e Descolamento", description: "Incisão mucoperiostal e descolamento do retalho para exposição da crista óssea alveolar.", modelId: "ba832f6820834d5da3c37b27eb59a67e" },
  { stepNumber: 4, title: "Fresagem Óssea", description: "Perfuração sequencial com brocas de diâmetro crescente seguindo o protocolo do sistema de implantes.", modelId: "ba832f6820834d5da3c37b27eb59a67e" },
  { stepNumber: 5, title: "Instalação do Implante", description: "Inserção do implante de titânio no leito ósseo preparado com torque de inserção controlado.", modelId: "ba832f6820834d5da3c37b27eb59a67e" },
  { stepNumber: 6, title: "Cicatrização e Prótese", description: "Período de osseointegração e posterior instalação do pilar protético e coroa definitiva.", modelId: "ba832f6820834d5da3c37b27eb59a67e" },
];

const DEFAULT_MODEL = "ba832f6820834d5da3c37b27eb59a67e";

export default function OdontologiaImplantes() {
  const [currentStep, setCurrentStep] = useState(0);
  const activeModel = steps[currentStep]?.modelId || DEFAULT_MODEL;

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

      <div className="flex gap-3" style={{ height: "60vh" }}>
        <div className="flex-1">
          <External3DViewer modelId={activeModel} title="Mandíbula — Implante Dentário" />
        </div>
        <MedViewToolbar />
      </div>

      <ProcedureTimeline steps={steps} currentStep={currentStep} onStepChange={setCurrentStep} />
      <ProcedureStepCard step={steps[currentStep]} totalSteps={steps.length} />
    </div>
  );
}
