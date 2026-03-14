import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { External3DViewer, type SketchfabApi } from "@/components/medview3d/External3DViewer";
import { ZAnatomy3DViewer } from "@/components/medview3d/ZAnatomy3DViewer";
import { MedViewToolbar } from "@/components/medview3d/MedViewToolbar";
import { ProcedureTimeline, type ProcedureStep } from "@/components/medview3d/ProcedureTimeline";
import { SketchfabModelSearch } from "@/components/medview3d/SketchfabModelSearch";
import { ProviderToggle, type ViewerProvider } from "@/components/medview3d/ProviderToggle";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

const steps: ProcedureStep[] = [
  { stepNumber: 1, title: "Análise Facial", description: "Avaliação dos terços faciais, simetria e identificação dos músculos-alvo para tratamento com toxina botulínica.", searchQuery: "face anatomy facial muscles expression", modelId: "75d937f187054a91b799f6a0e2512e10" },
  { stepNumber: 2, title: "Marcações dos Pontos", description: "Demarcação dos pontos de injeção sobre os feixes musculares frontal, corrugador e prócero.", searchQuery: "frontalis corrugator procerus muscle injection points", modelId: "1beb6143ca84481f871c19a4648caa4c" },
  { stepNumber: 3, title: "Aplicação da Toxina", description: "Injeção intramuscular de toxina botulínica tipo A nos pontos marcados com seringa de insulina.", searchQuery: "botulinum toxin injection facial botox technique", modelId: "1beb6143ca84481f871c19a4648caa4c" },
  { stepNumber: 4, title: "Pontos de Preenchimento", description: "Identificação dos sulcos nasolabiais, regiões malares e lábios para preenchimento com ácido hialurônico.", searchQuery: "nasolabial fold malar cheek dermal filler", modelId: "75d937f187054a91b799f6a0e2512e10" },
  { stepNumber: 5, title: "Resultado Volumétrico", description: "Demonstração da mudança volumétrica facial após preenchimento com visualização da projeção tecidual.", searchQuery: "facial volume restoration hyaluronic acid filler result", modelId: "75d937f187054a91b799f6a0e2512e10" },
];

export default function DermatologiaCirurgiaPlastica() {
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
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/medview-3d" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Dermatologia e Cirurgia Plástica</h1>
          <p className="text-xs text-muted-foreground">Toxina botulínica, preenchimento facial e marcações anatômicas</p>
        </div>
        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
          <Sparkles className="h-3 w-3 mr-1" /> Dermatologia
        </Badge>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
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
                defaultQuery="face anatomy muscles skull"
                activeQuery={currentSearchQuery}
                onSelectModel={(id) => { setActiveModel(id); setSearchOpen(false); }}
              />
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      <div className="flex gap-3" style={{ height: "60vh" }}>
        <div className="flex-1">
          {isZAnatomy ? (
            <ZAnatomy3DViewer title="Z-Anatomy — Dermatologia" />
          ) : (
            <External3DViewer
              modelId={activeModel}
              title="Face — Aplicação de Toxina"
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
      </div>

      <ProcedureTimeline steps={steps} currentStep={currentStep} onStepChange={setCurrentStep} />
    </div>
  );
}
