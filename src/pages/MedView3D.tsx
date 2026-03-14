import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search, Bone, Heart, SmilePlus, Pill, Sparkles, Scissors,
  LayoutGrid, List, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Procedure {
  name: string;
  slug: string;
  description: string;
}

interface Category {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  procedures: Procedure[];
}

const categories: Category[] = [
  {
    id: "ortopedia",
    name: "Ortopedia e Traumatologia",
    icon: Bone,
    color: "text-blue-400",
    procedures: [
      { name: "Prótese de Joelho", slug: "ortopedia-proteses", description: "Demonstração de prótese total de joelho com encaixe femoral e tibial" },
      { name: "Prótese de Quadril", slug: "ortopedia-proteses", description: "Artroplastia de quadril com componentes acetabular e femoral" },
      { name: "Fixação com Placa e Parafusos", slug: "ortopedia-proteses", description: "Redução aberta e fixação interna de fraturas com material de síntese" },
    ],
  },
  {
    id: "cardiologia",
    name: "Cardiologia Intervencionista",
    icon: Heart,
    color: "text-red-400",
    procedures: [
      { name: "Angioplastia com Stent", slug: "cardiologia-stent", description: "Passagem do cateter, inflação do balão e expansão do stent coronário" },
      { name: "Cateterismo Cardíaco", slug: "cardiologia-stent", description: "Inserção do cateter via artéria femoral ou radial até as coronárias" },
    ],
  },
  {
    id: "odontologia",
    name: "Odontologia e Bucomaxilofacial",
    icon: SmilePlus,
    color: "text-cyan-400",
    procedures: [
      { name: "Implante Dentário", slug: "odontologia-implantes", description: "Instalação de implante osseointegrado na maxila ou mandíbula" },
      { name: "Extração de Dente Incluso", slug: "odontologia-implantes", description: "Remoção cirúrgica de terceiros molares impactados" },
      { name: "Movimentação Ortodôntica", slug: "odontologia-implantes", description: "Simulação de forças ortodônticas e remodelação óssea" },
    ],
  },
  {
    id: "farmacologia",
    name: "Farmacologia e Dispositivos",
    icon: Pill,
    color: "text-green-400",
    procedures: [
      { name: "Inserção de DIU", slug: "farmacologia-dispositivos", description: "Posicionamento intrauterino do dispositivo de liberação hormonal ou de cobre" },
      { name: "Implante Subdérmico", slug: "farmacologia-dispositivos", description: "Inserção subcutânea de implante anticoncepcional no braço" },
      { name: "Via de Terapia-Alvo", slug: "farmacologia-dispositivos", description: "Demonstração de liberação direcionada de fármacos em órgãos específicos" },
    ],
  },
  {
    id: "dermatologia",
    name: "Dermatologia e Cirurgia Plástica",
    icon: Sparkles,
    color: "text-purple-400",
    procedures: [
      { name: "Aplicação de Toxina Botulínica", slug: "dermatologia-cirurgia-plastica", description: "Marcações nos feixes musculares faciais e pontos de aplicação" },
      { name: "Preenchimento Facial", slug: "dermatologia-cirurgia-plastica", description: "Injeção de ácido hialurônico com demonstração de mudança volumétrica" },
    ],
  },
  {
    id: "cirurgia-geral",
    name: "Cirurgia Geral",
    icon: Scissors,
    color: "text-orange-400",
    procedures: [
      { name: "Colecistectomia Laparoscópica", slug: "cirurgia-geral-laparoscopia", description: "Remoção da vesícula biliar por laparoscopia com posição dos trocartes" },
      { name: "Apendicectomia Laparoscópica", slug: "cirurgia-geral-laparoscopia", description: "Remoção do apêndice com demonstração dos acessos e instrumentos" },
    ],
  },
];

export default function MedView3D() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredCategories = categories
    .filter((c) => !selectedCategory || c.id === selectedCategory)
    .map((c) => ({
      ...c,
      procedures: c.procedures.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.description.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((c) => c.procedures.length > 0);

  const totalProcedures = categories.reduce((sum, c) => sum + c.procedures.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">MedView 3D</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Demonstração interativa de procedimentos médicos com modelos anatômicos 3D
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar de categorias */}
        <aside className="lg:w-64 shrink-0 space-y-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              !selectedCategory
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary"
            )}
          >
            <span>Todas</span>
            <Badge variant="secondary" className="text-xs">{totalProcedures}</Badge>
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
              className={cn(
                "w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                selectedCategory === cat.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary"
              )}
            >
              <span className="flex items-center gap-2">
                <cat.icon className={cn("h-4 w-4", cat.color)} />
                <span className="truncate">{cat.name}</span>
              </span>
              <Badge variant="secondary" className="text-xs">{cat.procedures.length}</Badge>
            </button>
          ))}
        </aside>

        {/* Main content */}
        <div className="flex-1 space-y-4">
          {/* Search + view toggle */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar procedimento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex border border-border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-9 w-9 rounded-none"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-9 w-9 rounded-none"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Procedures */}
          {filteredCategories.map((cat) => (
            <div key={cat.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <cat.icon className={cn("h-5 w-5", cat.color)} />
                <h2 className="text-lg font-semibold text-foreground">{cat.name}</h2>
              </div>

              <div className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"
                  : "flex flex-col gap-2"
              )}>
                {cat.procedures.map((proc) => (
                  <Link key={proc.name} to={`/medview-3d/${proc.slug}`}>
                    <Card className="group hover:border-primary/40 transition-colors cursor-pointer">
                      <CardContent className={cn(
                        "p-4",
                        viewMode === "list" && "flex items-center justify-between"
                      )}>
                        <div className={viewMode === "list" ? "flex-1" : ""}>
                          <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            {proc.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {proc.description}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-2" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {filteredCategories.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">Nenhum procedimento encontrado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
