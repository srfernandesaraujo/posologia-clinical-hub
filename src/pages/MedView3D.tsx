import { CatalogHub, type CatalogItem } from "@/components/catalog/CatalogHub";
import type { PreviewKind } from "@/data/catalogAreas";
import { Bone, Heart, SmilePlus, Pill, Sparkles, Scissors, type LucideIcon } from "lucide-react";

interface Procedure {
  name: string;
  slug: string;
  description: string;
}

interface Category {
  id: string;
  name: string;
  icon: LucideIcon;
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

const PREVIEW_BY_ID: Record<string, PreviewKind> = {
  ortopedia: "bars",
  cardiologia: "ecg",
  odontologia: "molecule",
  farmacologia: "curve",
  dermatologia: "gauge",
  "cirurgia-geral": "cycle",
};

const items: CatalogItem[] = categories.flatMap((cat) =>
  cat.procedures.map((proc) => ({
    id: `medview:${cat.id}:${proc.name}`,
    name: proc.name,
    description: proc.description,
    category: cat.name,
    icon: cat.icon,
    to: `/medview-3d/${proc.slug}`,
    previewKind: PREVIEW_BY_ID[cat.id] ?? "curve",
    tags: ["Modelo 3D"],
    keywords: cat.name,
  })),
);

export default function MedView3D() {
  return (
    <CatalogHub
      eyebrow="Praticar"
      title="MedView"
      titleAccent="3D"
      description={`${items.length} procedimentos demonstrados em modelos anatômicos 3D interativos, de ortopedia a cirurgia geral.`}
      itemNoun={{ singular: "procedimento", plural: "procedimentos" }}
      items={items}
      favoritesKey="posologia_fav_medview_v1"
    />
  );
}
