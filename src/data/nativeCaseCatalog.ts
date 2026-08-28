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
    { index: 2, title: "Caso 3: IC e Risco Renal", difficulty: "Difícil" },
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
    { index: 2, title: "Caso 3: Desmame complexo de Lorazepam em idoso", difficulty: "Difícil" },
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
    { index: 1, title: "Tempestade Adrenérgica", difficulty: "Médio" },
    { index: 2, title: "Equilíbrio Autonômico Normal", difficulty: "Fácil" },
  ],
  "eletrofisiologia-cardiaca": [
    { index: 0, title: "Bloqueio de Canal de Sódio (Classe I)", difficulty: "Médio" },
    { index: 1, title: "Bloqueador de Canal de Cálcio (Classe IV)", difficulty: "Fácil" },
    { index: 2, title: "Hipercalemia e Repolarização", difficulty: "Difícil" },
  ],
  "depuracao-renal": [
    { index: 0, title: "Estenose de Artéria Renal", difficulty: "Médio" },
    { index: 1, title: "Desidratação Grave", difficulty: "Fácil" },
    { index: 2, title: "Nefropatia Diabética", difficulty: "Difícil" },
  ],
  "equilibrio-acido-base": [
    { index: 0, title: "Cetoacidose Diabética", difficulty: "Médio" },
    { index: 1, title: "DPOC Exacerbada", difficulty: "Médio" },
    { index: 2, title: "Vômitos Prolongados", difficulty: "Fácil" },
  ],
  "regulacao-glicemica": [
    { index: 0, title: "Diabetes Mellitus Tipo 2 – Resistência à Insulina", difficulty: "Médio" },
    { index: 1, title: "Diabetes Mellitus Tipo 1 – Deficiência Absoluta", difficulty: "Fácil" },
    { index: 2, title: "Indivíduo Saudável – Homeostase Normal", difficulty: "Fácil" },
  ],
  "eixo-hpa": [
    { index: 0, title: "Supressão Adrenal por Corticoide Exógeno", difficulty: "Médio" },
    { index: 1, title: "Resposta ao Estresse Agudo", difficulty: "Fácil" },
    { index: 2, title: "Síndrome de Cushing Endógena", difficulty: "Difícil" },
  ],
  "cinetica-enzimatica": [
    { index: 0, title: "Inibição Competitiva – Metotrexato", difficulty: "Médio" },
    { index: 1, title: "Inibição Não-Competitiva – Metais Pesados", difficulty: "Médio" },
    { index: 2, title: "Cinética Normal – Sem Inibição", difficulty: "Fácil" },
  ],
  "secrecao-gastrica": [
    { index: 0, title: "Úlcera Péptica – Tratamento com IBP", difficulty: "Fácil" },
    { index: 1, title: "DRGE – Bloqueio com Anti-H2", difficulty: "Médio" },
    { index: 2, title: "Síndrome de Zollinger-Ellison", difficulty: "Difícil" },
  ],
  "cascata-coagulacao": [
    { index: 0, title: "Hemofilia A – Deficiência de Fator VIII", difficulty: "Fácil" },
    { index: 1, title: "Uso de Varfarina – Anticoagulação Oral", difficulty: "Médio" },
    { index: 2, title: "CIVD – Coagulação Intravascular Disseminada", difficulty: "Difícil" },
  ],
  "compartimentos-adme": [
    { index: 0, title: "Paracetamol Oral – Farmacocinética Normal", difficulty: "Fácil" },
    { index: 1, title: "Lidocaína IV – Alta Extração Hepática", difficulty: "Médio" },
    { index: 2, title: "Digoxina – Alto Volume de Distribuição", difficulty: "Difícil" },
  ],
  // ── Bioquímica ──
  "cadeia-eletrons": [
    { index: 0, title: "Intoxicação por Cianeto", difficulty: "Difícil" },
    { index: 1, title: "Desacoplamento por DNP", difficulty: "Médio" },
    { index: 2, title: "Metabolismo Aeróbio Normal", difficulty: "Fácil" },
  ],
  "dissociacao-hemoglobina": [
    { index: 0, title: "Exercício Intenso", difficulty: "Fácil" },
    { index: 1, title: "Intoxicação por CO", difficulty: "Difícil" },
    { index: 2, title: "Anemia Falciforme", difficulty: "Médio" },
  ],
  "glicolise-gliconeogenese": [
    { index: 0, title: "Estado Pós-Prandial", difficulty: "Fácil" },
    { index: 1, title: "Jejum Prolongado (48h)", difficulty: "Médio" },
    { index: 2, title: "Diabetes Tipo 2 Descompensada", difficulty: "Difícil" },
  ],
  "cinetica-avancada": [
    { index: 0, title: "Inibição Competitiva — Metotrexato", difficulty: "Fácil" },
    { index: 1, title: "Inibição Não-Competitiva — Metais Pesados", difficulty: "Médio" },
    { index: 2, title: "Inibição Acompetitiva — Lítio na GSK-3", difficulty: "Difícil" },
  ],
  "ciclo-ureia": [
    { index: 0, title: "Deficiência de OTC (Ornitina Transcarbamilase)", difficulty: "Difícil" },
    { index: 1, title: "Deficiência de CPS I", difficulty: "Difícil" },
    { index: 2, title: "Citrulinemia Tipo I (Deficiência de ASS)", difficulty: "Médio" },
  ],
  "acido-araquidonico": [
    { index: 0, title: "Inflamação Aguda — AINEs", difficulty: "Fácil" },
    { index: 1, title: "Prevenção Cardiovascular — Aspirina", difficulty: "Médio" },
    { index: 2, title: "Asma — Via dos Leucotrienos", difficulty: "Difícil" },
  ],
  lipoproteinas: [
    { index: 0, title: "Hipercolesterolemia Familiar Heterozigótica", difficulty: "Difícil" },
    { index: 1, title: "Dislipidemia Mista", difficulty: "Médio" },
    { index: 2, title: "LDL Residual — Uso de iPCSK9", difficulty: "Difícil" },
  ],
  "pentoses-fosfato": [
    { index: 0, title: "Crise Hemolítica por Primaquina", difficulty: "Difícil" },
    { index: 1, title: "Favismo — Ingestão de Favas", difficulty: "Médio" },
    { index: 2, title: "Eritrócito Normal sob Stresse Oxidativo", difficulty: "Fácil" },
  ],
  "titulacao-aminoacidos": [
    { index: 0, title: "Titulação de Glicina — Aminoácido Simples", difficulty: "Fácil" },
    { index: 1, title: "Titulação de Ácido Glutâmico — Cadeia Lateral Ácida", difficulty: "Médio" },
    { index: 2, title: "Titulação de Histidina — Tampão Fisiológico", difficulty: "Difícil" },
  ],
  "operon-lac": [
    { index: 0, title: "Crescimento Diáuxico — Transição Glicose → Lactose", difficulty: "Médio" },
    { index: 1, title: "Indução Máxima — Lactose sem Glicose", difficulty: "Fácil" },
    { index: 2, title: "Mutação no Operador — Operão Constitutivo", difficulty: "Difícil" },
  ],
  // ── Farmacologia Básica ──
  "dose-resposta": [
    { index: 0, title: "Agonista Parcial – Buprenorfina vs Morfina", difficulty: "Médio" },
    { index: 1, title: "Antagonista Competitivo – Naloxona", difficulty: "Médio" },
    { index: 2, title: "Antagonista Não-Competitivo – Fenoxibenzamina", difficulty: "Difícil" },
  ],
  "transducao-sinal": [
    { index: 0, title: "Salbutamol e β2-adrenérgicos (Gs)", difficulty: "Fácil" },
    { index: 1, title: "Atropina e receptores M3 (Gq)", difficulty: "Médio" },
    { index: 2, title: "Insulina e Receptor Tirosina Quinase", difficulty: "Médio" },
  ],
  "janela-terapeutica-farma": [
    { index: 0, title: "Digoxina – Janela Estreita", difficulty: "Difícil" },
    { index: 1, title: "Amoxicilina – Janela Ampla", difficulty: "Fácil" },
    { index: 2, title: "Lítio – Faixa Terapêutica Crítica", difficulty: "Difícil" },
  ],
  "vias-administracao": [
    { index: 0, title: "Emergência – Anafilaxia", difficulty: "Fácil" },
    { index: 1, title: "Nitroglicerina Sublingual", difficulty: "Fácil" },
    { index: 2, title: "Vancomicina IV – Infusão Contínua", difficulty: "Médio" },
  ],
  "bloqueio-neuromuscular": [
    { index: 0, title: "Intubação de Sequência Rápida – Succinilcolina", difficulty: "Médio" },
    { index: 1, title: "Rocurônio + Sugammadex", difficulty: "Médio" },
    { index: 2, title: "Bloqueio Residual Pós-operatório", difficulty: "Difícil" },
  ],
  "farmaco-autonomica": [
    { index: 0, title: "Bradicardia Sinusal – Atropina", difficulty: "Fácil" },
    { index: 1, title: "Crise Hipertensiva – Fentolamina", difficulty: "Médio" },
    { index: 2, title: "Glaucoma de Ângulo Aberto – Pilocarpina", difficulty: "Médio" },
  ],
  "tolerancia-dependencia": [
    { index: 0, title: "Tolerância a Opioides – Dor Oncológica", difficulty: "Médio" },
    { index: 1, title: "Dependência de Benzodiazepínicos", difficulty: "Difícil" },
    { index: 2, title: "Síndrome de Abstinência Alcoólica", difficulty: "Difícil" },
  ],
  farmacogenomica: [
    { index: 0, title: "Codeína → Morfina (CYP2D6)", difficulty: "Médio" },
    { index: 1, title: "Varfarina e CYP2C9/VKORC1", difficulty: "Difícil" },
    { index: 2, title: "Clopidogrel e CYP2C19", difficulty: "Médio" },
  ],
  "dispensacao-344": [
    { index: 0, title: "Caso 1: Notificação A — Morfina (Lista A1)", difficulty: "Médio" },
    { index: 1, title: "Caso 2: Notificação B — Clonazepam (Lista B1)", difficulty: "Difícil" },
    { index: 2, title: "Caso 3: Receita C — Polifarmácia (Lista C1)", difficulty: "Difícil" },
  ],
  // ── Farmacotécnica ──
  estabilidade: [
    { index: 0, title: "Suspensão de Amoxicilina – Prazo de Validade", difficulty: "Fácil" },
    { index: 1, title: "Vitamina C Injetável – Efeito da Temperatura", difficulty: "Médio" },
    { index: 2, title: "Pomada de Hidrocortisona – Degradação de Ordem Zero", difficulty: "Difícil" },
  ],
  "liberacao-farmacos": [
    { index: 0, title: "Omeprazol Entérico vs Liberação Imediata", difficulty: "Fácil" },
    { index: 1, title: "Nifedipino OROS – Liberação Prolongada", difficulty: "Médio" },
    { index: 2, title: "Patch Transdérmico de Fentanil", difficulty: "Difícil" },
  ],
  diluicao: [
    { index: 0, title: "Diluição de Adrenalina 1:1000 para 1:10.000", difficulty: "Fácil" },
    { index: 1, title: "Diluição Seriada para Teste de Sensibilidade", difficulty: "Médio" },
    { index: 2, title: "Isotonia de Colírio – Equivalente em NaCl", difficulty: "Difícil" },
  ],
  reologia: [
    { index: 0, title: "Gel de Carbômero 940 – Pseudoplástico", difficulty: "Fácil" },
    { index: 1, title: "Creme com HPMC – Comportamento Tixotrópico", difficulty: "Médio" },
    { index: 2, title: "Suspensão Concentrada – Dilatante", difficulty: "Difícil" },
  ],
  "hlb-emulsoes": [
    { index: 0, title: "Creme O/A com Óleo Mineral", difficulty: "Fácil" },
    { index: 1, title: "Cold Cream (A/O) com Cera de Abelha", difficulty: "Médio" },
    { index: 2, title: "Emulsão Injetável – Lipídio e Lecitina", difficulty: "Difícil" },
  ],
  granulometria: [
    { index: 0, title: "Lactose para Compressão Direta", difficulty: "Fácil" },
    { index: 1, title: "Inalador de Pó Seco – Partículas Finas", difficulty: "Médio" },
    { index: 2, title: "Suspensão Oral – Controle de Sedimentação", difficulty: "Difícil" },
  ],
  compressao: [
    { index: 0, title: "Comprimido de Paracetamol 500 mg", difficulty: "Fácil" },
    { index: 1, title: "Comprimido Orodispersível", difficulty: "Médio" },
    { index: 2, title: "Comprimido de Liberação Prolongada", difficulty: "Difícil" },
  ],
  "tampao-farmaceutico": [
    { index: 0, title: "Colírio de Timolol – Tampão Fosfato pH 6.8", difficulty: "Fácil" },
    { index: 1, title: "Solução Injetável – Tampão Citrato pH 5.0", difficulty: "Médio" },
    { index: 2, title: "Formulação de Eritromicina – pH e Estabilidade", difficulty: "Difícil" },
  ],
  // ── Química Farmacêutica ──
  "sar-explorer": [
    { index: 0, title: "Otimização de Diazepam – Potência Ansiolítica", difficulty: "Fácil" },
    { index: 1, title: "Sulfametoxazol – Otimização de Espectro", difficulty: "Médio" },
    { index: 2, title: "Ciprofloxacino – Design de Fluoroquinolona", difficulty: "Difícil" },
  ],
  lipinski: [
    { index: 0, title: "Design de Novo Anti-hipertensivo Oral", difficulty: "Fácil" },
    { index: 1, title: "Análise de Druglikeness – Peptídeo Cíclico", difficulty: "Médio" },
    { index: 2, title: "Otimização de Lead – Redução de MW e logP", difficulty: "Difícil" },
  ],
  bioisosterismo: [
    { index: 0, title: "Losartan vs Valsartan – Tetrazol como Bioisóstero", difficulty: "Fácil" },
    { index: 1, title: "Celecoxibe – Sulfonamida vs Ester/Amida", difficulty: "Médio" },
    { index: 2, title: "Pró-fármaco – Éster vs Amida na Estabilidade", difficulty: "Difícil" },
  ],
  "metabolismo-farmacos": [
    { index: 0, title: "Enalapril – Ativação por Esterases Hepáticas", difficulty: "Fácil" },
    { index: 1, title: "Clopidogrel – Ativação CYP2C19 e Polimorfismo", difficulty: "Médio" },
    { index: 2, title: "Codeína → Morfina – CYP2D6 e Ultra-rápidos", difficulty: "Difícil" },
  ],
  "docking-simplificado": [
    { index: 0, title: "Celecoxibe no Sítio da COX-2", difficulty: "Fácil" },
    { index: 1, title: "Enalaprilato na ECA – Coordenação com Zinco", difficulty: "Médio" },
    { index: 2, title: "Saquinavir na HIV Protease – Design Peptidomimético", difficulty: "Difícil" },
  ],
  quiralidade: [
    { index: 0, title: "Esomeprazol – O Primeiro Chiral Switch de Sucesso", difficulty: "Fácil" },
    { index: 1, title: "Talidomida – Tragédia da Estereoquímica", difficulty: "Médio" },
    { index: 2, title: "Ibuprofeno – Inversão Quiral In Vivo", difficulty: "Difícil" },
  ],
  "pka-absorcao": [
    { index: 0, title: "Aspirina – Absorção Gástrica de Ácido Fraco", difficulty: "Fácil" },
    { index: 1, title: "Morfina – Base Fraca e Armadilha Iônica", difficulty: "Médio" },
    { index: 2, title: "Propranolol vs Atenolol – Lipofilia e pKa", difficulty: "Difícil" },
  ],
  "qsar-simplificado": [
    { index: 0, title: "Sulfonamidas – Equação de Hansch Original", difficulty: "Fácil" },
    { index: 1, title: "Barbitúricos – Atividade Hipnótica e logP", difficulty: "Médio" },
    { index: 2, title: "QSAR Multivariado – σ Hammett e Atividade", difficulty: "Difícil" },
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
    { index: 0, title: "Detecção de Mutação BRCA1 (Sanger)", difficulty: "Fácil" },
    { index: 1, title: "Painel Genômico Tumoral (NGS)", difficulty: "Médio" },
    { index: 2, title: "Comparação Sanger vs NGS — Fibrose Cística", difficulty: "Difícil" },
  ],
  "snp-farmacogenetica": [
    { index: 0, title: "CYP2D6 e Codeína — Metabolizador Ultrarrápido", difficulty: "Difícil" },
    { index: 1, title: "CYP2C19 e Clopidogrel — Metabolizador Lento", difficulty: "Médio" },
    { index: 2, title: "VKORC1 e Varfarina — Sensibilidade Aumentada", difficulty: "Fácil" },
  ],
  cariotipo: [
    { index: 0, title: "Síndrome de Down (Trissomia 21)", difficulty: "Fácil" },
    { index: 1, title: "Síndrome de Klinefelter (47,XXY)", difficulty: "Médio" },
    { index: 2, title: "Translocação Robertsoniana t(14;21)", difficulty: "Difícil" },
  ],
  "heranca-mendeliana": [
    { index: 0, title: "Fibrose Cística — AR", difficulty: "Fácil" },
    { index: 1, title: "Doença de Huntington — AD", difficulty: "Médio" },
    { index: 2, title: "Hemofilia A — Ligada ao X", difficulty: "Difícil" },
  ],
  "pcr-eletroforese": [
    { index: 0, title: "HPV por PCR Convencional", difficulty: "Fácil" },
    { index: 1, title: "PCR Multiplex — Distrofia de Duchenne", difficulty: "Médio" },
    { index: 2, title: "RT-qPCR para SARS-CoV-2", difficulty: "Difícil" },
  ],
  epigenetica: [
    { index: 0, title: "Silenciamento de p16 (Tumor)", difficulty: "Médio" },
    { index: 1, title: "Imprinting — Prader-Willi", difficulty: "Difícil" },
    { index: 2, title: "Gene Housekeeping — GAPDH", difficulty: "Fácil" },
  ],
  "mutacoes-reparo": [
    { index: 0, title: "Mutação TP53 (Substituição)", difficulty: "Fácil" },
    { index: 1, title: "Frameshift em BRCA2", difficulty: "Médio" },
    { index: 2, title: "Dímeros UV — Xeroderma", difficulty: "Difícil" },
  ],
  "genetica-populacoes": [
    { index: 0, title: "Equilíbrio HW — Fibrose Cística", difficulty: "Fácil" },
    { index: 1, title: "Seleção contra Homozigotos", difficulty: "Médio" },
    { index: 2, title: "Deriva Genética — Pop. Pequena", difficulty: "Difícil" },
  ],
  // ── Manejo da Dor ──
  "manejo-dor": [
    { index: 0, title: "Caso 1: Dor Aguda Pós-Operatória", difficulty: "Fácil" },
    { index: 1, title: "Caso 2: Dor Neuropática – Lombalgia com Radiculopatia", difficulty: "Médio" },
    { index: 2, title: "Caso 3: Fibromialgia com Insônia e Fadiga", difficulty: "Médio" },
    { index: 3, title: "Caso 4: Dor Oncológica — Escalonamento pela Escada OMS", difficulty: "Difícil" },
    { index: 4, title: "Caso 5: Rotação de Opioides e Manejo de Tolerância", difficulty: "Difícil" },
  ],
  // ── Inflamação e Anti-inflamatórios ──
  "inflamacao-aines": [
    { index: 0, title: "Caso 1: OA de Joelho — Seleção de AINE", difficulty: "Médio" },
    { index: 1, title: "Caso 2: OA em Idosa Polimedicada", difficulty: "Difícil" },
    { index: 2, title: "Caso 3: AR Inicial — Introdução de Corticoide", difficulty: "Médio" },
    { index: 3, title: "Caso 4: EA do Corticoide — Dose vs. Tempo-Dependentes", difficulty: "Difícil" },
    { index: 4, title: "Caso 5: Desmame de Corticoide e Síndrome de Abstinência", difficulty: "Difícil" },
  ],
  // ── Infecções e Antibioticoterapia ──
  "infeccoes-antibioticos": [
    { index: 0, title: "Caso 1: Cistite em Mulher Jovem — Seleção de Antibiótico", difficulty: "Médio" },
    { index: 1, title: "Caso 2: Pielonefrite com E. coli ESBL — Escalonamento", difficulty: "Difícil" },
    { index: 2, title: "Caso 3: ITU na Gestação — Antibióticos Seguros", difficulty: "Médio" },
    { index: 3, title: "Caso 4: Diarreia Aquosa vs Disenteria — Algoritmo de Conduta", difficulty: "Médio" },
    { index: 4, title: "Caso 5: Diarreia por C. difficile — Complicações", difficulty: "Difícil" },
  ],
  // ── Tratamento da Asma ──
  "tratamento-asma": [
    { index: 0, title: "Caso 1: Classificação e Espirometria Inicial", difficulty: "Fácil" },
    { index: 1, title: "Caso 2: Escalonamento Terapêutico", difficulty: "Médio" },
    { index: 2, title: "Caso 3: Asma Grave — Terapia Biológica", difficulty: "Difícil" },
    { index: 3, title: "Caso 4: Asma na Gestação — Segurança do CI", difficulty: "Médio" },
    { index: 4, title: "Caso 5: Exacerbação Grave no PS", difficulty: "Difícil" },
  ],
  // ── Farmacoterapia Laboratorial ──
  "farmacoterapia-hemograma": [
    { index: 0, title: "Caso 1: Anemia Microcítica Ferropriva", difficulty: "Fácil" },
    { index: 1, title: "Caso 2: Anemia Megaloblástica por Deficiência de B12", difficulty: "Médio" },
    { index: 2, title: "Caso 3: Neutropenia Febril Pós-Quimioterapia", difficulty: "Difícil" },
    { index: 3, title: "Caso 4: Plaquetopenia com Sangramento", difficulty: "Médio" },
    { index: 4, title: "Caso 5: Leucocitose — Reacional vs Leucemia", difficulty: "Difícil" },
  ],
  "farmacoterapia-acido-base": [
    { index: 0, title: "Caso 1: Cetoacidose Diabética (Acidose Metabólica AG Elevado)", difficulty: "Médio" },
    { index: 1, title: "Caso 2: Alcalose Metabólica Hipoclorêmica (Vômitos)", difficulty: "Fácil" },
    { index: 2, title: "Caso 3: Hipocalemia e Toxicidade Digitálica", difficulty: "Difícil" },
    { index: 3, title: "Caso 4: Hipercalemia com Risco de Arritmia", difficulty: "Difícil" },
    { index: 4, title: "Caso 5: Hiponatremia Dilucional (SIADH)", difficulty: "Médio" },
  ],
  "farmacoterapia-hepatopatia": [
    { index: 0, title: "Caso 1: Hepatotoxicidade por Paracetamol", difficulty: "Médio" },
    { index: 1, title: "Caso 2: Hepatite por Isoniazida", difficulty: "Médio" },
    { index: 2, title: "Caso 3: Cirrose Child-Pugh C", difficulty: "Difícil" },
    { index: 3, title: "Caso 4: Interação Fluconazol + Estatina", difficulty: "Médio" },
    { index: 4, title: "Caso 5: Encefalopatia Hepática", difficulty: "Difícil" },
  ],
  "farmacoterapia-renal": [
    { index: 0, title: "Caso 1: Vancomicina em DRC G3", difficulty: "Médio" },
    { index: 1, title: "Caso 2: Metformina em DRC G4", difficulty: "Fácil" },
    { index: 2, title: "Caso 3: Nefrotoxicidade por Gentamicina", difficulty: "Difícil" },
    { index: 3, title: "Caso 4: AINE em Idoso — DRC G2→G4", difficulty: "Médio" },
    { index: 4, title: "Caso 5: Toxicidade Digitálica por DRC", difficulty: "Difícil" },
  ],
  "farmacoterapia-infeccao-lab": [
    { index: 0, title: "Caso 1: PAC — Leucocitose + PCR Alta", difficulty: "Fácil" },
    { index: 1, title: "Caso 2: Sepse — PCT >10 + Lactato >4", difficulty: "Difícil" },
    { index: 2, title: "Caso 3: Viral vs Bacteriana", difficulty: "Fácil" },
    { index: 3, title: "Caso 4: Neutropenia Febril", difficulty: "Difícil" },
    { index: 4, title: "Caso 5: Desescalonamento por Cultura", difficulty: "Médio" },
  ],
  "farmacoterapia-dislipidemia": [
    { index: 0, title: "Caso 1: Risco Alto — LDL 180", difficulty: "Médio" },
    { index: 1, title: "Caso 2: Intolerância à Estatina", difficulty: "Médio" },
    { index: 2, title: "Caso 3: TG >500 — Risco de Pancreatite", difficulty: "Difícil" },
    { index: 3, title: "Caso 4: Pós-IAM — Meta <50", difficulty: "Difícil" },
    { index: 4, title: "Caso 5: HF — LDL Refratário", difficulty: "Difícil" },
  ],
  "farmacoterapia-glicemia": [
    { index: 0, title: "Caso 1: DM2 Recém-diagnosticado", difficulty: "Fácil" },
    { index: 1, title: "Caso 2: DM2 com Doença CV", difficulty: "Médio" },
    { index: 2, title: "Caso 3: DM2 com DRC G3b", difficulty: "Difícil" },
    { index: 3, title: "Caso 4: Cetoacidose Diabética", difficulty: "Difícil" },
    { index: 4, title: "Caso 5: DM2 Idoso Frágil", difficulty: "Médio" },
  ],
  "farmacoterapia-coagulacao": [
    { index: 0, title: "Caso 1: Início de Varfarina (FA)", difficulty: "Médio" },
    { index: 1, title: "Caso 2: INR Supraterapêutico", difficulty: "Difícil" },
    { index: 2, title: "Caso 3: TVP Aguda", difficulty: "Médio" },
    { index: 3, title: "Caso 4: Sangramento por HNF", difficulty: "Difícil" },
    { index: 4, title: "Caso 5: Preparo Pré-operatório", difficulty: "Médio" },
  ],
  // ── Prontuário Eletrônico (FHIR) ──
  "prontuario-fhir": [
    { index: 0, title: "Caso 1: HAS recém-diagnosticada com hiperpotassemia por IECA", difficulty: "Médio" },
    { index: 1, title: "Caso 2: Cistite não complicada com ajuste guiado por urocultura", difficulty: "Fácil" },
  ],
};

export function getNativeCases(slug: string): NativeCase[] {
  return catalog[slug] || [];
}

export default catalog;
