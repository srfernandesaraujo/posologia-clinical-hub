/**
 * Catalog of native (built-in) cases for each simulator.
 * Used in Virtual Room creation to let professors select native cases.
 * The index matches the order in each simulator's BUILT_IN_CASES array.
 */

export interface NativeCase {
  index: number;
  title: string;
  difficulty: string;
}

const catalog: Record<string, NativeCase[]> = {
  // ── Clínicos raiz ──
  prm: [
    { index: 0, title: "Caso 1: Idosa Polimedicada", difficulty: "Médio" },
    { index: 1, title: "Caso 2: Paciente Pediátrico", difficulty: "Fácil" },
    { index: 2, title: "Caso 3: Adulto Jovem - Interação Grave", difficulty: "Difícil" },
  ],
  antimicrobianos: [
    { index: 0, title: "Caso 1: Sepse de Foco Urinário", difficulty: "Fácil" },
    { index: 1, title: "Caso 2: PAC Grave", difficulty: "Médio" },
    { index: 2, title: "Caso 3: PAV em UTI", difficulty: "Difícil" },
  ],
  tdm: [
    { index: 0, title: "Caso 1: Vancomicina em Declínio Renal", difficulty: "Médio" },
    { index: 1, title: "Caso 2: Gentamicina e Acúmulo", difficulty: "Fácil" },
    { index: 2, title: "Caso 3: Fenitoína - Cinética Não-Linear", difficulty: "Difícil" },
  ],
  acompanhamento: [
    { index: 0, title: "Caso 1: DM2 e Dislipidemia", difficulty: "Médio" },
    { index: 1, title: "Caso 2: Hipotireoidismo de Hashimoto", difficulty: "Fácil" },
  ],
  insulina: [
    { index: 0, title: "Caso 1: DM1 - Controle Inadequado", difficulty: "Médio" },
  ],
  "bomba-infusao": [
    { index: 0, title: "Caso 1: Choque Séptico – Noradrenalina", difficulty: "Médio" },
    { index: 1, title: "Caso 2: Sedação em UTI – Midazolam", difficulty: "Fácil" },
    { index: 2, title: "Caso 3: Dose de Ataque – Fentanil", difficulty: "Difícil" },
  ],
  "desmame-benzo": [
    { index: 0, title: "Caso 1: Desmame de Alprazolam após uso prolongado", difficulty: "Médio" },
    { index: 1, title: "Caso 2: Desmame simples de Clonazepam", difficulty: "Fácil" },
  ],
  interacoes: [
    { index: 0, title: "Polifarmácia em Idoso Cardiopata", difficulty: "Difícil" },
    { index: 1, title: "Interação Sildenafila + Nitrato", difficulty: "Fácil" },
    { index: 2, title: "Paciente Renal Crônico com Dor", difficulty: "Médio" },
  ],
  "metodo-soap": [
    { index: 0, title: "Caso 1: Hipertensa com Tontura", difficulty: "Fácil" },
    { index: 1, title: "Caso 2: Idoso com Polifarmácia", difficulty: "Médio" },
    { index: 2, title: "Caso 3: Gestante com ITU", difficulty: "Difícil" },
  ],
  mai: [
    { index: 0, title: "Caso 1: Idoso com Insônia", difficulty: "Fácil" },
    { index: 1, title: "Caso 2: Polifarmácia na ICC", difficulty: "Médio" },
    { index: 2, title: "Caso 3: Paciente Psiquiátrico", difficulty: "Difícil" },
  ],
  "cascata-prescricao": [
    { index: 0, title: "Caso 1: Cascata Clássica – AINE", difficulty: "Fácil" },
    { index: 1, title: "Caso 2: Cascata Neuropsiquiátrica", difficulty: "Médio" },
    { index: 2, title: "Caso 3: Cascata Metabólica Complexa", difficulty: "Difícil" },
  ],
  // ── Fisiologia ──
  sna: [
    { index: 0, title: "Bradicardia Vagal", difficulty: "Fácil" },
    { index: 1, title: "Choque Hemorrágico", difficulty: "Médio" },
    { index: 2, title: "Feocromocitoma", difficulty: "Difícil" },
  ],
  "eletrofisiologia-cardiaca": [
    { index: 0, title: "Bloqueio de Canal de Sódio (Classe I)", difficulty: "Médio" },
    { index: 1, title: "Bloqueio Beta-Adrenérgico (Classe II)", difficulty: "Fácil" },
    { index: 2, title: "Bloqueio de Canal de Potássio (Classe III)", difficulty: "Difícil" },
  ],
  "depuracao-renal": [
    { index: 0, title: "Estenose de Artéria Renal", difficulty: "Médio" },
    { index: 1, title: "Desidratação Grave", difficulty: "Fácil" },
    { index: 2, title: "Nefropatia Diabética", difficulty: "Difícil" },
  ],
  "equilibrio-acido-base": [
    { index: 0, title: "Cetoacidose Diabética", difficulty: "Médio" },
    { index: 1, title: "Alcalose Metabólica por Vômitos", difficulty: "Fácil" },
    { index: 2, title: "DPOC Descompensada", difficulty: "Difícil" },
  ],
  "regulacao-glicemica": [
    { index: 0, title: "Diabetes Mellitus Tipo 2 – Resistência à Insulina", difficulty: "Médio" },
    { index: 1, title: "Diabetes Mellitus Tipo 1 – Deficiência Absoluta", difficulty: "Fácil" },
    { index: 2, title: "Indivíduo Saudável – Homeostase Normal", difficulty: "Fácil" },
  ],
  "eixo-hpa": [
    { index: 0, title: "Síndrome de Cushing", difficulty: "Médio" },
    { index: 1, title: "Insuficiência Adrenal", difficulty: "Fácil" },
    { index: 2, title: "Estresse Cirúrgico Agudo", difficulty: "Difícil" },
  ],
  "cinetica-enzimatica": [
    { index: 0, title: "Inibidor Competitivo – Metotrexato", difficulty: "Fácil" },
    { index: 1, title: "Inibidor Não-Competitivo – Metais Pesados", difficulty: "Médio" },
    { index: 2, title: "Inibidor Acompetitivo – Lítio", difficulty: "Difícil" },
  ],
  "secrecao-gastrica": [
    { index: 0, title: "Úlcera Péptica – Tratamento com IBP", difficulty: "Fácil" },
    { index: 1, title: "Síndrome de Zollinger-Ellison", difficulty: "Difícil" },
    { index: 2, title: "DRGE Crônica – Terapia de Manutenção", difficulty: "Médio" },
  ],
  "cascata-coagulacao": [
    { index: 0, title: "Hemofilia A – Deficiência Fator VIII", difficulty: "Médio" },
    { index: 1, title: "Trombose Venosa Profunda – Anticoagulação", difficulty: "Fácil" },
    { index: 2, title: "CIVD – Coagulação Intravascular Disseminada", difficulty: "Difícil" },
  ],
  "compartimentos-adme": [
    { index: 0, title: "Amoxicilina Oral – ADME Clássico", difficulty: "Fácil" },
    { index: 1, title: "Metformina – Transportadores Renais", difficulty: "Médio" },
    { index: 2, title: "Fentanil Transdérmico – Cinética de Reservatório", difficulty: "Difícil" },
  ],
  // ── Bioquímica ──
  "cadeia-eletrons": [
    { index: 0, title: "Intoxicação por Cianeto", difficulty: "Médio" },
    { index: 1, title: "Metformina e Acidose Lática", difficulty: "Difícil" },
    { index: 2, title: "Desacoplador (DNP/Termogenina)", difficulty: "Fácil" },
  ],
  "dissociacao-hemoglobina": [
    { index: 0, title: "Cetoacidose Diabética – Efeito Bohr", difficulty: "Médio" },
    { index: 1, title: "Intoxicação por CO", difficulty: "Fácil" },
    { index: 2, title: "Anemia Falciforme", difficulty: "Difícil" },
  ],
  "glicolise-gliconeogenese": [
    { index: 0, title: "Estado Pós-Prandial", difficulty: "Fácil" },
    { index: 1, title: "Jejum Prolongado (48h)", difficulty: "Médio" },
    { index: 2, title: "Exercício Intenso", difficulty: "Difícil" },
  ],
  "cinetica-avancada": [
    { index: 0, title: "Inibição Competitiva – Estatina vs HMG-CoA", difficulty: "Fácil" },
    { index: 1, title: "Inibição Alostérica – Fosfofrutocinase-1", difficulty: "Médio" },
    { index: 2, title: "Inibição Suicida – Aspirina e COX", difficulty: "Difícil" },
  ],
  "ciclo-ureia": [
    { index: 0, title: "Deficiência de OTC (Ornitina Transcarbamilase)", difficulty: "Difícil" },
    { index: 1, title: "Dieta Hiperproteica e Sobrecarga", difficulty: "Fácil" },
    { index: 2, title: "Cirrose Hepática e Hiperamonemia", difficulty: "Médio" },
  ],
  "acido-araquidonico": [
    { index: 0, title: "Inflamação Aguda — AINEs", difficulty: "Fácil" },
    { index: 1, title: "Prevenção Cardiovascular — Aspirina", difficulty: "Médio" },
    { index: 2, title: "Asma e Leucotrienos", difficulty: "Difícil" },
  ],
  lipoproteinas: [
    { index: 0, title: "Hipercolesterolemia Familiar Heterozigótica", difficulty: "Difícil" },
    { index: 1, title: "Dislipidemia Mista", difficulty: "Médio" },
    { index: 2, title: "LDL Residual — Uso de iPCSK9", difficulty: "Difícil" },
  ],
  "pentoses-fosfato": [
    { index: 0, title: "Deficiência de G6PD – Anemia Hemolítica", difficulty: "Médio" },
    { index: 1, title: "Estresse Oxidativo – Metabolismo Normal", difficulty: "Fácil" },
    { index: 2, title: "Células Tumorais e Via das Pentoses", difficulty: "Difícil" },
  ],
  "titulacao-aminoacidos": [
    { index: 0, title: "Glicina – Aminoácido Mais Simples", difficulty: "Fácil" },
    { index: 1, title: "Histidina – Tampão Fisiológico", difficulty: "Médio" },
    { index: 2, title: "Ácido Glutâmico – Dupla Ionização Ácida", difficulty: "Difícil" },
  ],
  "operon-lac": [
    { index: 0, title: "Indução por Lactose", difficulty: "Fácil" },
    { index: 1, title: "Repressão Catabólica por Glicose", difficulty: "Médio" },
    { index: 2, title: "Mutante Constitutivo Oc", difficulty: "Difícil" },
  ],
  // ── Farmacologia Básica ──
  "dose-resposta": [
    { index: 0, title: "Agonista Parcial vs Total – Buprenorfina", difficulty: "Médio" },
    { index: 1, title: "Antagonista Competitivo – Naloxona", difficulty: "Fácil" },
    { index: 2, title: "Antagonista Não-Competitivo – Fenoxibenzamina", difficulty: "Difícil" },
  ],
  "transducao-sinal": [
    { index: 0, title: "Beta-2 Adrenérgico – Salbutamol", difficulty: "Fácil" },
    { index: 1, title: "Insulina – Receptor Tirosina Quinase", difficulty: "Médio" },
    { index: 2, title: "Corticosteroides – Receptor Intracelular", difficulty: "Difícil" },
  ],
  "janela-terapeutica-farma": [
    { index: 0, title: "Digoxina – Janela Estreita", difficulty: "Difícil" },
    { index: 1, title: "Amoxicilina – Janela Ampla", difficulty: "Fácil" },
  ],
  "vias-administracao": [
    { index: 0, title: "Emergência – Anafilaxia", difficulty: "Fácil" },
    { index: 1, title: "Nitroglicerina Sublingual", difficulty: "Fácil" },
  ],
  "bloqueio-neuromuscular": [
    { index: 0, title: "Intubação em Sequência Rápida", difficulty: "Médio" },
    { index: 1, title: "Manutenção em Cirurgia Longa", difficulty: "Difícil" },
    { index: 2, title: "Reversão Pós-Cirúrgica", difficulty: "Fácil" },
  ],
  "farmaco-autonomica": [
    { index: 0, title: "Bradicardia Sinusal – Atropina", difficulty: "Fácil" },
  ],
  "tolerancia-dependencia": [
    { index: 0, title: "Tolerância a Opioides – Dor Oncológica", difficulty: "Médio" },
    { index: 1, title: "Dependência de Benzodiazepínicos", difficulty: "Difícil" },
  ],
  farmacogenomica: [
    { index: 0, title: "Clopidogrel – Metabolizador Lento CYP2C19", difficulty: "Médio" },
    { index: 1, title: "Codeína – Metabolizador Ultrarrápido CYP2D6", difficulty: "Difícil" },
    { index: 2, title: "Varfarina – Polimorfismos CYP2C9/VKORC1", difficulty: "Fácil" },
  ],
  "dispensacao-344": [
    { index: 0, title: "Receita de Alprazolam (Lista B1)", difficulty: "Fácil" },
    { index: 1, title: "Receita de Morfina (Lista A1)", difficulty: "Médio" },
    { index: 2, title: "Receita de Metilfenidato (Lista A3)", difficulty: "Difícil" },
  ],
  // ── Farmacotécnica ──
  estabilidade: [
    { index: 0, title: "Suspensão de Amoxicilina – Prazo de Validade", difficulty: "Fácil" },
    { index: 1, title: "Vitamina C Injetável – Efeito da Temperatura", difficulty: "Médio" },
    { index: 2, title: "Pomada de Hidrocortisona – Degradação de Ordem Zero", difficulty: "Difícil" },
  ],
  "liberacao-farmacos": [
    { index: 0, title: "Omeprazol Entérico vs Liberação Imediata", difficulty: "Fácil" },
    { index: 1, title: "Venlafaxina XR – Prolongada Higuchi", difficulty: "Médio" },
    { index: 2, title: "Patch Transdérmico de Fentanil", difficulty: "Difícil" },
  ],
  diluicao: [
    { index: 0, title: "Diluição de Vancomicina IV", difficulty: "Fácil" },
    { index: 1, title: "Diluição Seriada para Teste de Sensibilidade", difficulty: "Médio" },
    { index: 2, title: "Ajuste de Isotonia – Colírio", difficulty: "Difícil" },
  ],
  reologia: [
    { index: 0, title: "Gel de Carbopol – Pseudoplástico", difficulty: "Fácil" },
    { index: 1, title: "Suspensão de Amido – Dilatante", difficulty: "Médio" },
    { index: 2, title: "Pomada de Vaselina – Tixotrópico", difficulty: "Difícil" },
  ],
  "hlb-emulsoes": [
    { index: 0, title: "Emulsão O/A – Creme Hidratante", difficulty: "Fácil" },
    { index: 1, title: "Emulsão A/O – Pomada Protetora", difficulty: "Médio" },
    { index: 2, title: "Nanoemulsão Parenteral", difficulty: "Difícil" },
  ],
  granulometria: [
    { index: 0, title: "Paracetamol Micronizado", difficulty: "Fácil" },
    { index: 1, title: "Inalatório DPI – Tamanho Crítico", difficulty: "Médio" },
    { index: 2, title: "Suspensão Oral – Sedimentação", difficulty: "Difícil" },
  ],
  compressao: [
    { index: 0, title: "Comprimido de Paracetamol 500 mg", difficulty: "Fácil" },
    { index: 1, title: "Comprimido de Liberação Modificada", difficulty: "Médio" },
    { index: 2, title: "Comprimido Efervescente – Desintegração Rápida", difficulty: "Difícil" },
  ],
  "tampao-farmaceutico": [
    { index: 0, title: "Solução Oftálmica – pH 7.4", difficulty: "Fácil" },
    { index: 1, title: "Solução Injetável – Tampão Fosfato", difficulty: "Médio" },
    { index: 2, title: "Xarope Ácido – Tampão Citrato", difficulty: "Difícil" },
  ],
  // ── Química Farmacêutica ──
  "sar-explorer": [
    { index: 0, title: "Fluoroquinolonas – Substituições no Anel", difficulty: "Fácil" },
    { index: 1, title: "Benzodiazepínicos – SAR Clássica", difficulty: "Médio" },
    { index: 2, title: "Sulfonamidas – Seletividade COX-2", difficulty: "Difícil" },
  ],
  lipinski: [
    { index: 0, title: "Design de Novo Anti-hipertensivo Oral", difficulty: "Fácil" },
    { index: 1, title: "Otimização de Lead – Antibiótico", difficulty: "Médio" },
    { index: 2, title: "Peptídeo vs Peptidomimético", difficulty: "Difícil" },
  ],
  bioisosterismo: [
    { index: 0, title: "Losartan vs Valsartan – Tetrazol como Bioisóstero", difficulty: "Fácil" },
    { index: 1, title: "Celecoxibe – Sulfonamida vs Metilsulfona", difficulty: "Médio" },
    { index: 2, title: "Fluoração Bioisostérica", difficulty: "Difícil" },
  ],
  "metabolismo-farmacos": [
    { index: 0, title: "Enalapril → Enalaprilato (Pró-fármaco)", difficulty: "Fácil" },
    { index: 1, title: "Codeína → Morfina via CYP2D6", difficulty: "Médio" },
    { index: 2, title: "Paracetamol e NAPQI – Toxicidade", difficulty: "Difícil" },
  ],
  "docking-simplificado": [
    { index: 0, title: "Ibuprofeno no Sítio Ativo da COX-2", difficulty: "Fácil" },
    { index: 1, title: "Oseltamivir na Neuraminidase", difficulty: "Médio" },
    { index: 2, title: "Imatinibe no BCR-ABL", difficulty: "Difícil" },
  ],
  quiralidade: [
    { index: 0, title: "Esomeprazol – O Primeiro Chiral Switch de Sucesso", difficulty: "Fácil" },
    { index: 1, title: "Talidomida – Tragédia da Estereoquímica", difficulty: "Médio" },
    { index: 2, title: "Ibuprofeno – Inversão Quiral In Vivo", difficulty: "Difícil" },
  ],
  "pka-absorcao": [
    { index: 0, title: "Aspirina – Ácido Fraco no Estômago", difficulty: "Fácil" },
    { index: 1, title: "Diazepam – Base Fraca", difficulty: "Médio" },
    { index: 2, title: "Anfotericina B – Molécula Zwitteriônica", difficulty: "Difícil" },
  ],
  "qsar-simplificado": [
    { index: 0, title: "Sulfonamidas – Equação de Hansch Original", difficulty: "Fácil" },
    { index: 1, title: "Barbitúricos – Lipofilia e Ação no SNC", difficulty: "Médio" },
    { index: 2, title: "Quinolonas – Modelo Multivariado", difficulty: "Difícil" },
  ],
  // ── Formação Docente ──
  "avaliacao-rubrica": [
    { index: 0, title: "Avaliação Formativa em Farmacologia", difficulty: "Fácil" },
    { index: 1, title: "Rubrica para OSCE", difficulty: "Médio" },
  ],
  "preceptoria-clinica": [
    { index: 0, title: "Preceptoria em Farmácia Hospitalar", difficulty: "Fácil" },
    { index: 1, title: "Feedback ao Residente", difficulty: "Médio" },
  ],
  "feedback-formativo": [
    { index: 0, title: "Feedback em Estágio Clínico", difficulty: "Fácil" },
    { index: 1, title: "Feedback Construtivo em Simulação", difficulty: "Médio" },
  ],
  "elaboracao-questoes": [
    { index: 0, title: "Questão de Aplicação (Bloom)", difficulty: "Fácil" },
    { index: 1, title: "Questão de Análise Clínica", difficulty: "Médio" },
  ],
  "conducao-caso-pbl": [
    { index: 0, title: "Caso PBL em Farmacoterapia", difficulty: "Fácil" },
    { index: 1, title: "TBL em Farmacologia Clínica", difficulty: "Médio" },
  ],
  "planejamento-aula": [
    { index: 0, title: "Aula de Farmacocinética", difficulty: "Fácil" },
    { index: 1, title: "Aula Invertida – Interações", difficulty: "Médio" },
  ],
  "gestao-sala": [
    { index: 0, title: "Turma de 60 Alunos – Engajamento", difficulty: "Fácil" },
    { index: 1, title: "Conflito em Grupo de PBL", difficulty: "Médio" },
  ],
  // ── Odontologia ──
  odontograma: [
    { index: 0, title: "Paciente Adulto – Exame Completo", difficulty: "Fácil" },
    { index: 1, title: "Paciente Pediátrico – Dentição Mista", difficulty: "Médio" },
  ],
  "anatomia-endodontia": [
    { index: 0, title: "Molar Inferior – Canais Múltiplos", difficulty: "Médio" },
    { index: 1, title: "Incisivo Superior – Canal Único", difficulty: "Fácil" },
  ],
  periodontograma: [
    { index: 0, title: "Periodontite Generalizada", difficulty: "Médio" },
    { index: 1, title: "Gengivite Localizada", difficulty: "Fácil" },
  ],
  "anestesiologia-odonto": [
    { index: 0, title: "Bloqueio do Nervo Alveolar Inferior", difficulty: "Fácil" },
    { index: 1, title: "Anestesia Infiltrativa em Maxila", difficulty: "Médio" },
  ],
  cefalometria: [
    { index: 0, title: "Classe II Esquelética", difficulty: "Médio" },
    { index: 1, title: "Classe III – Prognatismo", difficulty: "Difícil" },
  ],
  "radiografia-odonto": [
    { index: 0, title: "Panorâmica – Identificação de Lesões", difficulty: "Fácil" },
    { index: 1, title: "Periapical – Diagnóstico Endodôntico", difficulty: "Médio" },
  ],
  "farmacologia-odonto": [
    { index: 0, title: "Prescrição Pós-Exodontia", difficulty: "Fácil" },
    { index: 1, title: "Paciente Cardiopata – Vasoconstritores", difficulty: "Médio" },
  ],
  "cirurgia-exodontia": [
    { index: 0, title: "Exodontia Simples de Molar", difficulty: "Fácil" },
    { index: 1, title: "Terceiro Molar Incluso", difficulty: "Difícil" },
  ],
  // ── Fisioterapia ──
  goniometria: [
    { index: 0, title: "Avaliação de Ombro – ADM", difficulty: "Fácil" },
    { index: 1, title: "Avaliação de Joelho Pós-LCA", difficulty: "Médio" },
  ],
  "avaliacao-postural": [
    { index: 0, title: "Escoliose Funcional", difficulty: "Fácil" },
    { index: 1, title: "Hiperlordose Lombar", difficulty: "Médio" },
  ],
  "forca-muscular": [
    { index: 0, title: "Teste Manual – Membro Superior", difficulty: "Fácil" },
    { index: 1, title: "Avaliação Pós-AVE", difficulty: "Médio" },
  ],
  dermatomos: [
    { index: 0, title: "Hérnia Discal L4-L5", difficulty: "Fácil" },
    { index: 1, title: "Lesão Medular Cervical", difficulty: "Difícil" },
  ],
  respiratorio: [
    { index: 0, title: "DPOC – Técnicas de Higiene Brônquica", difficulty: "Fácil" },
    { index: 1, title: "Pós-Operatório Torácico", difficulty: "Médio" },
  ],
  eletroterapia: [
    { index: 0, title: "TENS para Dor Lombar", difficulty: "Fácil" },
    { index: 1, title: "FES para Fortalecimento de Quadríceps", difficulty: "Médio" },
  ],
  "testes-ortopedicos": [
    { index: 0, title: "Teste de Lachman – Joelho", difficulty: "Fácil" },
    { index: 1, title: "Teste de Neer – Ombro", difficulty: "Médio" },
  ],
  berg: [
    { index: 0, title: "Idoso com Risco de Queda", difficulty: "Fácil" },
    { index: 1, title: "Paciente Pós-AVE – Equilíbrio", difficulty: "Médio" },
  ],
  // ── Nutrição ──
  "avaliacao-nutricional": [
    { index: 0, title: "Paciente Adulto – Antropometria", difficulty: "Fácil" },
    { index: 1, title: "Idoso Hospitalizado – MAN", difficulty: "Médio" },
  ],
  "triagem-nutricional": [
    { index: 0, title: "NRS-2002 em Paciente Cirúrgico", difficulty: "Fácil" },
    { index: 1, title: "MUST em Paciente Oncológico", difficulty: "Médio" },
  ],
  "necessidades-energeticas": [
    { index: 0, title: "Paciente Queimado – Harris-Benedict", difficulty: "Médio" },
    { index: 1, title: "Paciente em UTI – Calorimetria", difficulty: "Difícil" },
  ],
  tne: [
    { index: 0, title: "Nutrição Enteral em AVC", difficulty: "Fácil" },
    { index: 1, title: "Nutrição Enteral em Pancreatite", difficulty: "Médio" },
  ],
  tnp: [
    { index: 0, title: "Nutrição Parenteral Total em Fístula", difficulty: "Médio" },
    { index: 1, title: "NPT em Neonato Prematuro", difficulty: "Difícil" },
  ],
  disfagia: [
    { index: 0, title: "Disfagia Pós-AVE", difficulty: "Fácil" },
    { index: 1, title: "Disfagia em Paciente com Parkinson", difficulty: "Médio" },
  ],
  "nutricao-renal": [
    { index: 0, title: "DRC Estágio 3 – Restrição Proteica", difficulty: "Fácil" },
    { index: 1, title: "Hemodiálise – Ajuste Nutricional", difficulty: "Médio" },
  ],
  "nutricao-materno-infantil": [
    { index: 0, title: "Gestante com DMG", difficulty: "Fácil" },
    { index: 1, title: "Alimentação Complementar – 6 meses", difficulty: "Médio" },
  ],
  // ── Genética ──
  "sequenciamento-dna": [
    { index: 0, title: "Sequenciamento de Gene BRCA1", difficulty: "Médio" },
    { index: 1, title: "Identificação de Mutação Pontual", difficulty: "Fácil" },
  ],
  "snp-farmacogenetica": [
    { index: 0, title: "Genotipagem CYP2D6 – Codeína", difficulty: "Médio" },
    { index: 1, title: "SNP de VKORC1 – Varfarina", difficulty: "Fácil" },
  ],
  cariotipo: [
    { index: 0, title: "Síndrome de Down – Trissomia 21", difficulty: "Fácil" },
    { index: 1, title: "Síndrome de Turner – Monossomia X", difficulty: "Médio" },
  ],
  "heranca-mendeliana": [
    { index: 0, title: "Fibrose Cística – Autossômica Recessiva", difficulty: "Fácil" },
    { index: 1, title: "Doença de Huntington – Dominante", difficulty: "Médio" },
  ],
  "pcr-eletroforese": [
    { index: 0, title: "Detecção de HIV por PCR", difficulty: "Fácil" },
    { index: 1, title: "Diagnóstico de Anemia Falciforme", difficulty: "Médio" },
  ],
  epigenetica: [
    { index: 0, title: "Metilação em Gene Supressor Tumoral", difficulty: "Médio" },
    { index: 1, title: "Acetilação de Histonas – Ativação Gênica", difficulty: "Fácil" },
  ],
  "mutacoes-reparo": [
    { index: 0, title: "Dano UV – Dímeros de Pirimidina", difficulty: "Fácil" },
    { index: 1, title: "Erro de Replicação – Mismatch", difficulty: "Médio" },
  ],
  "genetica-populacoes": [
    { index: 0, title: "Equilíbrio de Hardy-Weinberg – Anemia Falciforme", difficulty: "Fácil" },
    { index: 1, title: "Deriva Genética em População Pequena", difficulty: "Médio" },
  ],
  // ── Manejo da Dor ──
  "manejo-dor": [
    { index: 0, title: "Caso 1: Dor Aguda Pós-Operatória", difficulty: "Fácil" },
    { index: 1, title: "Caso 2: Dor Neuropática – Lombalgia com Radiculopatia", difficulty: "Médio" },
    { index: 2, title: "Caso 3: Fibromialgia com Insônia e Fadiga", difficulty: "Médio" },
    { index: 3, title: "Caso 4: Dor Oncológica — Escalonamento", difficulty: "Difícil" },
    { index: 4, title: "Caso 5: Rotação de Opioides e Tolerância", difficulty: "Difícil" },
  ],
  // ── Inflamação e Anti-inflamatórios ──
  "inflamacao-aines": [
    { index: 0, title: "Caso 1: OA de Joelho — Seleção de AINE", difficulty: "Médio" },
    { index: 1, title: "Caso 2: OA em Idosa Polimedicada", difficulty: "Difícil" },
    { index: 2, title: "Caso 3: AR Inicial — Introdução de Corticoide", difficulty: "Médio" },
    { index: 3, title: "Caso 4: EA do Corticoide — Dose vs. Tempo", difficulty: "Difícil" },
    { index: 4, title: "Caso 5: Desmame de Corticoide", difficulty: "Difícil" },
  ],
};

export function getNativeCases(slug: string): NativeCase[] {
  return catalog[slug] || [];
}

export default catalog;
