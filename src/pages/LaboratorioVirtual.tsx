import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FlaskConical,
  Microscope,
  Skull,
  Dna,
  Clock,
  ClipboardCheck,
  Activity,
  TestTubes,
} from "lucide-react";

interface BenchCard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  status: "disponivel" | "em-breve";
  color: string;
}

const benches: BenchCard[] = [
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
    status: "em-breve",
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
    status: "em-breve",
    color: "hsl(262 83% 58%)",
  },
  {
    id: "estabilidade",
    title: "Estabilidade",
    subtitle: "Degradação e Shelf Life",
    description:
      "Cinética de degradação, extrapolação de Arrhenius, determinação de prazo de validade (t90) e zonas climáticas ICH.",
    icon: <Clock className="h-8 w-8" />,
    route: "/laboratorio-virtual/estabilidade",
    status: "em-breve",
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
    status: "em-breve",
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
    status: "em-breve",
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
    status: "em-breve",
    color: "hsl(172 66% 50%)",
  },
];

export default function LaboratorioVirtual() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FlaskConical className="h-7 w-7 text-primary" />
          Laboratório Virtual de Pesquisa
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Conduza projetos de pesquisa completos: formule hipóteses, desenhe
          experimentos, execute, analise resultados e publique relatórios
          científicos.
        </p>
      </div>

      {/* Methodology banner */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-4 py-2.5 border border-border/50">
        <span className="font-semibold text-foreground">Fluxo metodológico:</span>
        {["Hipótese", "Desenho Experimental", "Execução", "Análise", "Validação", "Publicação"].map(
          (step, i, arr) => (
            <span key={step} className="flex items-center gap-1.5">
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
                {step}
              </span>
              {i < arr.length - 1 && <span className="text-muted-foreground">→</span>}
            </span>
          )
        )}
      </div>

      {/* Bench grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {benches.map((bench) => {
          const isAvailable = bench.status === "disponivel";
          return (
            <Card
              key={bench.id}
              className={`group relative overflow-hidden transition-all duration-200 ${
                isAvailable
                  ? "cursor-pointer hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5"
                  : "opacity-60 cursor-default"
              }`}
              onClick={() => isAvailable && navigate(bench.route)}
            >
              <CardContent className="p-5 flex flex-col gap-3 h-full">
                <div className="flex items-start justify-between">
                  <div
                    className="p-2.5 rounded-lg transition-colors"
                    style={{
                      backgroundColor: `${bench.color}15`,
                      color: bench.color,
                    }}
                  >
                    {bench.icon}
                  </div>
                  <Badge
                    variant={isAvailable ? "default" : "secondary"}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {isAvailable ? "Disponível" : "Em breve"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-sm leading-tight">
                    {bench.title}
                  </h3>
                  <p
                    className="text-[11px] font-medium"
                    style={{ color: bench.color }}
                  >
                    {bench.subtitle}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed flex-1">
                  {bench.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
