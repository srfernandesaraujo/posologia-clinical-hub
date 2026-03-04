import { useState, useCallback, useMemo } from "react";
import { Heart, Brain, Droplet, Wind, Pill, Activity, Crosshair, Anchor, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import GameNarrative from "./GameNarrative";
import GameDifficultySelector, { type GameDifficulty } from "./GameDifficultySelector";
import GameStarsResult from "./GameStarsResult";
import GameFeedbackOverlay from "./GameFeedbackOverlay";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  reference: string;
}

interface Organ {
  id: string;
  name: string;
  emoji: string;
  size: number; // cells
  cells: [number, number][];
  hitCells: Set<string>;
  sunk: boolean;
}

interface Cell {
  organId: string | null;
  status: "hidden" | "water" | "hit" | "miss";
}

type Phase = "narrative" | "difficulty" | "playing" | "question" | "feedback" | "result";

// ─── Question Bank ───────────────────────────────────────────────────────────
const questionBank: Record<string, Record<GameDifficulty, Question[]>> = {
  coracao: {
    academic: [
      { question: "Qual classe farmacológica é primeira escolha na insuficiência cardíaca com fração de ejeção reduzida?", options: ["IECA/BRA", "Bloqueadores de canal de cálcio", "Anti-histamínicos", "Fluoroquinolonas"], correctIndex: 0, explanation: "IECAs (como Enalapril) e BRAs são pilares do tratamento da ICFEr, reduzindo mortalidade ao bloquear o SRAA.", reference: "Diretriz Brasileira de IC – SBC 2021" },
      { question: "O mecanismo de ação dos betabloqueadores no coração envolve:", options: ["Bloqueio de receptores β-adrenérgicos", "Inibição da COX-2", "Ativação de receptores muscarínicos", "Bloqueio de canais de sódio"], correctIndex: 0, explanation: "Betabloqueadores (Carvedilol, Bisoprolol, Metoprolol) bloqueiam receptores β1 cardíacos, reduzindo FC e consumo de O₂.", reference: "Goodman & Gilman, 13ª ed." },
      { question: "A digoxina atua primariamente inibindo qual bomba/enzima?", options: ["Na⁺/K⁺-ATPase", "H⁺/K⁺-ATPase", "Ca²⁺-ATPase do retículo", "Adenilato ciclase"], correctIndex: 0, explanation: "A digoxina inibe a Na⁺/K⁺-ATPase, aumentando o Ca²⁺ intracelular e a contratilidade (efeito inotrópico positivo).", reference: "Rang & Dale, 9ª ed." },
      { question: "Qual fármaco é um antiarrítmico classe III (bloqueador de canais de K⁺)?", options: ["Amiodarona", "Lidocaína", "Verapamil", "Propranolol"], correctIndex: 0, explanation: "A Amiodarona bloqueia canais de K⁺ (classe III de Vaughan-Williams), prolongando o potencial de ação e o período refratário.", reference: "Classificação de Vaughan-Williams" },
      { question: "O principal efeito adverso da Amiodarona que exige monitoramento tireoidiano é:", options: ["Disfunção tireoidiana (hipo ou hiper)", "Hepatotoxicidade", "Nefrotoxicidade", "Trombocitopenia"], correctIndex: 0, explanation: "A Amiodarona contém iodo e pode causar tanto hipotireoidismo quanto hipertireoidismo. TSH deve ser monitorado a cada 6 meses.", reference: "UpToDate – Amiodarone adverse effects" },
      { question: "Na fibrilação atrial, qual escore avalia o risco de AVC para indicar anticoagulação?", options: ["CHA₂DS₂-VASc", "APACHE II", "Child-Pugh", "SOFA"], correctIndex: 0, explanation: "O escore CHA₂DS₂-VASc estratifica o risco tromboembólico na FA. Pontuação ≥2 indica anticoagulação oral.", reference: "ESC Guidelines FA 2020" },
      { question: "Qual é o antídoto específico para intoxicação digitálica?", options: ["Anticorpos anti-digoxina (Fab)", "Flumazenil", "N-acetilcisteína", "Naloxona"], correctIndex: 0, explanation: "Fragmentos Fab anti-digoxina neutralizam a digoxina circulante e são indicados em intoxicação grave.", reference: "Toxicologia Clínica – Olson" },
      { question: "O intervalo QT prolongado por fármacos aumenta o risco de qual arritmia?", options: ["Torsades de Pointes", "Flutter atrial", "Bradicardia sinusal", "Bloqueio AV 1º grau"], correctIndex: 0, explanation: "O prolongamento do QT predispõe a Torsades de Pointes (TV polimórfica), potencialmente fatal.", reference: "Credible Meds – QT Drug Lists" },
    ],
    clinical: [
      { question: "Paciente com IC classe III NYHA, FE 30%, em uso de Enalapril e Carvedilol. Qual fármaco adicionar para reduzir mortalidade?", options: ["Espironolactona", "Anlodipino", "Digoxina", "AAS"], correctIndex: 0, explanation: "A Espironolactona (antagonista de aldosterona) reduz mortalidade na ICFEr quando adicionada a IECA + betabloqueador (estudo RALES).", reference: "Estudo RALES – NEJM 1999" },
      { question: "Paciente em uso de Varfarina e Amiodarona. Qual a conduta quanto ao INR?", options: ["Reduzir dose de Varfarina em 30-50% e monitorar INR", "Manter mesma dose e monitorar", "Suspender Varfarina", "Trocar por AAS"], correctIndex: 0, explanation: "Amiodarona inibe CYP2C9 e CYP3A4, aumentando o efeito da Varfarina. A dose deve ser reduzida empiricamente e o INR monitorado de perto.", reference: "Drug Interactions – Lexicomp" },
      { question: "Qual betabloqueador NÃO tem evidência de redução de mortalidade em IC?", options: ["Atenolol", "Carvedilol", "Bisoprolol", "Metoprolol succinato"], correctIndex: 0, explanation: "Apenas Carvedilol, Bisoprolol e Metoprolol succinato têm evidência robusta em IC. Atenolol não foi estudado neste contexto.", reference: "Diretriz IC – SBC 2021" },
      { question: "Paciente com FA e CHA₂DS₂-VASc = 3. Qual anticoagulante é preferível a Varfarina?", options: ["DOAC (ex: Apixabana)", "AAS", "Clopidogrel", "Heparina SC crônica"], correctIndex: 0, explanation: "DOACs (Apixabana, Rivaroxabana, Dabigatrana) são preferidos à Varfarina na FA não-valvar por perfil de segurança superior.", reference: "ESC Guidelines FA 2020" },
      { question: "Diurético de alça + IECA em IC descompensada. Qual distúrbio eletrolítico monitorar?", options: ["Hipocalemia e hiponatremia", "Hipercalcemia", "Hiperfosfatemia", "Hipermagnesemia"], correctIndex: 0, explanation: "Furosemida causa perda de K⁺ e Na⁺. Associada a IECA, pode agravar hipotensão. Monitorar eletrólitos frequentemente.", reference: "Diretriz IC Descompensada – SBC" },
      { question: "Sacubitril/Valsartana substitui qual classe no tratamento da ICFEr?", options: ["IECA/BRA", "Betabloqueadores", "Diuréticos", "Digitálicos"], correctIndex: 0, explanation: "Entresto (Sacubitril/Valsartana) é um ARNI que substitui o IECA/BRA, com superioridade demonstrada no estudo PARADIGM-HF.", reference: "Estudo PARADIGM-HF – NEJM 2014" },
      { question: "Qual é o ritmo inicial mais comum em parada cardiorrespiratória intra-hospitalar?", options: ["AESP / Assistolia", "FV", "TV com pulso", "Bradicardia sinusal"], correctIndex: 0, explanation: "Em PCR intra-hospitalar, AESP e assistolia são os ritmos iniciais mais comuns (~70-80%), diferente da PCR extra-hospitalar.", reference: "AHA ACLS Guidelines 2020" },
      { question: "Na cardioversão elétrica sincronizada de FA, qual energia inicial é recomendada com bifásico?", options: ["120-200J", "50J", "360J", "10J"], correctIndex: 0, explanation: "Para FA, cardioversão bifásica inicia com 120-200J. Em flutter atrial, pode-se começar com energia menor (50-100J).", reference: "AHA ACLS 2020" },
    ],
    specialist: [
      { question: "Paciente com ICFEr, K⁺ 5.8, ClCr 25 mL/min. Qual conduta com Espironolactona?", options: ["Suspender e monitorar K⁺", "Dobrar a dose", "Manter e adicionar furosemida", "Trocar por eplerenona"], correctIndex: 0, explanation: "K⁺ > 5.5 e/ou ClCr < 30 são contraindicações relativas à espironolactona pelo risco de hipercalemia grave.", reference: "Diretriz IC – SBC 2021" },
      { question: "Ivabradina é indicada em IC quando a FC persiste acima de:", options: ["70 bpm com betabloqueador em dose máxima tolerada", "60 bpm", "100 bpm sem betabloqueador", "90 bpm com dose inicial de betabloqueador"], correctIndex: 0, explanation: "Ivabradina bloqueia canais If do nó sinusal. Indicada se FC ≥ 70bpm em ritmo sinusal apesar de betabloqueador otimizado.", reference: "Estudo SHIFT – Lancet 2010" },
      { question: "Na síndrome de Brugada, quais fármacos são absolutamente contraindicados?", options: ["Bloqueadores de canal de sódio (Flecainida, Propafenona)", "Betabloqueadores", "IECA", "Estatinas"], correctIndex: 0, explanation: "Fármacos que bloqueiam canais de Na⁺ podem desmascarar ou agravar o padrão de Brugada e precipitar arritmias fatais.", reference: "BrugadaDrugs.org" },
      { question: "Qual é o mecanismo do efeito pró-arrítmico da Digoxina em nível tóxico?", options: ["Sobrecarga de Ca²⁺ intracelular gerando pós-potenciais tardios", "Bloqueio de canais de K⁺", "Ativação simpática reflexa", "Depleção de Mg²⁺"], correctIndex: 0, explanation: "A inibição excessiva da Na⁺/K⁺-ATPase aumenta o Ca²⁺ intracelular, gerando delayed afterdepolarizations (DADs) e arritmias.", reference: "Rang & Dale – Toxicidade Digitálica" },
      { question: "Paciente com IC avançada refratária. Qual dispositivo reduz mortalidade em FE ≤ 35%?", options: ["CDI (Cardiodesfibrilador Implantável)", "Marca-passo unicameral", "Balão intra-aórtico", "ECMO"], correctIndex: 0, explanation: "O CDI previne morte súbita arrítmica em pacientes com ICFEr e FE ≤ 35% apesar de terapia otimizada (prevenção primária).", reference: "Estudo MADIT-II / SCD-HeFT" },
      { question: "Dapagliflozina na IC: qual é o mecanismo que reduz a pré-carga?", options: ["Natriurese e diurese osmótica por inibição de SGLT2", "Vasodilatação arterial", "Bloqueio de aldosterona", "Inibição da ECA"], correctIndex: 0, explanation: "Inibidores de SGLT2 promovem glicosúria e natriurese, reduzindo volume intravascular sem ativar o SRAA de forma reflexa.", reference: "Estudo DAPA-HF – NEJM 2019" },
      { question: "No choque cardiogênico, qual inotrópico tem menor efeito arritmogênico?", options: ["Levosimendan", "Dobutamina", "Milrinona", "Isoproterenol"], correctIndex: 0, explanation: "Levosimendan sensibiliza troponina C ao cálcio sem aumentar o Ca²⁺ intracelular, sendo menos arritmogênico.", reference: "ESC Guidelines – Choque Cardiogênico 2021" },
      { question: "Qual a interação perigosa entre Verapamil e betabloqueadores IV?", options: ["Bradicardia severa e bloqueio AV por duplo bloqueio nodal", "Taquicardia reflexa", "Hipertensão rebote", "Broncoespasmo isolado"], correctIndex: 0, explanation: "Verapamil + betabloqueador IV causam bloqueio AV aditivo, podendo levar a bradicardia extrema e assistolia.", reference: "UpToDate – Verapamil drug interactions" },
    ],
  },
  figado: {
    academic: [
      { question: "Qual sistema enzimático hepático é o principal responsável pelo metabolismo de fármacos?", options: ["Citocromo P450 (CYP)", "Monoamina oxidase (MAO)", "Álcool desidrogenase", "Glucuroniltransferase"], correctIndex: 0, explanation: "O sistema CYP450 (especialmente CYP3A4, CYP2D6, CYP2C9) é responsável pela biotransformação fase I da maioria dos fármacos.", reference: "Goodman & Gilman, 13ª ed." },
      { question: "Qual fármaco é o exemplo clássico de hepatotoxicidade dose-dependente?", options: ["Paracetamol (Acetaminofeno)", "Amoxicilina", "Omeprazol", "Metformina"], correctIndex: 0, explanation: "O Paracetamol em superdosagem gera NAPQI, metabólito tóxico que depleta glutationa e causa necrose hepática centrolobular.", reference: "Toxicologia Clínica – Olson" },
      { question: "Qual é o antídoto para intoxicação por Paracetamol?", options: ["N-acetilcisteína (NAC)", "Flumazenil", "Naloxona", "Vitamina K"], correctIndex: 0, explanation: "A NAC repõe os estoques de glutationa hepática e neutraliza o NAPQI. Mais eficaz nas primeiras 8-10h.", reference: "Protocolo Rumack-Matthew" },
      { question: "A classificação de Child-Pugh avalia a gravidade de:", options: ["Cirrose hepática", "Insuficiência renal", "Insuficiência cardíaca", "Fibrose pulmonar"], correctIndex: 0, explanation: "Child-Pugh avalia a função hepática na cirrose usando: bilirrubina, albumina, INR, ascite e encefalopatia.", reference: "Hepatologia Clínica" },
      { question: "Qual isoenzima CYP é a mais abundante no fígado humano?", options: ["CYP3A4", "CYP2D6", "CYP1A2", "CYP2E1"], correctIndex: 0, explanation: "CYP3A4 representa ~30% do CYP hepático total e metaboliza cerca de 50% dos fármacos usados clinicamente.", reference: "Clinical Pharmacokinetics – Rowland & Tozer" },
      { question: "O Omeprazol é metabolizado primariamente por qual CYP?", options: ["CYP2C19", "CYP3A4", "CYP2D6", "CYP1A2"], correctIndex: 0, explanation: "CYP2C19 é a principal enzima do metabolismo do Omeprazol. Polimorfismos genéticos afetam sua eficácia.", reference: "PharmGKB – Omeprazol" },
      { question: "A albumina sérica é sintetizada principalmente em qual órgão?", options: ["Fígado", "Rins", "Baço", "Medula óssea"], correctIndex: 0, explanation: "O fígado sintetiza ~10g/dia de albumina. Na cirrose, a hipoalbuminemia indica disfunção de síntese hepática.", reference: "Fisiologia Médica – Guyton" },
      { question: "Qual o efeito de um indutor enzimático (ex: Rifampicina) sobre o metabolismo hepático?", options: ["Aumenta a velocidade de metabolização de outros fármacos", "Reduz a metabolização", "Não afeta o metabolismo", "Aumenta a absorção intestinal"], correctIndex: 0, explanation: "Indutores como Rifampicina aumentam a expressão de CYPs, acelerando o metabolismo e reduzindo o efeito de substratos.", reference: "Rang & Dale – Interações Farmacocinéticas" },
    ],
    clinical: [
      { question: "Paciente cirrótico Child-Pugh C em uso de Midazolam. Qual o risco principal?", options: ["Sedação excessiva por redução do metabolismo CYP3A4", "Insuficiência renal", "Hemorragia digestiva", "Broncoespasmo"], correctIndex: 0, explanation: "Na cirrose avançada, a capacidade metabólica do CYP3A4 está muito reduzida, prolongando o efeito de benzodiazepínicos.", reference: "UpToDate – Drug dosing in liver disease" },
      { question: "Qual fármaco é contraindicado na encefalopatia hepática por aumentar amônia?", options: ["Ácido valproico", "Lactulose", "Rifaximina", "L-ornitina-L-aspartato"], correctIndex: 0, explanation: "Ácido valproico pode aumentar os níveis de amônia por inibição do ciclo da ureia, piorando a encefalopatia hepática.", reference: "Hepatology – AASLD Guidelines" },
      { question: "Suco de grapefruit interage com fármacos por inibição de:", options: ["CYP3A4 intestinal", "CYP2D6 hepático", "Glicoproteína-P renal", "MAO cerebral"], correctIndex: 0, explanation: "Furanocumarinas do grapefruit inibem o CYP3A4 intestinal irreversivelmente, aumentando a biodisponibilidade de substratos.", reference: "Bailey DG – CMAJ 2013" },
      { question: "Estatinas metabolizadas pelo CYP3A4 (ex: Sinvastatina) têm risco de miopatia quando associadas a:", options: ["Itraconazol (inibidor potente CYP3A4)", "Pantoprazol", "Metformina", "Losartana"], correctIndex: 0, explanation: "Inibidores potentes de CYP3A4 aumentam os níveis de Sinvastatina, elevando o risco de rabdomiólise.", reference: "FDA Drug Safety Communication – Statins" },
      { question: "Na hepatite medicamentosa por Isoniazida, qual marcador eleva-se primeiro?", options: ["ALT (TGP)", "Bilirrubina direta", "Fosfatase alcalina", "GGT"], correctIndex: 0, explanation: "Hepatotoxicidade hepatocelular eleva ALT precocemente. Padrão colestático eleva FA/GGT. Isoniazida causa padrão hepatocelular.", reference: "DILI Classification – Hepatology" },
      { question: "Paciente com cirrose: qual analgésico é mais seguro em dose adequada?", options: ["Paracetamol (até 2g/dia)", "Ibuprofeno", "Aspirina", "Diclofenaco"], correctIndex: 0, explanation: "AINEs são contraindicados na cirrose (risco de sangramento GI e IRA). Paracetamol em dose reduzida (≤2g/dia) é mais seguro.", reference: "UpToDate – Pain management in cirrhosis" },
      { question: "O metabolismo de primeira passagem está reduzido na cirrose porque:", options: ["O fluxo portal é desviado por shunts portossistêmicos", "A absorção intestinal está aumentada", "Os rins compensam o metabolismo", "As enzimas pancreáticas estão inativas"], correctIndex: 0, explanation: "Na cirrose com hipertensão portal, shunts portossistêmicos desviam o sangue do fígado, reduzindo a extração de primeira passagem.", reference: "Clinical Pharmacokinetics na Cirrose" },
      { question: "Qual antibiótico requer ajuste de dose na insuficiência hepática grave?", options: ["Metronidazol", "Amoxicilina", "Gentamicina", "Vancomicina"], correctIndex: 0, explanation: "Metronidazol tem metabolismo predominantemente hepático. Na cirrose Child-C, sua meia-vida pode triplicar.", reference: "Sanford Guide – Dose adjustment" },
    ],
    specialist: [
      { question: "Paciente com hepatite C em uso de Sofosbuvir + Amiodarona. Qual o risco?", options: ["Bradicardia sintomática grave", "Hepatotoxicidade aditiva", "Nefrotoxicidade", "Prolongamento QT"], correctIndex: 0, explanation: "A FDA emitiu alerta sobre bradicardia grave/fatal com a combinação Sofosbuvir + Amiodarona, mecanismo ainda em estudo.", reference: "FDA Safety Alert 2015 – Sofosbuvir + Amiodarone" },
      { question: "Na farmacogenômica, metabolizadores ultrarrápidos de CYP2D6 convertem Codeína em:", options: ["Morfina em excesso, causando toxicidade", "Metabólito inativo", "Codeína-6-glucuronídeo", "Norcodeína"], correctIndex: 0, explanation: "CYP2D6 converte Codeína em Morfina. Metabolizadores ultrarrápidos produzem Morfina em excesso → depressão respiratória.", reference: "PharmGKB – CYP2D6 and Codeine" },
      { question: "Qual sistema de avaliação é específico para prever risco de hepatotoxicidade medicamentosa?", options: ["RUCAM (Roussel Uclaf Causality Assessment Method)", "Child-Pugh", "MELD", "APACHE II"], correctIndex: 0, explanation: "O RUCAM é uma escala padronizada que avalia a causalidade entre um fármaco suspeito e a lesão hepática (DILI).", reference: "Danan & Teschke – RUCAM 2019" },
      { question: "Na cirrose Child-C, qual é o principal mecanismo de hipoalbuminemia?", options: ["Redução da síntese hepática de albumina", "Perda renal de albumina", "Aumento do catabolismo muscular", "Deficiência nutricional isolada"], correctIndex: 0, explanation: "O hepatócito cirrótico tem capacidade de síntese reduzida. Albumina < 2.8 g/dL na cirrose indica disfunção grave.", reference: "Hepatologia – Sherlock & Dooley" },
      { question: "Qual o mecanismo da hepatotoxicidade idiossincrática da Isoniazida?", options: ["Formação de acetilidrazina via NAT2 → estresse oxidativo", "Acúmulo de bilirrubina direta", "Inibição de CYP2E1", "Colestase por inibição de BSEP"], correctIndex: 0, explanation: "Isoniazida é acetilada por NAT2. A acetilidrazina é oxidada por CYP2E1 a metabólitos reativos hepatotóxicos.", reference: "Drug Metabolism Reviews – INH Hepatotoxicity" },
      { question: "Qual fármaco causa colestase por inibição do transportador BSEP (bile salt export pump)?", options: ["Ciclosporina", "Rifampicina", "Paracetamol", "Metformina"], correctIndex: 0, explanation: "Ciclosporina inibe o BSEP (ABCB11), impedindo a excreção de sais biliares e causando colestase intra-hepática.", reference: "Trauner M – Hepatology 2003" },
      { question: "MELD score utiliza quais três variáveis laboratoriais?", options: ["Bilirrubina, INR e Creatinina", "ALT, AST e Albumina", "Plaquetas, INR e Bilirrubina", "Albumina, Ascite e Encefalopatia"], correctIndex: 0, explanation: "MELD = 3.78×ln(Bilirrubina) + 11.2×ln(INR) + 9.57×ln(Creatinina) + 6.43. Usado para priorização de transplante.", reference: "UNOS – MELD Calculator" },
      { question: "Na insuficiência hepática, por que a ligação proteica de fármacos ácidos diminui?", options: ["Hipoalbuminemia aumenta a fração livre do fármaco", "Aumento de alfa-1-glicoproteína ácida", "Redução do volume de distribuição", "Aumento do clearance renal compensatório"], correctIndex: 0, explanation: "Fármacos ácidos (Fenitoína, Varfarina) ligam-se à albumina. Na cirrose, hipoalbuminemia eleva a fração livre e o efeito/toxicidade.", reference: "Clinical Pharmacokinetics – Liver Disease" },
    ],
  },
  rins: {
    academic: [
      { question: "O clearance de creatinina estima qual parâmetro fisiológico?", options: ["Taxa de filtração glomerular (TFG)", "Fluxo plasmático renal", "Fração de filtração", "Débito urinário"], correctIndex: 0, explanation: "O ClCr é o estimador clínico mais usado da TFG, permitindo ajustar doses de fármacos de eliminação renal.", reference: "Cockcroft-Gault / CKD-EPI" },
      { question: "Qual diurético atua na alça de Henle inibindo o cotransportador Na⁺/K⁺/2Cl⁻?", options: ["Furosemida", "Hidroclorotiazida", "Espironolactona", "Amilorida"], correctIndex: 0, explanation: "Furosemida bloqueia o NKCC2 no ramo ascendente espesso da alça de Henle, causando diurese intensa.", reference: "Rang & Dale – Diuréticos" },
      { question: "Qual classe de fármacos é classicamente nefrotóxica e requer monitorização de níveis séricos?", options: ["Aminoglicosídeos", "Penicilinas", "Macrolídeos", "Cefalosporinas de 1ª geração"], correctIndex: 0, explanation: "Aminoglicosídeos (Gentamicina, Amicacina) acumulam-se no córtex renal e causam necrose tubular aguda dose-dependente.", reference: "Sanford Guide – Aminoglycosides" },
      { question: "A equação de Cockcroft-Gault utiliza quais variáveis?", options: ["Idade, peso, creatinina sérica e sexo", "Altura, peso e cistatina C", "Ureia, creatinina e albumina", "Proteinúria e creatinina urinária"], correctIndex: 0, explanation: "CG = [(140-idade) × peso] / (72 × CrSérica). Multiplicar por 0.85 se mulher. Estima ClCr em mL/min.", reference: "Cockcroft & Gault – Nephron 1976" },
      { question: "Qual é o mecanismo de nefrotoxicidade dos AINEs?", options: ["Inibição de prostaglandinas renais vasodilatadoras", "Toxicidade tubular direta", "Deposição de cristais", "Nefrite intersticial alérgica exclusivamente"], correctIndex: 0, explanation: "AINEs inibem COX → reduzem PGE2/PGI2 renais → vasoconstrição aferente → queda da TFG, especialmente em pacientes hipovolêmicos.", reference: "Goodman & Gilman – AINEs e Rim" },
      { question: "Em qual estágio da DRC a TFG está entre 30-59 mL/min?", options: ["Estágio 3", "Estágio 1", "Estágio 4", "Estágio 5"], correctIndex: 0, explanation: "DRC Estágio 3: TFG 30-59 (3a: 45-59; 3b: 30-44). É quando muitos fármacos requerem ajuste de dose.", reference: "KDIGO Guidelines 2012" },
      { question: "Qual eletrólito tende a se acumular na insuficiência renal avançada?", options: ["Potássio (K⁺)", "Sódio (Na⁺)", "Cloreto (Cl⁻)", "Cálcio (Ca²⁺)"], correctIndex: 0, explanation: "A redução da excreção renal de K⁺ na DRC avançada causa hipercalemia, que pode levar a arritmias fatais.", reference: "KDIGO – Manejo de eletrólitos na DRC" },
      { question: "Qual medicamento é usado para tratar a hipercalemia aguda grave?", options: ["Gluconato de cálcio IV (estabilização de membrana)", "Furosemida oral", "Espironolactona", "Soro fisiológico"], correctIndex: 0, explanation: "Gluconato de cálcio estabiliza a membrana cardíaca (não reduz K⁺). Insulina+glicose e salbutamol redistribuem K⁺ para intracelular.", reference: "AHA – Manejo de Hipercalemia" },
    ],
    clinical: [
      { question: "Paciente com ClCr 20 mL/min em uso de Metformina. Conduta?", options: ["Suspender Metformina (risco de acidose lática)", "Manter dose plena", "Dobrar a dose", "Trocar por Glibenclamida"], correctIndex: 0, explanation: "Metformina é contraindicada com TFG < 30 mL/min pelo risco de acidose lática. Entre 30-45, pode ser usada com cautela.", reference: "KDIGO Diabetes & CKD 2020" },
      { question: "Qual é a fórmula preferida para estimar TFG em ajuste de dose de fármacos?", options: ["Cockcroft-Gault (para a maioria das bulas)", "CKD-EPI (para estadiamento de DRC)", "MDRD", "Cistatina C isolada"], correctIndex: 0, explanation: "Apesar de CKD-EPI ser mais precisa, a maioria das bulas e guidelines de ajuste de dose usa Cockcroft-Gault.", reference: "FDA Guidance – Renal Impairment Studies" },
      { question: "Vancomicina requer monitorização de vale porque:", options: ["Tem janela terapêutica estreita e nefrotoxicidade dose-dependente", "É hepatotóxica", "Causa ototoxicidade apenas", "Não tem excreção renal"], correctIndex: 0, explanation: "O vale de Vancomicina (pré-dose) deve ficar entre 15-20 mcg/mL em infecções graves. Níveis elevados → nefrotoxicidade.", reference: "IDSA Guidelines – Vancomycin Dosing 2020" },
      { question: "Na nefrotoxicidade por contraste iodado, qual medida preventiva é mais eficaz?", options: ["Hidratação com SF 0.9% IV pré e pós-procedimento", "Uso de NAC oral", "Diuréticos profiláticos", "Manitol IV"], correctIndex: 0, explanation: "Expansão volêmica com SF 0.9% é a medida com melhor evidência para prevenir nefropatia induzida por contraste.", reference: "KDIGO – AKI Prevention" },
      { question: "Paciente com DRC estágio 4 e gota. Qual uricosúrico é contraindicado?", options: ["Probenecida (ineficaz com TFG < 50)", "Alopurinol", "Febuxostat", "Colchicina em dose reduzida"], correctIndex: 0, explanation: "Probenecida é um uricosúrico que depende de função renal adequada. Com TFG < 50, é ineficaz e pode causar nefrolitíase.", reference: "ACR Guidelines – Gout Management" },
      { question: "Lítio é excretado quase exclusivamente pelos rins. Qual fármaco pode aumentar seus níveis perigosamente?", options: ["Diuréticos tiazídicos", "Furosemida", "Paracetamol", "Amoxicilina"], correctIndex: 0, explanation: "Tiazídicos reduzem a excreção de lítio por aumentar a reabsorção no túbulo proximal, causando toxicidade.", reference: "Drug Interactions – Lithium" },
      { question: "Gabapentina na DRC requer ajuste porque:", options: ["É eliminada inalterada pelos rins", "É metabolizada pelo CYP3A4", "É hepatotóxica", "Liga-se fortemente a proteínas"], correctIndex: 0, explanation: "Gabapentina não sofre metabolismo hepático. 100% da excreção é renal, exigindo redução de dose proporcional à TFG.", reference: "Bula Gabapentina – Ajuste Renal" },
      { question: "Qual classe de antidiabéticos é segura na DRC avançada (TFG < 15)?", options: ["Insulina", "Metformina", "Gliclazida", "Inibidores de SGLT2"], correctIndex: 0, explanation: "Insulina é segura em qualquer estágio de DRC, mas a dose deve ser reduzida pois a meia-vida se prolonga na DRC avançada.", reference: "KDIGO Diabetes & CKD 2022" },
    ],
    specialist: [
      { question: "Na lesão renal aguda por Vancomicina + Piperacilina-Tazobactam, qual é o mecanismo proposto?", options: ["Nefrite intersticial alérgica sinérgica", "Necrose tubular por cristalúria", "Glomerulonefrite membranosa", "Obstrução ureteral bilateral"], correctIndex: 0, explanation: "A combinação Vanco + Pip-Tazo aumenta o risco de AKI ~3x vs Vanco isolada, provavelmente por nefrite intersticial aditiva.", reference: "Luther MK et al – Clin Infect Dis 2018" },
      { question: "AUC/MIC é o parâmetro PK/PD alvo para monitorização de Vancomicina. Qual é o alvo recomendado?", options: ["AUC/MIC 400-600", "AUC/MIC > 1000", "Cmax/MIC > 10", "T>MIC > 50%"], correctIndex: 0, explanation: "A IDSA/ASHP 2020 recomenda AUC/MIC 400-600 em vez de monitorização por vale, para otimizar eficácia e reduzir nefrotoxicidade.", reference: "IDSA Vancomycin Consensus 2020" },
      { question: "No ajuste de Imipenem na DRC, por que a dose máxima não deve exceder 500mg 6/6h mesmo com TFG normal?", options: ["Doses > 500mg aumentam risco de convulsões", "Nefrotoxicidade dose-dependente", "Hepatotoxicidade", "Risco de C. difficile"], correctIndex: 0, explanation: "Imipenem em doses elevadas acumula-se no SNC e reduz o limiar convulsivo, especialmente na DRC.", reference: "Sanford Guide – Imipenem dosing" },
      { question: "Qual fármaco requer tanto ajuste renal quanto monitorização de nível sérico em pacientes críticos?", options: ["Vancomicina", "Ceftriaxona", "Metronidazol", "Azitromicina"], correctIndex: 0, explanation: "Vancomicina combina eliminação renal predominante, janela terapêutica estreita e variabilidade PK em críticos.", reference: "Critical Care TDM Guidelines" },
      { question: "Na rabdomiólise com IRA, qual é o mecanismo de lesão renal pela mioglobina?", options: ["Precipitação tubular + vasoconstrição + estresse oxidativo", "Glomerulonefrite por imunocomplexos", "Nefropatia membranosa", "Obstrução ureteral por cristais"], correctIndex: 0, explanation: "A mioglobina precipita nos túbulos em pH ácido, causa vasoconstrição renal e gera radicais livres → necrose tubular.", reference: "NEJM Review – Rhabdomyolysis" },
      { question: "Qual é a diferença clínica entre IRA pré-renal e NTA no exame de urina?", options: ["Pré-renal: FENa < 1%, NTA: FENa > 2%", "Pré-renal: FENa > 3%, NTA: FENa < 0.5%", "Não há diferença na FENa", "Pré-renal tem hematúria, NTA não"], correctIndex: 0, explanation: "FENa < 1% indica reabsorção ávida de Na⁺ (rim funcionante respondendo a hipoperfusão). FENa > 2% sugere dano tubular (NTA).", reference: "UpToDate – AKI Differential Diagnosis" },
      { question: "Dabigatrana é o único DOAC dialisável porque:", options: ["Tem baixa ligação proteica (~35%)", "É hidrossolúvel e metabolizada pelos rins apenas", "Tem alto peso molecular", "Liga-se à albumina 99%"], correctIndex: 0, explanation: "Dabigatrana tem ligação proteica de ~35% (vs >85% dos outros DOACs), permitindo remoção eficaz por hemodiálise.", reference: "Eikelboom JW – Circulation 2015" },
      { question: "Na TRS (terapia renal substitutiva), qual propriedade PK do fármaco mais influencia sua remoção?", options: ["Volume de distribuição e ligação proteica", "Biodisponibilidade oral", "Metabolismo hepático", "Meia-vida de absorção"], correctIndex: 0, explanation: "Fármacos com baixo Vd (< 1 L/kg) e baixa ligação proteica são mais eficientemente removidos por diálise.", reference: "Heintz BH – Pharmacotherapy 2009" },
    ],
  },
  pulmoes: {
    academic: [
      { question: "Qual é o broncodilatador de resgate mais usado na crise asmática?", options: ["Salbutamol (β₂-agonista de curta ação)", "Salmeterol", "Tiotrópio", "Montelucaste"], correctIndex: 0, explanation: "Salbutamol (Albuterol) é um SABA que relaxa a musculatura brônquica em 5-15min via receptores β₂.", reference: "GINA 2023 – Asma" },
      { question: "Corticoides inalatórios atuam na asma por qual mecanismo principal?", options: ["Redução da inflamação eosinofílica das vias aéreas", "Broncodilatação direta", "Mucolítico", "Bloqueio de receptores de histamina"], correctIndex: 0, explanation: "CIs (Budesonida, Fluticasona) suprimem genes inflamatórios, reduzindo eosinófilos, citocinas e hiperreatividade brônquica.", reference: "GINA 2023" },
      { question: "Qual anticolinérgico inalatório é usado na DPOC como broncodilatador de longa ação?", options: ["Tiotrópio", "Ipratrópio", "Atropina", "Escopolamina"], correctIndex: 0, explanation: "Tiotrópio é um LAMA (anticolinérgico de longa duração) que bloqueia receptores M3 na musculatura brônquica por 24h.", reference: "GOLD 2023 – DPOC" },
      { question: "Na DPOC, qual classe é primeira escolha para reduzir exacerbações frequentes?", options: ["LABA + LAMA (broncodilatadores de longa ação)", "Corticoide sistêmico crônico", "Antibiótico profilático", "Teofilina"], correctIndex: 0, explanation: "LABA + LAMA (ex: Formoterol + Tiotrópio) é o tratamento base da DPOC moderada-grave, reduzindo exacerbações.", reference: "GOLD 2023" },
      { question: "Qual é o principal efeito adverso local dos corticoides inalatórios?", options: ["Candidíase orofaríngea", "Broncoespasmo paradoxal", "Hemorragia nasal", "Pneumonia"], correctIndex: 0, explanation: "A deposição do CI na orofaringe favorece Candida. Orientar bochechar com água após cada uso.", reference: "GINA 2023 – Efeitos adversos de CI" },
      { question: "Montelucaste pertence a qual classe farmacológica?", options: ["Antagonista de receptor de leucotrieno", "β₂-agonista", "Anticolinérgico", "Corticoide inalatório"], correctIndex: 0, explanation: "Montelucaste bloqueia receptores CysLT1, reduzindo broncoconstrição e inflamação mediada por leucotrienos.", reference: "Rang & Dale – Leucotrienos" },
      { question: "A teofilina tem janela terapêutica estreita. Qual é o nível sérico terapêutico?", options: ["5-15 mcg/mL", "20-40 mcg/mL", "1-3 mcg/mL", "50-100 mcg/mL"], correctIndex: 0, explanation: "Níveis > 20 mcg/mL associam-se a toxicidade (náusea, arritmias, convulsões). Monitorização sérica é obrigatória.", reference: "UpToDate – Teofilina TDM" },
      { question: "Na asma, o que significa a classificação GINA 'Step 3'?", options: ["CI em dose baixa + LABA", "SABA de resgate isolado", "CI em dose alta + corticoide oral", "Apenas anticolinérgico"], correctIndex: 0, explanation: "GINA Step 3: CI dose baixa + LABA (ex: Budesonida/Formoterol) como controlador. SABA ou CI-formoterol como resgate.", reference: "GINA 2023 – Treatment Steps" },
    ],
    clinical: [
      { question: "Paciente asmático em uso de Salmeterol isolado sem CI. Qual o risco?", options: ["Aumento de exacerbações graves e mortalidade", "Taquifilaxia ao SABA", "Insuficiência adrenal", "Candidíase orofaríngea"], correctIndex: 0, explanation: "LABA isolado em asma (sem CI) foi associado a aumento de mortalidade (estudo SMART). Sempre associar CI + LABA.", reference: "FDA Black Box Warning – LABA in Asthma" },
      { question: "Paciente com DPOC e eosinófilos > 300. Qual terapia adicionar ao LABA + LAMA?", options: ["Corticoide inalatório (terapia tripla)", "Corticoide oral crônico", "Azitromicina diária", "Omalizumabe"], correctIndex: 0, explanation: "Na DPOC com eosinófilos ≥ 300 e exacerbações, adicionar CI ao LABA + LAMA (terapia tripla) reduz exacerbações.", reference: "GOLD 2023 – Escalation strategy" },
      { question: "Qual β₂-agonista de longa ação tem início de ação rápido, servindo também como resgate?", options: ["Formoterol", "Salmeterol", "Indacaterol", "Vilanterol"], correctIndex: 0, explanation: "Formoterol tem início em 1-3min (como SABA) e duração de 12h (como LABA), sendo usado na estratégia MART com Budesonida.", reference: "GINA 2023 – MART strategy" },
      { question: "Na exacerbação grave de DPOC, qual antibiótico é indicado se escarro purulento?", options: ["Amoxicilina-Clavulanato ou Macrolídeo", "Vancomicina IV", "Metronidazol", "Fluconazol"], correctIndex: 0, explanation: "Antibióticos são indicados na DPOC exacerbada com escarro purulento: Amoxicilina-Clav, Azitromicina ou Doxiciclina.", reference: "GOLD 2023 – Exacerbation management" },
      { question: "Paciente asmático com asma alérgica grave e IgE elevada. Qual biológico é indicado?", options: ["Omalizumabe (anti-IgE)", "Mepolizumabe", "Dupilumabe", "Benralizumabe"], correctIndex: 0, explanation: "Omalizumabe é anti-IgE indicado na asma alérgica grave não controlada com CI + LABA, em pacientes com IgE elevada.", reference: "GINA 2023 – Step 5 add-on" },
      { question: "Na asma induzida por exercício, qual medida farmacológica é mais eficaz pré-exercício?", options: ["SABA 15-30min antes do exercício", "CI dose alta 2h antes", "Montelucaste na hora do exercício", "Teofilina IV"], correctIndex: 0, explanation: "SABA inalatório 15-30 min antes do exercício previne broncoespasmo por 2-4h. Montelucaste é alternativa oral.", reference: "GINA 2023 – Exercise-induced asthma" },
      { question: "Qual é a diferença entre asma e DPOC no padrão espirométrico?", options: ["Asma: obstrução reversível; DPOC: obstrução persistente (VEF1/CVF < 0.7)", "Ambos têm obstrução irreversível", "DPOC é restritiva", "Asma tem CVF reduzida e VEF1 normal"], correctIndex: 0, explanation: "Na asma, a obstrução reverte > 12% e 200mL com BD. Na DPOC, VEF1/CVF permanece < 0.7 pós-BD.", reference: "GOLD 2023 / GINA 2023" },
      { question: "Corticoide sistêmico na exacerbação asmática: qual dose e duração recomendadas?", options: ["Prednisona 40-50mg/dia por 5-7 dias", "Dexametasona 40mg por 14 dias", "Hidrocortisona 500mg dose única", "Metilprednisolona 1g por 3 dias"], correctIndex: 0, explanation: "Prednisona 40-50mg/dia (ou equivalente) por 5-7 dias é o esquema padrão na exacerbação moderada-grave. Não requer desmame.", reference: "GINA 2023 – Acute management" },
    ],
    specialist: [
      { question: "Na asma grave eosinofílica, Mepolizumabe atua bloqueando qual citocina?", options: ["IL-5", "IL-4", "IL-13", "TNF-α"], correctIndex: 0, explanation: "Mepolizumabe é anti-IL-5, reduzindo eosinófilos circulantes. Indicado na asma eosinofílica grave refratária.", reference: "GINA 2023 – Biológicos na asma" },
      { question: "Qual a interação farmacocinética entre Eritromicina e Teofilina?", options: ["Eritromicina inibe CYP1A2, aumentando níveis de Teofilina", "Eritromicina induz CYP3A4", "Teofilina reduz absorção de Eritromicina", "Não há interação relevante"], correctIndex: 0, explanation: "Eritromicina e Claritromicina inibem CYP1A2 e CYP3A4, reduzindo o metabolismo da Teofilina e causando toxicidade.", reference: "Drug Interactions – Teofilina" },
      { question: "Na DPOC com bronquiectasias e Pseudomonas, qual antibiótico inalatório pode ser considerado?", options: ["Tobramicina inalatória", "Vancomicina inalatória", "Piperacilina inalatória", "Metronidazol nebulizado"], correctIndex: 0, explanation: "Tobramicina inalatória pode ser usada para supressão crônica de Pseudomonas em DPOC com bronquiectasias.", reference: "ERS Guidelines – Bronchiectasis 2017" },
      { question: "Dupilumabe na asma grave: qual é o seu mecanismo de ação duplo?", options: ["Bloqueia IL-4 e IL-13 via inibição de IL-4Rα", "Bloqueia IL-5 e IL-33", "Inibe TNF-α e IL-1β", "Neutraliza IgE e IL-25"], correctIndex: 0, explanation: "Dupilumabe bloqueia a subunidade α do receptor de IL-4, inibindo tanto IL-4 quanto IL-13 (inflamação tipo 2).", reference: "Rabe KF – NEJM 2018" },
      { question: "Qual é o mecanismo da resistência ao Salbutamol após uso excessivo?", options: ["Dessensibilização (downregulation) de receptores β₂", "Indução enzimática hepática", "Taquifilaxia por depleção de acetilcolina", "Formação de anticorpos anti-β₂"], correctIndex: 0, explanation: "Uso crônico de SABA causa internalização e downregulation de receptores β₂, reduzindo a resposta broncodilatadora.", reference: "Barnes PJ – Pharmacol Rev" },
      { question: "Na ventilação mecânica de paciente asmático, qual é o principal risco de volume corrente alto?", options: ["Auto-PEEP e barotrauma por air trapping", "Hipocapnia grave", "Hiperóxia", "Edema pulmonar"], correctIndex: 0, explanation: "Na asma grave, a obstrução ao fluxo expiratório causa air trapping. VC alto piora auto-PEEP → barotrauma/pneumotórax.", reference: "Mechanical Ventilation in Asthma – Chest" },
      { question: "Qual o papel do NO exalado (FeNO) no manejo da asma?", options: ["Marcador de inflamação eosinofílica das vias aéreas", "Medida de obstrução brônquica", "Indicador de infecção bacteriana", "Avaliação de resposta ao LAMA"], correctIndex: 0, explanation: "FeNO > 50 ppb sugere inflamação eosinofílica responsiva a CI. Útil para titular dose de CI e predizer resposta.", reference: "ATS Clinical Practice Guideline – FeNO 2011" },
      { question: "Termoplastia brônquica na asma grave refratária: qual é o princípio?", options: ["Redução da massa muscular lisa brônquica por radiofrequência", "Destruição de células caliciformes", "Ablação de fibras vagais", "Implante de stent brônquico"], correctIndex: 0, explanation: "A termoplastia aplica energia térmica controlada nas vias aéreas, reduzindo músculo liso e a broncoconstrição.", reference: "Castro M – AJRCCM 2010" },
    ],
  },
  cerebro: {
    academic: [
      { question: "Qual neurotransmissor está reduzido na doença de Parkinson?", options: ["Dopamina (via nigroestriatal)", "Serotonina", "Acetilcolina", "GABA"], correctIndex: 0, explanation: "A degeneração de neurônios dopaminérgicos da substância negra reduz a dopamina no estriado, causando sintomas motores.", reference: "Rang & Dale – Parkinson" },
      { question: "Os ISRS (ex: Fluoxetina) atuam por qual mecanismo?", options: ["Inibição seletiva da recaptação de serotonina (5-HT)", "Bloqueio de receptores dopaminérgicos D2", "Inibição de MAO-A", "Antagonismo de receptores GABA-A"], correctIndex: 0, explanation: "ISRSs bloqueiam o SERT, aumentando a 5-HT na fenda sináptica. Efeito terapêutico pleno em 2-4 semanas.", reference: "Stahl's Essential Psychopharmacology" },
      { question: "A barreira hematoencefálica (BHE) dificulta a passagem de fármacos que são:", options: ["Hidrofílicos e de alto peso molecular", "Lipofílicos e de baixo peso molecular", "Gases dissolvidos", "Não-ionizados"], correctIndex: 0, explanation: "A BHE é formada por tight junctions dos capilares cerebrais. Fármacos lipofílicos e pequenos atravessam; hidrofílicos não.", reference: "Goodman & Gilman – BHE" },
      { question: "Qual antiepiléptico atua primariamente bloqueando canais de sódio voltagem-dependentes?", options: ["Carbamazepina", "Etossuximida", "Vigabatrina", "Tiagabina"], correctIndex: 0, explanation: "Carbamazepina, Fenitoína e Lamotrigina bloqueiam canais de Na⁺ no estado inativado, reduzindo disparos repetitivos.", reference: "Rang & Dale – Antiepilépticos" },
      { question: "Antipsicóticos típicos (1ª geração) atuam bloqueando receptores:", options: ["Dopamina D2 (via mesolímbica)", "Serotonina 5-HT2A", "GABA-A", "Noradrenalina α1"], correctIndex: 0, explanation: "Antipsicóticos típicos (Haloperidol, Clorpromazina) bloqueiam D2. Efeitos extrapiramidais são pelo bloqueio D2 no estriado.", reference: "Stahl – Antipsicóticos" },
      { question: "Qual é o principal mecanismo dos benzodiazepínicos (ex: Diazepam)?", options: ["Potencialização alostérica do receptor GABA-A", "Agonismo direto GABA-B", "Inibição de recaptação de GABA", "Bloqueio de glutamato NMDA"], correctIndex: 0, explanation: "BZDs ligam-se ao sítio alostérico do GABA-A, aumentando a frequência de abertura do canal de Cl⁻ → hiperpolarização.", reference: "Rang & Dale – BZDs" },
      { question: "A síndrome serotoninérgica pode ser causada pela combinação de:", options: ["ISRS + IMAO", "Betabloqueador + diurético", "AINE + paracetamol", "Estatina + fibrato"], correctIndex: 0, explanation: "A combinação de serotonérgicos (ISRS + IMAO, ISRS + tramadol) pode causar excesso de 5-HT: tremor, hipertermia, clonus.", reference: "Boyer & Shannon – NEJM 2005" },
      { question: "Qual fármaco é o tratamento de primeira linha para estado de mal epiléptico?", options: ["Diazepam IV ou Midazolam IM", "Fenitoína oral", "Valproato oral", "Carbamazepina IV"], correctIndex: 0, explanation: "BZDs (Diazepam IV, Midazolam IM/IN) são 1ª linha no status epilepticus por ação rápida no GABA-A.", reference: "AES Guidelines – Status Epilepticus 2016" },
    ],
    clinical: [
      { question: "Paciente idoso com depressão e hipertrofia prostática. Qual antidepressivo evitar?", options: ["Amitriptilina (tricíclico com efeito anticolinérgico)", "Sertralina", "Escitalopram", "Venlafaxina"], correctIndex: 0, explanation: "Tricíclicos (Amitriptilina) têm forte ação anticolinérgica → retenção urinária em HPB, confusão em idosos. ISRS é preferível.", reference: "Critérios de Beers – AGS 2023" },
      { question: "Na troca de ISRS para IMAO, qual é o intervalo mínimo de washout da Fluoxetina?", options: ["5 semanas (meia-vida longa da Norfluoxetina)", "24 horas", "7 dias", "3 dias"], correctIndex: 0, explanation: "A Fluoxetina tem meia-vida de 1-6 dias, e seu metabólito Norfluoxetina 4-16 dias. Washout de 5 semanas evita síndrome serotoninérgica.", reference: "Stahl – Switching antidepressants" },
      { question: "Paciente em uso de Carbamazepina e ACO oral. Qual o risco?", options: ["Falha contraceptiva por indução de CYP3A4", "Intoxicação por Carbamazepina", "Sangramento uterino por excesso de estrogênio", "Nenhum risco"], correctIndex: 0, explanation: "Carbamazepina é potente indutor de CYP3A4, acelerando o metabolismo de estrogênio/progestágeno → falha contraceptiva.", reference: "WHO – Drug interactions with OC" },
      { question: "Clozapina é reservada para esquizofrenia refratária. Qual é o efeito adverso que exige hemograma semanal?", options: ["Agranulocitose", "Hepatotoxicidade", "Síndrome nefrótica", "Rabdomiólise"], correctIndex: 0, explanation: "Clozapina pode causar agranulocitose (1-2%), potencialmente fatal. Hemograma semanal nas primeiras 18 semanas, depois mensal.", reference: "REMS – Clozapine" },
      { question: "Qual antiepiléptico é teratogênico e causa defeitos do tubo neural em até 5-10% das gestações expostas?", options: ["Ácido Valproico", "Levetiracetam", "Lamotrigina", "Carbamazepina"], correctIndex: 0, explanation: "Valproato é o antiepiléptico mais teratogênico. Contraindicado em mulheres em idade fértil sem contracepção eficaz.", reference: "FDA – Valproate Pregnancy Warning" },
      { question: "Paciente epiléptico em uso de Fenitoína com nível sérico de 25 mcg/mL (alvo: 10-20). Conduta?", options: ["Reduzir dose com cautela — Fenitoína tem cinética não-linear", "Manter e remonitorar em 1 mês", "Dobrar a dose", "Suspender e trocar por Levetiracetam"], correctIndex: 0, explanation: "Fenitoína tem cinética de Michaelis-Menten: pequenos aumentos de dose causam grandes elevações de nível. Reduzir em pequenos incrementos.", reference: "Winter's Clinical Pharmacokinetics" },
      { question: "Na depressão com dor neuropática comórbida, qual antidepressivo tem dupla indicação?", options: ["Duloxetina (IRSN)", "Fluoxetina", "Mirtazapina", "Bupropiona"], correctIndex: 0, explanation: "Duloxetina (inibidor de recaptação de 5-HT e NA) tem indicação aprovada para depressão E dor neuropática diabética.", reference: "UpToDate – Neuropathic pain treatment" },
      { question: "Litío na emergência: qual sinal precoce de intoxicação?", options: ["Tremor grosseiro e diarreia", "Euforia", "Sedação profunda", "Rash cutâneo"], correctIndex: 0, explanation: "Intoxicação lítio leve (1.5-2.5): tremor grosseiro, diarreia, náusea. Moderada: confusão, ataxia. Grave: convulsões, coma.", reference: "Toxicologia – Intoxicação por Lítio" },
    ],
    specialist: [
      { question: "Qual é o mecanismo pelo qual a Cetamina exerce efeito antidepressivo rápido?", options: ["Antagonismo de receptores NMDA → aumento de BDNF e sinaptogênese", "Agonismo de receptores μ-opioides", "Inibição de MAO-A", "Bloqueio de recaptação de dopamina"], correctIndex: 0, explanation: "Cetamina bloqueia NMDA → ativa mTOR → aumenta BDNF e sinaptogênese rápida no córtex pré-frontal. Efeito em horas.", reference: "Krystal JH – Am J Psychiatry 2019" },
      { question: "Na farmacorresistência epiléptica, qual é o mecanismo mais estudado?", options: ["Superexpressão de glicoproteína-P (P-gp) na BHE", "Mutação de canais de Ca²⁺", "Deficiência de GABA-transaminase", "Auto-anticorpos anti-GABA-B"], correctIndex: 0, explanation: "A P-gp efluxa antiepilépticos do SNC, reduzindo suas concentrações no foco epiléptico. Alvo de pesquisa para superar resistência.", reference: "Löscher W – Pharmacol Rev 2020" },
      { question: "Qual o risco de combinar Linezolida (antibiótico oxazolidinona) com ISRS?", options: ["Síndrome serotoninérgica (Linezolida é IMAO reversível)", "Nefrotoxicidade aditiva", "Hepatotoxicidade", "Mielossupressão"], correctIndex: 0, explanation: "Linezolida é um IMAO reversível fraco. Combinada com ISRS, pode precipitar síndrome serotoninérgica.", reference: "FDA Warning – Linezolid and Serotonergics" },
      { question: "Na doença de Parkinson avançada, qual dispositivo é alternativa à Levodopa oral?", options: ["Bomba de infusão de Levodopa-Carbidopa intestinal (Duodopa)", "Marca-passo cardíaco", "Bomba de insulina adaptada", "Estimulação magnética transcraniana"], correctIndex: 0, explanation: "A Duodopa infunde Levodopa gel diretamente no jejuno via PEG, reduzindo flutuações motoras (on-off) da doença avançada.", reference: "UpToDate – Advanced Parkinson therapy" },
      { question: "Qual antipsicótico atípico tem maior risco de síndrome metabólica (ganho de peso + dislipidemia)?", options: ["Olanzapina", "Aripiprazol", "Ziprasidona", "Lurasidona"], correctIndex: 0, explanation: "Olanzapina e Clozapina têm maior risco metabólico entre os atípicos. Aripiprazol e Ziprasidona são mais neutros.", reference: "APA Guidelines – Monitoring metabolic effects" },
      { question: "Lacosamida, antiepiléptico de nova geração, atua por qual mecanismo diferenciado?", options: ["Inativação lenta de canais de Na⁺ (slow inactivation)", "Bloqueio de NMDA", "Agonismo GABA-B", "Inibição de SV2A"], correctIndex: 0, explanation: "Diferente de CBZ/PHT que atuam na fast inactivation, Lacosamida potencializa a slow inactivation de canais de Na⁺.", reference: "Rogawski MA – CNS Drug Reviews" },
      { question: "Na esclerose múltipla, Fingolimode atua sequestrando linfócitos por qual mecanismo?", options: ["Agonismo funcional de receptores S1P → retenção de linfócitos nos linfonodos", "Depleção de células B por anti-CD20", "Inibição de calcineurina", "Bloqueio de IL-17"], correctIndex: 0, explanation: "Fingolimode é agonista S1P1 que causa internalização do receptor, impedindo a saída de linfócitos dos linfonodos.", reference: "Brinkmann V – Pharmacol Ther 2009" },
      { question: "Qual é o mecanismo da discinesia tardia causada por antipsicóticos?", options: ["Supersensibilidade de receptores D2 no estriado por bloqueio crônico", "Excesso de serotonina", "Depleção de GABA", "Acúmulo de glutamato"], correctIndex: 0, explanation: "Bloqueio D2 crônico causa upregulation e supersensibilidade dos receptores dopaminérgicos estriatais → movimentos involuntários.", reference: "Stahl – Discinesia tardia" },
    ],
  },
  pancreas: {
    academic: [
      { question: "Qual é o mecanismo de ação da Metformina no diabetes tipo 2?", options: ["Redução da gliconeogênese hepática via ativação de AMPK", "Estímulo da secreção de insulina", "Inibição da absorção de glicose intestinal", "Bloqueio de glucagon"], correctIndex: 0, explanation: "Metformina ativa AMPK, reduzindo a produção hepática de glicose e melhorando a sensibilidade periférica à insulina.", reference: "Rang & Dale – Antidiabéticos" },
      { question: "Insulinas de ação ultrarrápida (ex: Lispro, Aspart) atuam em quanto tempo?", options: ["15-30 minutos", "1-2 horas", "4-6 horas", "Imediatamente"], correctIndex: 0, explanation: "Análogos ultrarrápidos (Lispro, Aspart, Glulisina) dissociam-se rapidamente → início em 15-30 min, pico em 1-2h.", reference: "ADA – Insulin Types" },
      { question: "Qual classe de antidiabéticos estimula a secreção de insulina de forma glicose-dependente?", options: ["Inibidores de DPP-4 (Gliptinas)", "Sulfonilureias", "Tiazolidinedionas", "Inibidores de α-glicosidase"], correctIndex: 0, explanation: "Gliptinas inibem DPP-4, aumentando GLP-1 endógeno. O GLP-1 estimula insulina e suprime glucagon de forma glicose-dependente.", reference: "Rang & Dale – Incretinas" },
      { question: "O principal efeito adverso grave das sulfonilureias é:", options: ["Hipoglicemia", "Cetoacidose", "Pancreatite", "Acidose lática"], correctIndex: 0, explanation: "Sulfonilureias (Glibenclamida, Gliclazida) estimulam insulina independente de glicose → risco de hipoglicemia, especialmente em idosos.", reference: "ADA – Pharmacologic approaches" },
      { question: "Dapagliflozina pertence a qual classe?", options: ["Inibidor de SGLT2", "Sulfonilureia", "Inibidor de DPP-4", "Agonista GLP-1"], correctIndex: 0, explanation: "Inibidores de SGLT2 bloqueiam a reabsorção de glicose no túbulo proximal renal, promovendo glicosúria e redução glicêmica.", reference: "ADA Standards of Care 2023" },
      { question: "Qual hormônio pancreático aumenta a glicemia?", options: ["Glucagon (células α)", "Insulina (células β)", "Somatostatina (células δ)", "Polipeptídeo pancreático"], correctIndex: 0, explanation: "O glucagon é secretado pelas células α das ilhotas de Langerhans e estimula glicogenólise e gliconeogênese hepática.", reference: "Fisiologia – Guyton" },
      { question: "Cetoacidose diabética (CAD) é mais comum em qual tipo de diabetes?", options: ["Diabetes tipo 1", "Diabetes tipo 2", "Diabetes gestacional", "MODY"], correctIndex: 0, explanation: "A CAD ocorre por deficiência absoluta de insulina (DM1), levando a lipólise descontrolada → corpos cetônicos → acidose.", reference: "ADA – DKA Management" },
      { question: "Pioglitazona pertence à classe das tiazolidinedionas e atua em qual receptor nuclear?", options: ["PPARγ", "PPARα", "Receptor de insulina", "Receptor de GLP-1"], correctIndex: 0, explanation: "Pioglitazona ativa PPARγ no tecido adiposo e muscular, aumentando a sensibilidade à insulina periférica.", reference: "Rang & Dale – Tiazolidinedionas" },
    ],
    clinical: [
      { question: "Paciente DM2 com DCV aterosclerótica estabelecida. Qual classe adicionar à Metformina?", options: ["Agonista GLP-1 (Liraglutida/Semaglutida)", "Sulfonilureia", "Acarbose", "Pioglitazona"], correctIndex: 0, explanation: "Agonistas GLP-1 com benefício CV comprovado (LEADER, SUSTAIN-6) são recomendados em DM2 + DCV aterosclerótica.", reference: "ADA/EASD Consensus 2022" },
      { question: "Na CAD, qual é a prioridade terapêutica inicial?", options: ["Hidratação com SF 0.9% IV", "Insulina em bolus", "Bicarbonato de sódio IV", "Potássio IV imediato"], correctIndex: 0, explanation: "Reposição volêmica agressiva (1-1.5L na 1ª hora) é a 1ª medida na CAD. Insulina IV contínua é 2ª etapa.", reference: "ADA – DKA Protocol" },
      { question: "Paciente DM2 em uso de Empagliflozina. Qual complicação rara mas grave monitorar?", options: ["Cetoacidose euglicêmica", "Hipoglicemia grave", "Pancreatite aguda", "Retinopatia aguda"], correctIndex: 0, explanation: "Inibidores de SGLT2 podem causar CAD euglicêmica (glicemia < 250), especialmente em jejum prolongado, cirurgia ou DM1.", reference: "FDA Warning – SGLT2 and euglycemic DKA" },
      { question: "Na hipoglicemia grave com paciente inconsciente, qual é o tratamento de emergência?", options: ["Glucagon 1mg IM/SC ou Glicose hipertônica IV", "Insulina NPH", "Metformina oral", "Soro glicosado a 5% oral"], correctIndex: 0, explanation: "Glucagon IM estimula glicogenólise hepática. Alternativa: glicose 50% IV 50mL. Paciente inconsciente = não dar via oral.", reference: "ADA – Hypoglycemia Management" },
      { question: "Paciente DM2 com TFG 35 mL/min. Quais antidiabéticos orais precisam de ajuste/suspensão?", options: ["Metformina (suspender) e Glibenclamida (trocar por Gliclazida ou insulina)", "Apenas Metformina", "Nenhum precisa de ajuste", "Suspender todos e iniciar insulina"], correctIndex: 0, explanation: "Metformina: suspender se TFG < 30. Glibenclamida: acúmulo de metabólito ativo → hipoglicemia. Gliclazida é mais segura.", reference: "KDIGO Diabetes & CKD 2022" },
      { question: "Semaglutida oral: qual instrução para o paciente otimizar a absorção?", options: ["Tomar em jejum com no máximo 120mL de água, esperar 30min antes de comer", "Tomar com refeição rica em gordura", "Tomar à noite antes de dormir", "Pode tomar com qualquer líquido"], correctIndex: 0, explanation: "Semaglutida oral usa o potenciador SNAC para absorção gástrica. Alimento ou volume excessivo de água reduz a biodisponibilidade.", reference: "Bula Rybelsus – Pfizer/Novo Nordisk" },
      { question: "Na pancreatite aguda, qual classe de antidiabéticos deve ser suspensa pelo risco associado?", options: ["Agonistas GLP-1 e inibidores de DPP-4 (risco teórico)", "Insulina", "Metformina", "SGLT2"], correctIndex: 0, explanation: "Há relatos de pancreatite aguda com incretinomiméticos, embora a causalidade não seja confirmada. Suspender por precaução.", reference: "FDA Safety Review – Incretins and Pancreatitis" },
      { question: "Insulina Glargina U-300 comparada à U-100: qual a principal vantagem?", options: ["Perfil farmacocinético mais estável com menor risco de hipoglicemia noturna", "Maior potência por unidade", "Ação mais rápida", "Menor custo"], correctIndex: 0, explanation: "Glargina U-300 forma um depósito subcutâneo menor, com liberação mais lenta e estável por >24h, reduzindo hipoglicemia.", reference: "EDITION trials – Diabetes Care" },
    ],
    specialist: [
      { question: "Na pancreatite crônica com insuficiência exócrina, qual reposição enzimática é indicada?", options: ["Pancreatina (lipase + amilase + protease) com refeições", "Insulina NPH", "Omeprazol em dose alta", "Octreotida SC"], correctIndex: 0, explanation: "A insuficiência exócrina causa má absorção (esteatorreia). Enzimas pancreáticas (Creon) devem ser administradas com refeições.", reference: "APA – Chronic Pancreatitis Guidelines" },
      { question: "Qual é o mecanismo pelo qual Tirzepatida tem maior eficácia na redução de HbA1c?", options: ["Agonismo duplo GIP + GLP-1 com efeito sinérgico nas incretinas", "Inibição tripla SGLT1 + SGLT2 + DPP-4", "Sensibilização de PPARγ + PPARα", "Bloqueio de glucagon + somatostatina"], correctIndex: 0, explanation: "Tirzepatida é o primeiro agonista duplo GIP/GLP-1, potencializando a resposta incretínica e a perda de peso.", reference: "SURPASS trials – NEJM 2021" },
      { question: "Na cetoacidose diabética, por que o potássio sérico pode estar normal/alto apesar do K⁺ corporal total depletado?", options: ["Acidose causa shift de K⁺ intracelular para extracelular", "Rim está retendo K⁺ normalmente", "Não há depleção de K⁺ na CAD", "Hiperglicemia não afeta K⁺"], correctIndex: 0, explanation: "Na CAD, a acidose + hiperosmolaridade + deficiência de insulina deslocam K⁺ para fora das células. Ao corrigir a acidose com insulina, o K⁺ sérico cai rapidamente → monitorar e repor.", reference: "ADA – DKA Potassium Management" },
      { question: "Transplante de ilhotas de Langerhans: qual imunossupressor é preferido por ser menos diabetogênico?", options: ["Sirolimus (inibidor de mTOR)", "Tacrolimus em dose alta", "Ciclosporina", "Corticoides em dose alta"], correctIndex: 0, explanation: "O protocolo de Edmonton usa Sirolimus + Tacrolimus baixa dose (sem corticoides) para proteger as ilhotas transplantadas.", reference: "Shapiro AMJ – NEJM 2000" },
      { question: "Qual é o mecanismo da hiperglicemia induzida por Tacrolimus?", options: ["Toxicidade direta às células β + resistência insulínica", "Inibição de SGLT2 renal", "Ativação de glucoquinase", "Estímulo de GLP-1"], correctIndex: 0, explanation: "Tacrolimus é tóxico para células β (inibição de calcineurina → reduz transcrição de insulina) e causa resistência periférica.", reference: "Transplant Diabetes Guidelines – KDIGO" },
      { question: "Na hipoglicemia hiperinsulinêmica persistente do recém-nascido, qual fármaco é usado?", options: ["Diazóxido (abre canais K-ATP → inibe secreção de insulina)", "Metformina", "Insulina glargina", "Glibenclamida"], correctIndex: 0, explanation: "Diazóxido abre canais K-ATP nas células β, hiperpolarizando e inibindo a secreção de insulina. 1ª linha no hiperinsulinismo congênito.", reference: "De León DD – J Clin Endocrinol Metab" },
      { question: "Sistemas de pâncreas artificial (closed-loop): qual algoritmo controla a infusão de insulina?", options: ["Algoritmo MPC (Model Predictive Control) baseado em CGM", "Bolus fixo por horário", "Ajuste manual por glicemia capilar", "Infusão contínua sem ajuste"], correctIndex: 0, explanation: "Sistemas closed-loop usam CGM em tempo real + algoritmo MPC para ajustar a infusão da bomba automaticamente, predizendo tendências.", reference: "Tauschmann M – NEJM 2018" },
      { question: "Qual o papel do amiloide de ilhotas (IAPP) na fisiopatologia do DM2?", options: ["Forma fibrilas amiloides tóxicas que destroem células β", "Estimula a secreção de glucagon", "Bloqueia receptores de insulina", "Inibe a absorção intestinal de glicose"], correctIndex: 0, explanation: "IAPP (amilina) é co-secretado com insulina. No DM2, acumula-se como amiloide nas ilhotas, causando apoptose de células β.", reference: "Westermark P – Physiol Rev 2011" },
    ],
  },
};

