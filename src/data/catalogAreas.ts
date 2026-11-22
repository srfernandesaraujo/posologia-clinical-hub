// Organização do catálogo de simuladores em 5 áreas (plano de redesign, Fase 3).
// As 20 categorias originais continuam existindo (banco, Salas Virtuais,
// maestria) — a área é só um agrupamento de navegação por cima delas.

export type AreaTone = "primary" | "highlight" | "warn" | "accent" | "ok" | "muted";

export interface CatalogArea {
  id: string;
  label: string;
  description: string;
  tone: AreaTone;
  categories: string[];
}

export const SIMULATOR_AREAS: CatalogArea[] = [
  {
    id: "terapeutica",
    label: "Terapêutica e farmácia clínica",
    description: "Casos clínicos, ajuste de dose, exames laboratoriais e decisão terapêutica.",
    tone: "primary",
    categories: [
      "Farmácia Clínica", "Farmacoterapia Laboratorial", "Farmacologia Clínica", "Psiquiatria",
      "Infectologia", "Farmacocinética", "Endocrinologia", "Enfermagem / UTI",
    ],
  },
  {
    id: "ciencias-basicas",
    label: "Ciências básicas",
    description: "Fisiologia, bioquímica, farmacologia básica, química farmacêutica e genética.",
    tone: "highlight",
    categories: ["Fisiologia Humana", "Bioquímica", "Farmacologia Básica", "Química Farmacêutica", "Genética"],
  },
  {
    id: "producao-gestao",
    label: "Produção e gestão",
    description: "Farmacotécnica, assistência farmacêutica e informática em saúde.",
    tone: "warn",
    categories: ["Farmacotécnica", "Assistência Farmacêutica", "Informática em Saúde"],
  },
  {
    id: "outras-profissoes",
    label: "Outras profissões",
    description: "Odontologia, fisioterapia e nutrição.",
    tone: "accent",
    categories: ["Odontologia", "Fisioterapia", "Nutrição"],
  },
  {
    id: "docencia",
    label: "Formação docente",
    description: "Ferramentas para planejar e conduzir aulas.",
    tone: "ok",
    categories: ["Formação Docente"],
  },
];

export const OTHER_AREA: CatalogArea = {
  id: "outros",
  label: "Outros",
  description: "Ferramentas de categorias sem área definida.",
  tone: "muted",
  categories: [],
};

export function areaForCategory(category: string, areas: CatalogArea[] = SIMULATOR_AREAS): CatalogArea {
  return areas.find((a) => a.categories.includes(category)) || OTHER_AREA;
}

/**
 * Simuladores nativos com Modo Desafio (usam SimulatorChallengeMode).
 * Conferido por src/data/catalogAreas.consistency.test.ts contra as páginas
 * em src/pages/simuladores — se um simulador ganhar desafios, o teste avisa.
 */
export const SIMULATORS_WITH_CHALLENGES = new Set<string>([
  "acido-araquidonico", "bioisosterismo", "bloqueio-neuromuscular", "cadeia-eletrons", "cadeia-suprimentos",
  "cariotipo", "cascata-coagulacao", "ciclo-ureia", "cinetica-avancada", "cinetica-enzimatica",
  "compartimentos-adme", "compressao", "depuracao-renal", "diluicao", "dissociacao-hemoglobina",
  "docking-simplificado", "dose-resposta", "eixo-hpa", "eletrofisiologia-cardiaca", "epigenetica",
  "equilibrio-acido-base", "estabilidade", "farmaco-autonomica", "farmacogenomica", "farmacoterapia-acido-base",
  "farmacoterapia-coagulacao", "farmacoterapia-dislipidemia", "farmacoterapia-glicemia", "farmacoterapia-hemograma",
  "farmacoterapia-hepatopatia", "farmacoterapia-infeccao-lab", "farmacoterapia-renal", "genetica-populacoes",
  "glicolise-gliconeogenese", "granulometria", "heranca-mendeliana", "hlb-emulsoes", "infeccoes-antibioticos",
  "inflamacao-aines", "janela-terapeutica-farma", "liberacao-farmacos", "lipinski", "lipoproteinas",
  "manejo-dor", "metabolismo-farmacos", "mutacoes-reparo", "operon-lac", "pcr-eletroforese",
  "pentoses-fosfato", "pka-absorcao", "qsar-simplificado", "quiralidade", "regulacao-glicemica",
  "reologia", "sar-explorer", "secrecao-gastrica", "sequenciamento-dna", "sna",
  "snp-farmacogenetica", "tampao-farmaceutico", "titulacao-aminoacidos", "tolerancia-dependencia",
  "transducao-sinal", "tratamento-asma", "vias-administracao",
]);

/** Tipo de mini-gráfico decorativo mostrado no topo do cartão de cada ferramenta. */
export type PreviewKind = "curve" | "bars" | "cycle" | "molecule" | "helix" | "ecg" | "record" | "gauge";

const PREVIEW_BY_CATEGORY: Record<string, PreviewKind> = {
  "Fisiologia Humana": "ecg",
  "Farmacocinética": "curve",
  "Farmacologia Básica": "curve",
  "Farmacologia Clínica": "curve",
  "Endocrinologia": "curve",
  "Enfermagem / UTI": "ecg",
  "Bioquímica": "cycle",
  "Farmacoterapia Laboratorial": "bars",
  "Nutrição": "bars",
  "Química Farmacêutica": "molecule",
  "Farmacotécnica": "molecule",
  "Genética": "helix",
  "Fisioterapia": "ecg",
};

export function previewKindForCategory(category: string): PreviewKind {
  return PREVIEW_BY_CATEGORY[category] || "record";
}
