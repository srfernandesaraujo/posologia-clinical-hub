import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { External3DViewer } from "@/components/medview3d/External3DViewer";
import { MedViewToolbar } from "@/components/medview3d/MedViewToolbar";
import { ProcedureTimeline, type ProcedureStep } from "@/components/medview3d/ProcedureTimeline";
import { ProcedureStepCard } from "@/components/medview3d/ProcedureStepCard";

const steps: ProcedureStep[] = [
  { stepNumber: 1, title: "Avaliação Radiológica", description: "Análise do grau de desgaste articular e planejamento cirúrgico com radiografias e tomografia do joelho.", modelId: "2b0e77e4e8f24e17a7e2fb3af2c28b6e" },
  { stepNumber: 2, title: "Acesso Cirúrgico", description: "Incisão parapatelar medial e exposição da articulação do joelho com eversão patelar.", modelId: "2b0e77e4e8f24e17a7e2fb3af2c28b6e" },
  { stepNumber: 3, title: "Resseção Óssea Femoral", description: "Cortes no fêmur distal usando guias de alinhamento intramedular para posicionamento do componente femoral.", modelId: "2b0e77e4e8f24e17a7e2fb3af2c28b6e" },
  { stepNumber: 4, title: "Preparação da Tíbia", description: "Corte tibial proximal com guia extramedular e remoção dos meniscos remanescentes.", modelId: "2b0e77e4e8f24e17a7e2fb3af2c28b6e" },
  { stepNumber: 5, title: "Implantação dos Componentes", description: "Encaixe e cimentação da prótese femoral, inserto tibial de polietileno e componente tibial metálico.", modelId: "2b0e77e4e8f24e17a7e2fb3af2c28b6e" },
  { stepNumber: 6, title: "Teste de Estabilidade", description: "Verificação do alinhamento, amplitude de movimento e estabilidade ligamentar com os componentes de teste.", modelId: "2b0e77e4e8f24e17a7e2fb3af2c28b6e" },
];

// Modelo placeholder de joelho do Sketchfab
const DEFAULT_MODEL = "2b0e77e4e8f24e17a7e2fb3af2c28b6e";

export default function OrtopediaProteses() {
  const [currentStep, setCurrentStep] = useState(0);
  const activeModel = steps[currentStep]?.modelId || DEFAULT_MODEL;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/medview-3d" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Ortopedia — Próteses e Fixação</h1>
          <p className="text-xs text-muted-foreground">Demonstração de próteses de joelho, quadril e fixação com material de síntese</p>
        </div>
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
          <Bone className="h-3 w-3 mr-1" /> Ortopedia
        </Badge>
      </div>

      {/* Viewport + Toolbar */}
      <div className="flex gap-3" style={{ height: "60vh" }}>
        <div className="flex-1">
          <External3DViewer modelId={activeModel} title="Prótese de Joelho" />
        </div>
        <MedViewToolbar />
      </div>

      {/* Timeline */}
      <ProcedureTimeline steps={steps} currentStep={currentStep} onStepChange={setCurrentStep} />

      {/* Step detail */}
      <ProcedureStepCard step={steps[currentStep]} totalSteps={steps.length} />
    </div>
  );
}
