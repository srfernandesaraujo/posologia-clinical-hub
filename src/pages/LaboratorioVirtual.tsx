import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { CatalogPreview } from "@/components/catalog/CatalogPreview";
import type { PreviewKind } from "@/data/catalogAreas";
import { cn } from "@/lib/utils";
import {
  FlaskConical,
  Microscope,
  Skull,
  Dna,
  Clock,
  ClipboardCheck,
  Activity,
  TestTubes,
  Stethoscope,
  Shield,
  Atom,
} from "lucide-react";

export interface BenchCard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  status: "disponivel" | "em-breve";
  color: string;
}

export const benches: BenchCard[] = [
  {
    id: "farmacos",
    title: "Desenvolvimento de Fármacos",
    subtitle: "Drug Discovery Pipeline",
    description:
      "Pipeline completo: validação de alvo molecular → design de protótipo → docking molecular → ensaio clínico simulado.",
    icon: <FlaskConical className="h-8 w-8" />,
    route: "/laboratorio-virtual/farmacos",
    status: "disponivel",
    color: "hsl(var(--primary))",
  },
  {
    id: "microbiologia",
    title: "Microbiologia",
    subtitle: "Antibiograma e Resistência",
    description:
      "Antibiograma com halos de inibição, curvas de crescimento bacteriano, classificação S/I/R e índice FIC.",
    icon: <Microscope className="h-8 w-8" />,
    route: "/laboratorio-virtual/microbiologia",
    status: "disponivel",
    color: "hsl(142 71% 45%)",
  },
  {
    id: "toxicologia",
    title: "Toxicologia",
    subtitle: "Dose-Resposta e LD50",
    description:
      "Curvas dose-resposta sigmoidais, cálculo de LD50/ED50, índice terapêutico e classificação de Hodge & Sterner.",
    icon: <Skull className="h-8 w-8" />,
    route: "/laboratorio-virtual/toxicologia",
    status: "disponivel",
    color: "hsl(0 72% 51%)",
  },
  {
    id: "farmacogenomica",
    title: "Farmacogenômica",
    subtitle: "Variabilidade Genética",
    description:
      "Simulação de curvas PK por genótipo CYP450, distribuição de AUC na população, ANOVA entre fenótipos.",
    icon: <Dna className="h-8 w-8" />,
    route: "/laboratorio-virtual/farmacogenomica",
    status: "disponivel",
    color: "hsl(var(--accent))",
  },
  {
    id: "estabilidade",
    title: "Estabilidade",
    subtitle: "Degradação e Shelf Life",
    description:
      "Cinética de degradação, extrapolação de Arrhenius, determinação de prazo de validade (t90) e zonas climáticas ICH.",
    icon: <Clock className="h-8 w-8" />,
    route: "/laboratorio-virtual/estabilidade",
    status: "disponivel",
    color: "hsl(25 95% 53%)",
  },
  {
    id: "controle-qualidade",
    title: "Controle de Qualidade",
    subtitle: "Análise Quantitativa",
    description:
      "Curva de calibração, LOD/LOQ, uniformidade de conteúdo e validação analítica conforme ICH Q2.",
    icon: <ClipboardCheck className="h-8 w-8" />,
    route: "/laboratorio-virtual/controle-qualidade",
    status: "disponivel",
    color: "hsl(199 89% 48%)",
  },
  {
    id: "epidemiologia",
    title: "Epidemiologia",
    subtitle: "Estudo Observacional",
    description:
      "Desenho de coorte/caso-controle, cálculo de OR/RR, regressão logística e relatório STROBE.",
    icon: <Activity className="h-8 w-8" />,
    route: "/laboratorio-virtual/epidemiologia",
    status: "disponivel",
    color: "hsl(340 82% 52%)",
  },
  {
    id: "biotecnologia",
    title: "Biotecnologia",
    subtitle: "Clonagem e Expressão",
    description:
      "Mapa de plasmídeo, gel SDS-PAGE simulado, otimização de expressão proteica e Western blot.",
    icon: <TestTubes className="h-8 w-8" />,
    route: "/laboratorio-virtual/biotecnologia",
    status: "disponivel",
    color: "hsl(172 66% 50%)",
  },
  {
    id: "simulacao-realistica",
    title: "Simulação Realística",
    subtitle: "Decisão Clínica Ramificada",
    description:
      "Prontuário de paciente virtual com decisões passo a passo: análise de exames, condutas, interações e ajuste de dose. Cada escolha altera o estado do paciente.",
    icon: <Stethoscope className="h-8 w-8" />,
    route: "/laboratorio-virtual/simulacao-realistica",
    status: "disponivel",
    color: "hsl(45 93% 47%)",
  },
  {
    id: "pericia-forense",
    title: "Perícia Forense",
    subtitle: "Investigação Criminal",
    description:
      "3 laboratórios interligados (Químico, Toxicológico, DNA) para solucionar casos criminais. Espectrômetro de massa, HPLC e eletroferogramas.",
    icon: <Shield className="h-8 w-8" />,
    route: "/laboratorio-virtual/pericia-forense",
    status: "disponivel",
    color: "hsl(0 72% 51%)",
  },
  {
    id: "modelagem-molecular",
    title: "Modelagem Molecular",
    subtitle: "Modificação e Predição In Silico",
    description:
      "Busque compostos no PubChem, modifique estruturas com grupos funcionais, avalie Lipinski/ADMET e consulte alvos bioativos no ChEMBL.",
    icon: <Atom className="h-8 w-8" />,
    route: "/laboratorio-virtual/modelagem-molecular",
    status: "disponivel",
    color: "hsl(280 70% 55%)",
  },
];

