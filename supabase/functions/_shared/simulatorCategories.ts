// Espelho server-side de src/data/simulatorCategories.ts, necessário porque edge
// functions (Deno) não importam código de src/. Usado por education-credit-issue para
// recalcular a categoria de cada simulator_attempts.simulator_slug no servidor (não
// confia no client). Ponto de sincronização manual — mesmo padrão já existente entre
// o arquivo original e Documentacao.tsx; revisar junto quando um simulador/categoria
// novo entrar (doc-sync já cobre isso).
export const SIMULATOR_CATEGORIES: Record<string, string> = {
  // Farmácia Clínica
  "metodo-soap": "Farmácia Clínica",
  "mai": "Farmácia Clínica",
  "cascata-prescricao": "Farmácia Clínica",
  "prm": "Farmácia Clínica",
  "antimicrobianos": "Farmácia Clínica",
  "tdm": "Farmácia Clínica",
  "acompanhamento": "Farmácia Clínica",
  "insulina": "Farmácia Clínica",
  "bomba-infusao": "Farmácia Clínica",
  "desmame-benzo": "Farmácia Clínica",
  "interacoes": "Farmácia Clínica",
  "manejo-dor": "Farmácia Clínica",
  "inflamacao-aines": "Farmácia Clínica",
  "infeccoes-antibioticos": "Farmácia Clínica",
  "tratamento-asma": "Farmácia Clínica",
  "dispensacao-344": "Farmácia Clínica",

  // Fisiologia Humana
  "sna": "Fisiologia Humana",
  "eletrofisiologia-cardiaca": "Fisiologia Humana",
  "depuracao-renal": "Fisiologia Humana",
  "equilibrio-acido-base": "Fisiologia Humana",
  "regulacao-glicemica": "Fisiologia Humana",
  "eixo-hpa": "Fisiologia Humana",
  "cinetica-enzimatica": "Fisiologia Humana",
  "secrecao-gastrica": "Fisiologia Humana",
  "cascata-coagulacao": "Fisiologia Humana",
  "compartimentos-adme": "Fisiologia Humana",

  // Bioquímica
  "cadeia-eletrons": "Bioquímica",
  "dissociacao-hemoglobina": "Bioquímica",
  "glicolise-gliconeogenese": "Bioquímica",
  "cinetica-avancada": "Bioquímica",
  "ciclo-ureia": "Bioquímica",
  "acido-araquidonico": "Bioquímica",
  "lipoproteinas": "Bioquímica",
  "pentoses-fosfato": "Bioquímica",
  "titulacao-aminoacidos": "Bioquímica",
  "operon-lac": "Bioquímica",

  // Farmacologia Básica
  "dose-resposta": "Farmacologia Básica",
  "transducao-sinal": "Farmacologia Básica",
  "janela-terapeutica-farma": "Farmacologia Básica",
  "vias-administracao": "Farmacologia Básica",
  "bloqueio-neuromuscular": "Farmacologia Básica",
  "farmaco-autonomica": "Farmacologia Básica",
  "tolerancia-dependencia": "Farmacologia Básica",
  "farmacogenomica": "Farmacologia Básica",

  // Farmacotécnica
  "estabilidade": "Farmacotécnica",
  "liberacao-farmacos": "Farmacotécnica",
  "diluicao": "Farmacotécnica",
  "reologia": "Farmacotécnica",
  "hlb-emulsoes": "Farmacotécnica",
  "granulometria": "Farmacotécnica",
  "compressao": "Farmacotécnica",
  "tampao-farmaceutico": "Farmacotécnica",

  // Química Farmacêutica
  "sar-explorer": "Química Farmacêutica",
  "lipinski": "Química Farmacêutica",
  "bioisosterismo": "Química Farmacêutica",
  "metabolismo-farmacos": "Química Farmacêutica",
  "docking-simplificado": "Química Farmacêutica",
  "quiralidade": "Química Farmacêutica",
  "pka-absorcao": "Química Farmacêutica",
  "qsar-simplificado": "Química Farmacêutica",

  // Formação Docente
  "feedback-formativo": "Formação Docente",
  "elaboracao-questoes": "Formação Docente",
  "conducao-caso-pbl": "Formação Docente",
  "planejamento-aula": "Formação Docente",
  "gestao-sala": "Formação Docente",
  "avaliacao-rubrica-osce": "Formação Docente",
  "preceptoria-clinica": "Formação Docente",

  // Odontologia
  "odontograma": "Odontologia",
  "anatomia-endodontia": "Odontologia",
  "periodontograma": "Odontologia",
  "anestesiologia-odonto": "Odontologia",
  "cefalometria": "Odontologia",
  "radiografia-odonto": "Odontologia",
  "farmacologia-odonto": "Odontologia",
  "cirurgia-exodontia": "Odontologia",

  // Fisioterapia
  "goniometria": "Fisioterapia",
  "avaliacao-postural": "Fisioterapia",
  "forca-muscular": "Fisioterapia",
  "dermatomos": "Fisioterapia",
  "respiratorio": "Fisioterapia",
  "eletroterapia": "Fisioterapia",
  "testes-ortopedicos": "Fisioterapia",
  "berg": "Fisioterapia",

  // Nutrição
  "avaliacao-nutricional": "Nutrição",
  "triagem-nutricional": "Nutrição",
  "necessidades-energeticas": "Nutrição",
  "tne": "Nutrição",
  "tnp": "Nutrição",
  "disfagia": "Nutrição",
  "nutricao-renal": "Nutrição",
  "nutricao-materno-infantil": "Nutrição",

  // Genética
  "sequenciamento-dna": "Genética",
  "snp-farmacogenetica": "Genética",
  "cariotipo": "Genética",
  "heranca-mendeliana": "Genética",
  "pcr-eletroforese": "Genética",
  "epigenetica": "Genética",
  "mutacoes-reparo": "Genética",
  "genetica-populacoes": "Genética",

  // Farmacoterapia Laboratorial
  "farmacoterapia-hemograma": "Farmacoterapia Laboratorial",
  "farmacoterapia-acido-base": "Farmacoterapia Laboratorial",
  "farmacoterapia-hepatopatia": "Farmacoterapia Laboratorial",
  "farmacoterapia-renal": "Farmacoterapia Laboratorial",
  "farmacoterapia-infeccao-lab": "Farmacoterapia Laboratorial",
  "farmacoterapia-dislipidemia": "Farmacoterapia Laboratorial",
  "farmacoterapia-glicemia": "Farmacoterapia Laboratorial",
  "farmacoterapia-coagulacao": "Farmacoterapia Laboratorial",
};

export function getSimulatorCategory(slug: string): string | undefined {
  return SIMULATOR_CATEGORIES[slug];
}
