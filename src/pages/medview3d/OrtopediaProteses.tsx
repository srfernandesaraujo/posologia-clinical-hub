import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bone, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { External3DViewer, type SketchfabApi } from "@/components/medview3d/External3DViewer";
import { MedViewToolbar } from "@/components/medview3d/MedViewToolbar";
import { ProcedureTimeline, type ProcedureStep } from "@/components/medview3d/ProcedureTimeline";
import { SketchfabModelSearch } from "@/components/medview3d/SketchfabModelSearch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

const steps: ProcedureStep[] = [
  { stepNumber: 1, title: "Avaliação Radiológica", description: "Análise do grau de desgaste articular e planejamento cirúrgico com radiografias e tomografia do joelho." },
  { stepNumber: 2, title: "Acesso Cirúrgico", description: "Incisão parapatelar medial e exposição da articulação do joelho com eversão patelar." },
  { stepNumber: 3, title: "Resseção Óssea Femoral", description: "Cortes no fêmur distal usando guias de alinhamento intramedular para posicionamento do componente femoral." },
  { stepNumber: 4, title: "Preparação da Tíbia", description: "Corte tibial proximal com guia extramedular e remoção dos meniscos remanescentes." },
  { stepNumber: 5, title: "Implantação dos Componentes", description: "Encaixe e cimentação da prótese femoral, inserto tibial de polietileno e componente tibial metálico." },
  { stepNumber: 6, title: "Teste de Estabilidade", description: "Verificação do alinhamento, amplitude de movimento e estabilidade ligamentar com os componentes de teste." },
];

export default function OrtopediaProteses() {
  const [currentStep, setCurrentStep] = useState(0);
  const [activeModel, setActiveModel] = useState("d3cce6fa37684b1096bc3eb9acc9c069");
  const [searchOpen, setSearchOpen] = useState(false);
  const [viewerApi, setViewerApi] = useState<SketchfabApi | null>(null);
  const [viewerReady, setViewerReady] = useState(false);

  useEffect(() => {
    if (!viewerApi || !viewerReady) return;
    viewerApi.recenterCamera();
  }, [currentStep, viewerApi, viewerReady]);

  return (
    <div className="space-y-4">
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

      <Collapsible open={searchOpen} onOpenChange={setSearchOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Search className="h-4 w-4" /> Buscar modelo 3D no Sketchfab
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <SketchfabModelSearch defaultQuery="knee joint anatomy" onSelectModel={(id) => { setActiveModel(id); setSearchOpen(false); }} />
        </CollapsibleContent>
      </Collapsible>

      <div className="flex gap-3" style={{ height: "60vh" }}>
        <div className="flex-1">
          <External3DViewer
            modelId={activeModel}
            title="Prótese de Joelho"
            onApiReady={(api) => { setViewerApi(api); setViewerReady(true); }}
          />
        </div>
        <MedViewToolbar api={viewerApi} isReady={viewerReady} />
      </div>

      <ProcedureTimeline steps={steps} currentStep={currentStep} onStepChange={setCurrentStep} />
    </div>
  );
}