// ─── Organ definitions ───────────────────────────────────────────────────────
const organDefs = [
  { id: "coracao", name: "Coração", emoji: "❤️", size: 3 },
  { id: "figado", name: "Fígado", emoji: "🫁", size: 4 },
  { id: "rins", name: "Rins", emoji: "🫘", size: 3 },
  { id: "pulmoes", name: "Pulmões", emoji: "🌬️", size: 4 },
  { id: "cerebro", name: "Cérebro", emoji: "🧠", size: 3 },
  { id: "pancreas", name: "Pâncreas", emoji: "🔬", size: 2 },
];

const ROWS = 8;
const COLS = 8;
const MAX_SHOTS = 30;
const ROW_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];

// ─── Board generation ────────────────────────────────────────────────────────
function generateBoard(): { board: Cell[][]; organs: Organ[] } {
  const board: Cell[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ organId: null, status: "hidden" as const }))
  );
  const organs: Organ[] = [];

  const shuffled = [...organDefs].sort(() => Math.random() - 0.5);

  for (const def of shuffled) {
    let placed = false;
    for (let attempt = 0; attempt < 200 && !placed; attempt++) {
      const horizontal = Math.random() > 0.5;
      const r = Math.floor(Math.random() * (horizontal ? ROWS : ROWS - def.size + 1));
      const c = Math.floor(Math.random() * (horizontal ? COLS - def.size + 1 : COLS));
      const cells: [number, number][] = [];
      let fits = true;
      for (let i = 0; i < def.size; i++) {
        const nr = horizontal ? r : r + i;
        const nc = horizontal ? c + i : c;
        if (board[nr][nc].organId) { fits = false; break; }
        cells.push([nr, nc]);
      }
      if (fits) {
        cells.forEach(([cr, cc]) => { board[cr][cc].organId = def.id; });
        organs.push({ ...def, cells, hitCells: new Set(), sunk: false });
        placed = true;
      }
    }
  }
  return { board, organs };
}