const BENCH_PREVIEW: Record<string, PreviewKind> = {
  farmacos: "molecule",
  microbiologia: "bars",
  toxicologia: "curve",
  farmacogenomica: "helix",
  estabilidade: "curve",
  "controle-qualidade": "bars",
  epidemiologia: "record",
  biotecnologia: "helix",
  "simulacao-realistica": "ecg",
  "pericia-forense": "record",
  "modelagem-molecular": "molecule",
};

const METHOD_STEPS = ["Hipótese", "Desenho experimental", "Execução", "Análise", "Validação", "Publicação"];

export default function LaboratorioVirtual() {
  const { isPremium } = useFeatureGating();
  const available = benches.filter((b) => b.status === "disponivel").length;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="max-w-2xl space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Praticar</p>
        <h1 className="text-3xl font-semibold md:text-4xl">
          Laboratório Virtual <span className="text-gradient">de pesquisa</span>
        </h1>
        <p className="text-sm text-muted-foreground md:text-[15px]">
          {available} bancadas para conduzir um projeto completo: formular a hipótese, desenhar e executar o
          experimento, analisar os resultados e escrever o relatório.
        </p>
      </header>

      {/* Fluxo metodológico — a ordem é a própria informação, por isso numerada */}
      <ol className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
        {METHOD_STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-2.5 bg-card px-4 py-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-primary/40 font-mono text-[11px] font-semibold text-primary">
              {i + 1}
            </span>
            <span className="text-[13px] font-medium">{step}</span>
          </li>
        ))}
      </ol>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {benches.map((bench) => {
          const isAvailable = bench.status === "disponivel";
          const locked = isAvailable && !isPremium;
          const card = (
            <>
              <div className="relative h-[84px] border-b border-border bg-background/60 bg-grid px-3 pb-1.5 pt-3">
                <div className={cn("h-full transition-opacity", isAvailable ? "opacity-80 group-hover:opacity-100" : "opacity-30")}>
                  <CatalogPreview id={bench.id} kind={BENCH_PREVIEW[bench.id] || "record"} tone="highlight" />
                </div>
                <span className="absolute left-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-md border border-border bg-card/90 text-highlight backdrop-blur [&_svg]:h-4 [&_svg]:w-4">
                  {bench.icon}
                </span>
                {!isAvailable && (
                  <span className="absolute right-2.5 top-2.5 rounded-md bg-card/90 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">Em breve</span>
                )}
                {locked && (
                  <span className="absolute bottom-2 right-2.5 inline-flex items-center gap-1 rounded-md bg-card/90 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    <Lock className="h-3 w-3" /> Premium
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1.5 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-highlight">{bench.subtitle}</p>
                <h3 className="text-[15px] font-semibold leading-snug group-hover:text-primary">{bench.title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{bench.description}</p>
              </div>
            </>
          );
          const className = cn(
            "group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all",
            isAvailable ? "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-black/30" : "opacity-60",
          );
          return isAvailable ? (
            <Link key={bench.id} to={bench.route} className={className}>{card}</Link>
          ) : (
            <div key={bench.id} className={className} aria-disabled>{card}</div>
          );
        })}
      </div>
    </div>
  );
}
