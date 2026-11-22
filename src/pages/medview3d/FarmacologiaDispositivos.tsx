import { useState, useEffect } from "react";
import { ProcedureWorkspace } from "@/components/medview3d/ProcedureWorkspace";
import { Pill, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { External3DViewer, type SketchfabApi } from "@/components/medview3d/External3DViewer";
import { ZAnatomy3DViewer } from "@/components/medview3d/ZAnatomy3DViewer";
import { MedViewToolbar } from "@/components/medview3d/MedViewToolbar";
import { type ProcedureStep } from "@/components/medview3d/ProcedureTimeline";
import { SketchfabModelSearch } from "@/components/medview3d/SketchfabModelSearch";
import { ProviderToggle, type ViewerProvider } from "@/components/medview3d/ProviderToggle";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

const steps: ProcedureStep[] = [
  { stepNumber: 1, title: "Avaliação Pré-Procedimento", description: "Confirmação da indicação, exclusão de gravidez e escolha do dispositivo (DIU de cobre ou hormonal).", searchQuery: "uterus anatomy female reproductive system", modelId: "b0d36ec846094eb18fd8fb7335e6d9f3" },
  { stepNumber: 2, title: "Histerometria", description: "Medição da cavidade uterina com histerômetro para confirmar profundidade e angulação adequadas.", searchQuery: "uterine cavity hysterometry uterus measurement", modelId: "b0d36ec846094eb18fd8fb7335e6d9f3" },
  { stepNumber: 3, title: "Carregamento do Dispositivo", description: "Preparação do DIU no tubo insertor com ajuste da marca limitadora conforme a histerometria.", searchQuery: "intrauterine device IUD copper hormonal", modelId: "930890ede6754a729bee647f3ca18a5a" },
  { stepNumber: 4, title: "Inserção Intrauterina", description: "Passagem do insertor pelo canal cervical e liberação do DIU no fundo uterino com técnica de retirada.", searchQuery: "IUD insertion cervical canal uterine fundus", modelId: "930890ede6754a729bee647f3ca18a5a" },
  { stepNumber: 5, title: "Verificação de Posição", description: "Confirmação ultrassonográfica do posicionamento correto do DIU na cavidade uterina.", searchQuery: "ultrasound IUD position uterus verification", modelId: "b0d36ec846094eb18fd8fb7335e6d9f3" },
];

export default function FarmacologiaDispositivos() {
  const [currentStep, setCurrentStep] = useState(0);
  const [activeModel, setActiveModel] = useState(steps[0]?.modelId || "");
  const [searchOpen, setSearchOpen] = useState(false);
  const [viewerApi, setViewerApi] = useState<SketchfabApi | null>(null);
  const [viewerReady, setViewerReady] = useState(false);
  const [provider, setProvider] = useState<ViewerProvider>("sketchfab");

  useEffect(() => {
    const curatedId = steps[currentStep]?.modelId;
    if (curatedId) setActiveModel(curatedId);
  }, [currentStep]);

  const currentSearchQuery = steps[currentStep]?.searchQuery;
  const isZAnatomy = provider === "zanatomy";

  return (
    <ProcedureWorkspace
      title="Farmacologia — Dispositivos de Liberação"
      description="DIU, implantes subdérmicos e terapias-alvo"
      badge={
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <Pill className="h-3 w-3 mr-1" /> Farmacologia
        </Badge>
      }
      tools={<>
        <ProviderToggle provider={provider} onChange={setProvider} />
        {!isZAnatomy && (
          <Collapsible open={searchOpen} onOpenChange={setSearchOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Search className="h-4 w-4" /> Buscar modelo 3D no Sketchfab
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <SketchfabModelSearch
                defaultQuery="uterus anatomy IUD"
                activeQuery={currentSearchQuery}
                onSelectModel={(id) => { setActiveModel(id); setSearchOpen(false); }}
              />
            </CollapsibleContent>
          </Collapsible>
        )}
      </>}
      viewer={<div className="flex h-full gap-3">
      <div className="flex-1">
        {isZAnatomy ? (
          <ZAnatomy3DViewer title="Z-Anatomy — Farmacologia" />
        ) : (
          <External3DViewer
            modelId={activeModel}
            title="Útero — Inserção de DIU"
            onApiReady={(api) => { setViewerApi(api); setViewerReady(true); }}
          />
        )}
      </div>
      <MedViewToolbar
        api={viewerApi}
        isReady={viewerReady}
        disabled={isZAnatomy}
        disabledMessage="Use as ferramentas dentro do Z-Anatomy"
      />
      </div>}
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
    />
  );
}