function pickQuestion(organId: string, difficulty: GameDifficulty, usedIndices: Record<string, number[]>): { q: Question; idx: number } | null {
  const pool = questionBank[organId]?.[difficulty];
  if (!pool) return null;
  const key = `${organId}-${difficulty}`;
  if (!usedIndices[key]) usedIndices[key] = [];
  const available = pool.map((_, i) => i).filter((i) => !usedIndices[key].includes(i));
  if (available.length === 0) {
    // reset
    usedIndices[key] = [];
    return pickQuestion(organId, difficulty, usedIndices);
  }
  const idx = available[Math.floor(Math.random() * available.length)];
  usedIndices[key].push(idx);
  return { q: pool[idx], idx };
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function BatalhaNavalClinicaGame() {
  const [phase, setPhase] = useState<Phase>("narrative");
  const [difficulty, setDifficulty] = useState<GameDifficulty>("clinical");
  const [board, setBoard] = useState<Cell[][]>([]);
  const [organs, setOrgans] = useState<Organ[]>([]);
  const [shotsLeft, setShotsLeft] = useState(MAX_SHOTS);
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentOrganName, setCurrentOrganName] = useState("");
  const [feedbackData, setFeedbackData] = useState<{ isCorrect: boolean; title: string; explanation: string; reference: string } | null>(null);
  const [usedQuestions] = useState<Record<string, number[]>>({});
  const [sunkMessages, setSunkMessages] = useState<string[]>([]);

  const totalOrganCells = useMemo(() => organDefs.reduce((s, o) => s + o.size, 0), []);

  const startGame = useCallback(() => {
    const { board: b, organs: o } = generateBoard();
    setBoard(b);
    setOrgans(o);
    setShotsLeft(MAX_SHOTS);
    setScore(0);
    setErrors(0);
    setSelectedCell(null);
    setCurrentQuestion(null);
    setFeedbackData(null);
    setSunkMessages([]);
    setPhase("playing");
  }, []);

  const allSunk = organs.length > 0 && organs.every((o) => o.sunk);
  const gameOver = shotsLeft <= 0 || allSunk;

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (gameOver || phase !== "playing") return;
      const cell = board[r][c];
      if (cell.status !== "hidden") return;

      setShotsLeft((s) => s - 1);

      if (!cell.organId) {
        // water
        setBoard((prev) => {
          const nb = prev.map((row) => row.map((cl) => ({ ...cl })));
          nb[r][c].status = "water";
          return nb;
        });
        return;
      }

      // hit an organ — ask question
      setSelectedCell([r, c]);
      const picked = pickQuestion(cell.organId, difficulty, usedQuestions);
      if (picked) {
        setCurrentQuestion(picked.q);
        const org = organs.find((o) => o.id === cell.organId);
        setCurrentOrganName(org?.name ?? "Órgão");
        setPhase("question");
      }
    },
    [board, difficulty, gameOver, organs, phase, usedQuestions]
  );

  const handleAnswer = useCallback(
    (optionIndex: number) => {
      if (!currentQuestion || !selectedCell) return;
      const [r, c] = selectedCell;
      const isCorrect = optionIndex === currentQuestion.correctIndex;
      const organId = board[r][c].organId!;

      setBoard((prev) => {
        const nb = prev.map((row) => row.map((cl) => ({ ...cl })));
        nb[r][c].status = isCorrect ? "hit" : "miss";
        return nb;
      });

      if (isCorrect) {
        setScore((s) => s + 10);
        const org = organs.find((o) => o.id === organId);
        if (org) {
          org.hitCells.add(`${r}-${c}`);
          if (org.hitCells.size === org.size) {
            org.sunk = true;
            setSunkMessages((prev) => [...prev, `${org.emoji} ${org.name} afundado!`]);
            toast.success(`${org.emoji} ${org.name} completamente afundado!`);
          }
          setOrgans([...organs]);
        }
      } else {
        setErrors((e) => e + 1);
      }

      setFeedbackData({
        isCorrect,
        title: isCorrect ? `Acertou — ${currentOrganName}!` : `Errou — ${currentOrganName}`,
        explanation: currentQuestion.explanation,
        reference: currentQuestion.reference,
      });
      setPhase("feedback");
    },
    [board, currentOrganName, currentQuestion, organs, selectedCell]
  );

  const handleFeedbackContinue = useCallback(() => {
    setFeedbackData(null);
    setCurrentQuestion(null);
    setSelectedCell(null);
    if (allSunk || shotsLeft <= 0) {
      setPhase("result");
    } else {
      setPhase("playing");
    }
  }, [allSunk, shotsLeft]);

  // Check game over after state updates
  const shouldShowResult = phase === "playing" && gameOver;
  if (shouldShowResult) {
    setTimeout(() => setPhase("result"), 300);
  }

  // ─── Render phases ──────────────────────────────────────────────────────
  if (phase === "narrative") {
    return (
      <div className="space-y-6">
        <GameDifficultySelector selected={difficulty} onChange={setDifficulty} />
        <GameNarrative
          title="Batalha Naval Clínica"
          setting="Mar Fisiológico — Corpo Humano"
          briefing="O corpo humano é o seu campo de batalha. Órgãos vitais estão escondidos no tabuleiro. Seu objetivo: localizar todos os 6 órgãos disparando coordenadas e demonstrar seu conhecimento respondendo perguntas de fisiopatologia e farmacologia de cada região atingida. Você tem 30 tiros — use com estratégia!"
          onStart={startGame}
          icon={<Anchor className="h-10 w-10 text-primary" />}
          difficulty={difficulty === "academic" ? "Acadêmico" : difficulty === "clinical" ? "Clínico" : "Especialista"}
        />
      </div>
    );
  }

  if (phase === "result") {
    const maxScore = totalOrganCells * 10;
    return (
      <GameStarsResult
        score={score}
        maxScore={maxScore}
        errors={errors}
        title={allSunk ? "Missão Concluída!" : "Munição Esgotada!"}
        subtitle={allSunk ? "Todos os órgãos foram identificados e as perguntas respondidas corretamente." : "Você ficou sem tiros. Continue estudando e tente novamente!"}
        onRestart={() => { setPhase("narrative"); }}
        details={[
          { label: "Tiros utilizados", value: `${MAX_SHOTS - shotsLeft}/${MAX_SHOTS}` },
          { label: "Órgãos afundados", value: `${organs.filter((o) => o.sunk).length}/${organs.length}` },
          { label: "Perguntas corretas", value: `${score / 10}` },
          { label: "Perguntas erradas", value: `${errors}` },
        ]}
      />
    );
  }

  // ─── Question phase ─────────────────────────────────────────────────────
  if (phase === "question" && currentQuestion) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
        <Card className="max-w-lg w-full mx-4 shadow-2xl border-primary/20">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Crosshair className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-lg text-foreground">Pergunta — {currentOrganName}</h3>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{currentQuestion.question}</p>
            <div className="space-y-2">
              {currentQuestion.options.map((opt, i) => (
                <Button
                  key={i}
                  variant="outline"
                  className="w-full text-left justify-start h-auto py-3 px-4 text-sm whitespace-normal"
                  onClick={() => handleAnswer(i)}
                >
                  <span className="font-bold mr-2 text-primary">{String.fromCharCode(65 + i)}.</span>
                  {opt}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Feedback phase ─────────────────────────────────────────────────────
  if (phase === "feedback" && feedbackData) {
    return (
      <GameFeedbackOverlay
        isCorrect={feedbackData.isCorrect}
        title={feedbackData.title}
        explanation={feedbackData.explanation}
        reference={feedbackData.reference}
        onContinue={handleFeedbackContinue}
      />
    );
  }

  // ─── Playing phase (Board) ──────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Badge variant="outline" className="gap-1.5 text-xs">
            <Crosshair className="h-3.5 w-3.5" /> Tiros: {shotsLeft}
          </Badge>
          <Badge variant="outline" className="gap-1.5 text-xs text-green-600">
            <Activity className="h-3.5 w-3.5" /> Pontos: {score}
          </Badge>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {organs.map((o) => (
            <Badge
              key={o.id}
              variant={o.sunk ? "default" : "outline"}
              className={`text-xs gap-1 ${o.sunk ? "bg-green-600 text-white" : ""}`}
            >
              {o.emoji} {o.hitCells.size}/{o.size}
            </Badge>
          ))}
        </div>
      </div>

      {/* Sunk messages */}
      {sunkMessages.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {sunkMessages.map((msg, i) => (
            <Badge key={i} className="bg-green-600/10 text-green-700 border-green-200 text-xs">{msg}</Badge>
          ))}
        </div>
      )}

      {/* Board */}
      <div className="flex justify-center">
        <div className="inline-block">
          {/* Column headers */}
          <div className="flex">
            <div className="w-8 h-8" />
            {Array.from({ length: COLS }, (_, c) => (
              <div key={c} className="w-9 h-8 flex items-center justify-center text-xs font-bold text-muted-foreground">
                {c + 1}
              </div>
            ))}
          </div>

          {/* Rows */}
          {board.map((row, r) => (
            <div key={r} className="flex">
              <div className="w-8 h-9 flex items-center justify-center text-xs font-bold text-muted-foreground">
                {ROW_LABELS[r]}
              </div>
              {row.map((cell, c) => {
                let bg = "bg-muted/40 hover:bg-accent cursor-pointer border-border";
                let content: React.ReactNode = null;

                if (cell.status === "water") {
                  bg = "bg-blue-100 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800";
                  content = <Waves className="h-3.5 w-3.5 text-blue-400" />;
                } else if (cell.status === "hit") {
                  bg = "bg-green-100 dark:bg-green-950/40 border-green-300 dark:border-green-800";
                  const org = organs.find((o) => o.id === cell.organId);
                  content = <span className="text-sm">{org?.emoji}</span>;
                } else if (cell.status === "miss") {
                  bg = "bg-red-100 dark:bg-red-950/40 border-red-300 dark:border-red-800";
                  content = <span className="text-red-500 text-xs font-bold">✕</span>;
                }

                return (
                  <button
                    key={c}
                    className={`w-9 h-9 border rounded-md flex items-center justify-center transition-all duration-200 ${bg} ${cell.status === "hidden" ? "hover:scale-105" : ""}`}
                    onClick={() => handleCellClick(r, c)}
                    disabled={cell.status !== "hidden" || gameOver}
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted/40 border border-border inline-block" /> Oculto</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-950 border border-blue-200 inline-block" /> Água</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 dark:bg-green-950 border border-green-300 inline-block" /> Acerto</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 dark:bg-red-950 border border-red-300 inline-block" /> Erro</span>
      </div>
    </div>
  );
}
