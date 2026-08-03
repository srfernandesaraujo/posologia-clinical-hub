import { ArrowLeft, Calculator, FlaskConical, Gamepad2, DoorOpen, BarChart3, Store, Trophy, Shield, FileText, Globe, Brain, Pill, Heart, Activity, Droplets, HeartPulse, Beaker, Microscope, GraduationCap, BookOpen, Dna, Flame, TestTube, Zap, Syringe, ClipboardList, PillBottle, Scan, Accessibility, Server, Database, Code, Cloud, Lock, Layers, Cpu, Network, Key, GitBranch, LifeBuoy } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, Link } from "react-router-dom";

const sections = [
  {
    title: "Calculadoras Clínicas",
    icon: Calculator,
    description: "34 calculadoras nativas com fórmulas validadas, modo clínico/educativo, relatório PDF e referências inline. Organização por categorias (Cardiologia, Nefrologia, Endocrinologia, Pediatria, Oncologia, Ginecologia/Obstetrícia e mais) com busca e visualização em grade/lista.",
    items: [
      { name: "CKD-EPI 2021 (TFGe)", desc: "Equação sem correção racial — KDIGO 2021", link: "/calculadoras/ckd-epi" },
      { name: "Ajuste de Dose Renal", desc: "Cockcroft-Gault, CKD-EPI e ajuste posológico", link: "/calculadoras/ajuste-dose-renal" },
      { name: "Correção de Sódio", desc: "Fórmula de Katz para hiponatremia", link: "/calculadoras/correcao-sodio" },
      { name: "Correção de Cálcio", desc: "Fórmula de Payne (ajuste por albumina)", link: "/calculadoras/correcao-calcio" },
      { name: "Wells Score", desc: "TEP e TVP com estratificação de risco", link: "/calculadoras/wells-score" },
      { name: "qSOFA", desc: "Screening de sepse à beira-leito (Sepsis-3)", link: "/calculadoras/qsofa" },
      { name: "Vancomicina AUC/MIC", desc: "Farmacocinética Sawchuk-Zaske (IDSA 2020)", link: "/calculadoras/vancomicina-auc" },
      { name: "Insulina Basal-Bolus", desc: "DDT, regra 1700 e escalas de correção", link: "/calculadoras/insulina-basal-bolus" },
      { name: "Holliday-Segar", desc: "Regra 4-2-1 para hidratação pediátrica", link: "/calculadoras/holliday-segar" },
      { name: "MELD / MELD-Na / Child-Pugh", desc: "Escores de hepatologia", link: "/calculadoras/meld-score" },
      { name: "QTc Corrigido", desc: "Bazett e Fridericia com limites por sexo", link: "/calculadoras/qtc-corrigido" },
      { name: "Dose Pediátrica", desc: "Dosagem por peso para 10+ medicamentos", link: "/calculadoras/dose-pediatrica" },
      { name: "RASS / SAS", desc: "Escalas de sedação em UTI", link: "/calculadoras/rass-sedacao" },
      { name: "Nutrição Parenteral", desc: "Harris-Benedict, GET, GIR e macronutrientes", link: "/calculadoras/nutricao-parenteral" },
      { name: "Interações CYP450", desc: "Radar visual de interações medicamentosas", link: "/calculadoras/interacoes-cyp" },
      { name: "Risco Cardiovascular", desc: "Framingham / ACC-AHA / SCORE2", link: "/calculadoras/risco-cardiovascular" },
      { name: "Desmame de Corticoide", desc: "Protocolos de redução gradual", link: "/calculadoras/desmame-corticoide" },
      { name: "Equivalência de Opioides", desc: "Conversão entre opioides", link: "/calculadoras/equivalencia-opioides" },
      { name: "Equivalência de Antidepressivos", desc: "Conversão segura com estratégia de transição", link: "/calculadoras/equivalencia-antidepressivos" },
      { name: "HOMA-IR", desc: "Resistência insulínica", link: "/calculadoras/homa-ir" },
      { name: "FINDRISC", desc: "Risco de diabetes tipo 2", link: "/calculadoras/findrisc" },
      { name: "Adesão Oncológica", desc: "ARMS, MOATT, Morisky e AQT", link: "/calculadoras/adesao-oncologia" },
      { name: "Toxicidade a Antineoplásicos", desc: "CARG, CRASH e HFA-ICOS", link: "/calculadoras/toxicidade-antineoplasicos" },
      { name: "Ajuste de Dose Oncológico", desc: "Calvert, Cockcroft-Gault e NCI-ODWG/Child-Pugh", link: "/calculadoras/ajuste-dose-oncologico" },
      { name: "Curvas de Crescimento OMS", desc: "Z-score peso-idade (WHO 2006), 0-5 anos", link: "/calculadoras/curvas-crescimento-oms" },
      { name: "Bilirrubina Neonatal", desc: "Nomograma de Bhutani/AAP e fototerapia", link: "/calculadoras/bilirrubina-neonatal" },
      { name: "TFG Pediátrica (Schwartz)", desc: "Bedside Schwartz 2009", link: "/calculadoras/schwartz-pediatrico" },
      { name: "PEWS", desc: "Pediatric Early Warning Score", link: "/calculadoras/pews" },
      { name: "Drogas Vasoativas Pediátricas", desc: "Infusão e diluição de vasopressores/inotrópicos", link: "/calculadoras/drogas-vasoativas-pediatricas" },
      { name: "Idade Gestacional + DPP", desc: "Cálculo por DUM ou USG com timeline", link: "/calculadoras/idade-gestacional" },
      { name: "Ganho de Peso Gestacional", desc: "Critério IOM 2009 por IMC pré-gestacional", link: "/calculadoras/ganho-peso-gestacional" },
      { name: "Risco de Pré-Eclâmpsia", desc: "ACOG/NICE e indicação de AAS profilático", link: "/calculadoras/risco-pre-eclampsia" },
      { name: "Bishop Score", desc: "Amadurecimento cervical para indução do parto", link: "/calculadoras/bishop-score" },
      { name: "Sulfato de Magnésio", desc: "Protocolos Zuspan e Pritchard", link: "/calculadoras/sulfato-magnesio" },
    ],
  },
  {
    title: "Simuladores — Farmácia Clínica",
    icon: Pill,
    description: "Simuladores de raciocínio farmacoterapêutico com casos gerados por IA, modo exame e integração com Salas Virtuais. A plataforma possui 109+ simuladores em 12 categorias. Recurso exclusivo do plano Premium — bloqueado tanto no hub quanto por rota (/simuladores/*) via AppLayout, incluindo simuladores dinâmicos criados por IA, que agora seguem a mesma regra dos nativos (Premium para uso, não só para criação).",
    items: [
      { name: "Método SOAP", desc: "Documentação clínica estruturada", link: "/simuladores/metodo-soap" },
      { name: "Paciente-IA por Voz", desc: "Anamnese e comunicação por voz com paciente simulado por IA, avaliação final da anamnese e leitura em voz alta nativa do navegador. Exclusivo Premium, limite diário de 15 turnos de voz, indisponível em Sala Virtual", link: "/simuladores/paciente-ia-voz" },
      { name: "MAI (Medication Appropriateness Index)", desc: "Avaliação de adequação em 10 critérios", link: "/simuladores/mai" },
      { name: "Cascata de Prescrição", desc: "Identificação de cascatas prescritivas", link: "/simuladores/cascata-prescricao" },
      { name: "PRM", desc: "Problemas Relacionados a Medicamentos", link: "/simuladores/prm" },
      { name: "Antimicrobianos", desc: "Stewardship: empírica e descalonamento", link: "/simuladores/antimicrobianos" },
      { name: "TDM", desc: "Monitorização terapêutica de fármacos", link: "/simuladores/tdm" },
      { name: "Acompanhamento Farmacoterapêutico", desc: "Consultas seriadas de pacientes crônicos", link: "/simuladores/acompanhamento" },
      { name: "Insulina", desc: "Insulinoterapia intensiva (Koda-Kimble)", link: "/simuladores/insulina" },
      { name: "Bomba de Infusão", desc: "Programação de bomba com drug library", link: "/simuladores/bomba-infusao" },
      { name: "Desmame de Benzodiazepínicos", desc: "Protocolo de Ashton com check-in de sintomas", link: "/simuladores/desmame-benzo" },
      { name: "Interações Medicamentosas", desc: "Dados RxNav (NIH) e cenários clínicos", link: "/simuladores/interacoes" },
      { name: "Manejo da Dor e Analgesia", desc: "Escada Analgésica da OMS", link: "/simuladores/manejo-dor" },
      { name: "Inflamação e Anti-inflamatórios", desc: "AINEs e corticoides por seletividade COX", link: "/simuladores/inflamacao-aines" },
      { name: "Infecções e Antibioticoterapia", desc: "ITU, diarreia infecciosa e C. difficile", link: "/simuladores/infeccoes-antibioticos" },
      { name: "Tratamento da Asma", desc: "Steps GINA (1-5) e situações especiais", link: "/simuladores/tratamento-asma" },
      { name: "Dispensação — Portaria 344/98", desc: "Medicamentos controlados (listas A, B e C)", link: "/simuladores/dispensacao-344" },
    ],
  },
  {
    title: "Simuladores — Fisiologia Humana",
    icon: HeartPulse,
    description: "Modelos fisiológicos interativos com gráficos em tempo real, 11 simuladores cobrindo sistemas cardiovascular, renal, endócrino e mais. Os 5 simuladores com caso clínico (SNA, Eletrofisiologia Cardíaca, Depuração Renal, Equilíbrio Ácido-Base e Regulação Glicêmica) compartilham um \"Paciente Digital Contínuo\": ao trocar de simulador na mesma sessão, cada um herda baselines influenciados pelo que foi feito nos outros (persistido em sessionStorage). Exclusivo do uso individual — desativado dentro de Sala Virtual.",
    items: [
      { name: "Sistema Nervoso Autônomo (SNA)", desc: "Tônus simpático/parassimpático e efeitos em FC, PA, pupila e TGI", link: "/simuladores/sna" },
      { name: "Eletrofisiologia Cardíaca", desc: "Potencial de ação com canais de Na⁺, K⁺ e Ca²⁺", link: "/simuladores/eletrofisiologia-cardiaca" },
      { name: "Depuração Renal e TFG", desc: "Pressões arteriolares, hidratação, permeabilidade tubular e glicosúria pelo limiar renal real (~180mg/dL)", link: "/simuladores/depuracao-renal" },
      { name: "Equilíbrio Ácido-Base", desc: "Distúrbios metabólicos/respiratórios e correção de pH", link: "/simuladores/equilibrio-acido-base" },
      { name: "Regulação Glicêmica", desc: "Insulina, glucagon, DM1, DM2 e resistência insulínica", link: "/simuladores/regulacao-glicemica" },
      { name: "Painel do Paciente Contínuo", desc: "Snapshot consolidado dos vitais herdados entre os 5 simuladores acima, com proveniência por módulo", link: "/simuladores/paciente-continuo" },
      { name: "Eixo HPA", desc: "Feedback hipotálamo-hipófise-adrenal", link: "/simuladores/eixo-hpa" },
      { name: "Cinética Enzimática", desc: "Michaelis-Menten e Lineweaver-Burk", link: "/simuladores/cinetica-enzimatica" },
      { name: "Secreção Ácida Gástrica", desc: "Receptores H2, M3 e CCK-B da célula parietal", link: "/simuladores/secrecao-gastrica" },
      { name: "Cascata de Coagulação", desc: "Hemofilia, varfarina, heparina e CIVD", link: "/simuladores/cascata-coagulacao" },
      { name: "Compartimentos ADME", desc: "Farmacocinética de 1 compartimento", link: "/simuladores/compartimentos-adme" },
    ],
  },
  {
    title: "Simuladores — Bioquímica",
    icon: Beaker,
    description: "10 simuladores de vias metabólicas e mecanismos bioquímicos com visualizações em tempo real.",
    items: [
      { name: "Cadeia de Transporte de Eletrões", desc: "Fosforilação oxidativa e inibidores", link: "/simuladores/cadeia-eletrons" },
      { name: "Dissociação da Hemoglobina", desc: "Curva sigmoidal e efeito Bohr", link: "/simuladores/dissociacao-hemoglobina" },
      { name: "Glicólise vs. Gliconeogénese", desc: "Metabolismo hepático e enzimas regulatórias", link: "/simuladores/glicolise-gliconeogenese" },
      { name: "Cinética Enzimática Avançada", desc: "Inibição competitiva, não-competitiva e acompetitiva", link: "/simuladores/cinetica-avancada" },
      { name: "Ciclo da Ureia", desc: "Deficiências enzimáticas e neurotoxicidade", link: "/simuladores/ciclo-ureia" },
      { name: "Cascata do Ácido Araquidónico", desc: "COX, LOX e eicosanóides", link: "/simuladores/acido-araquidonico" },
      { name: "Metabolismo das Lipoproteínas", desc: "VLDL, LDL, HDL, estatinas e iPCSK9", link: "/simuladores/lipoproteinas" },
      { name: "Via das Pentoses Fosfato", desc: "NADPH, glutationa e G6PD", link: "/simuladores/pentoses-fosfato" },
      { name: "Titulação de Aminoácidos", desc: "Curvas de titulação, pKa e pI", link: "/simuladores/titulacao-aminoacidos" },
      { name: "Operão Lac", desc: "Regulação genética bacteriana", link: "/simuladores/operon-lac" },
    ],
  },
  {
    title: "Simuladores — Farmacologia Básica",
    icon: Brain,
    description: "8 simuladores de mecanismos farmacológicos fundamentais com curvas dose-resposta e modelos de receptores.",
    items: [
      { name: "Curva Dose-Resposta", desc: "EC50, Emax, agonistas parciais e antagonismo", link: "/simuladores/dose-resposta" },
      { name: "Transdução de Sinal", desc: "GPCR, tirosina quinase, ionotrópico e nuclear", link: "/simuladores/transducao-sinal" },
      { name: "Janela Terapêutica e IT", desc: "DE50 vs DL50 e índice terapêutico", link: "/simuladores/janela-terapeutica-farma" },
      { name: "Vias de Administração", desc: "Perfis Cp×t para IV, IM, SC, oral e sublingual", link: "/simuladores/vias-administracao" },
      { name: "Bloqueio Neuromuscular", desc: "Despolarizantes vs não-despolarizantes, TOF", link: "/simuladores/bloqueio-neuromuscular" },
      { name: "Farmacologia Autonômica", desc: "Atropina, fenilefrina, propranolol em órgãos-alvo", link: "/simuladores/farmaco-autonomica" },
      { name: "Tolerância e Dependência", desc: "Opioides, BZD, álcool e síndrome de abstinência", link: "/simuladores/tolerancia-dependencia" },
      { name: "Farmacogenômica CYP", desc: "Metabolizadores lentos/ultrarrápidos e curvas PK", link: "/simuladores/farmacogenomica" },
    ],
  },
  {
    title: "Simuladores — Farmacotécnica",
    icon: FlaskConical,
    description: "8 simuladores de tecnologia farmacêutica cobrindo formulação, estabilidade e controle de qualidade.",
    items: [
      { name: "Estabilidade e Prazo de Validade", desc: "Cinética de degradação e Arrhenius", link: "/simuladores/estabilidade" },
      { name: "Sistemas de Liberação", desc: "Higuchi, Korsmeyer-Peppas e perfis de liberação", link: "/simuladores/liberacao-farmacos" },
      { name: "Diluição e Concentração", desc: "C1V1=C2V2, seriada e isotonia", link: "/simuladores/diluicao" },
      { name: "Reologia e Viscosidade", desc: "Reogramas interativos e espessantes", link: "/simuladores/reologia" },
      { name: "Equilíbrio HLB e Emulsões", desc: "Span/Tween e estabilidade de emulsões", link: "/simuladores/hlb-emulsoes" },
      { name: "Granulometria", desc: "D10, D50, D90 e span para controle de pós", link: "/simuladores/granulometria" },
      { name: "Compressão de Comprimidos", desc: "Heckel, Kawakita, dureza e friabilidade", link: "/simuladores/compressao" },
      { name: "Tampão Farmacêutico e pH", desc: "Henderson-Hasselbalch e capacidade tamponante", link: "/simuladores/tampao-farmaceutico" },
    ],
  },
  {
    title: "Simuladores — Química Farmacêutica",
    icon: Dna,
    description: "8 simuladores de design molecular, SAR e propriedades físico-químicas de fármacos.",
    items: [
      { name: "SAR Explorer", desc: "Substituintes, potência e seletividade", link: "/simuladores/sar-explorer" },
      { name: "Regra de Lipinski", desc: "MW, logP, HBD, HBA e druglikeness", link: "/simuladores/lipinski" },
      { name: "Bioisosterismo", desc: "Grupos funcionais e propriedades comparadas", link: "/simuladores/bioisosterismo" },
      { name: "Metabolismo de Fármacos", desc: "CYP450 e ativação de pró-fármacos", link: "/simuladores/metabolismo-farmacos" },
      { name: "Docking Simplificado", desc: "Interação fármaco-receptor e ΔG", link: "/simuladores/docking-simplificado" },
      { name: "Quiralidade", desc: "Eutômero, distômero e chiral switch", link: "/simuladores/quiralidade" },
      { name: "pKa e Absorção", desc: "Henderson-Hasselbalch e ion trapping", link: "/simuladores/pka-absorcao" },
      { name: "QSAR (Hansch)", desc: "logP, σ Hammett e atividade biológica", link: "/simuladores/qsar-simplificado" },
    ],
  },
  {
    title: "Simuladores — Formação Docente",
    icon: GraduationCap,
    description: "7 simuladores exclusivos para treinamento pedagógico de professores — diferenciais únicos no mercado.",
    items: [
      { name: "Feedback Formativo", desc: "Modelos Pendleton, R2C2 e ALOBA", link: "/simuladores/feedback-formativo" },
      { name: "Elaboração de Questões (Bloom)", desc: "Taxonomia de Bloom revisada", link: "/simuladores/elaboracao-questoes" },
      { name: "Condução de Caso (PBL/TBL)", desc: "Facilitação de discussões em grupo", link: "/simuladores/conducao-caso-pbl" },
      { name: "Planejamento de Aula (DCNs)", desc: "Alinhamento construtivo de Biggs", link: "/simuladores/planejamento-aula" },
      { name: "Gestão de Sala", desc: "Incidentes críticos e soft skills", link: "/simuladores/gestao-sala" },
      { name: "Avaliação por Rubrica (OSCE)", desc: "Calibração de avaliadores (kappa)", link: "/simuladores/avaliacao-rubrica-osce" },
      { name: "Preceptoria Clínica (OMP)", desc: "One-Minute Preceptor em 5 passos", link: "/simuladores/preceptoria-clinica" },
    ],
  },
  {
    title: "Simuladores — Odontologia",
    icon: Scan,
    description: "8 simuladores para prática odontológica com SVG interativo, radiografias esquemáticas e planejamento cirúrgico.",
    items: [
      { name: "Odontograma Interativo", desc: "Registro clínico com arcada SVG (32 dentes, 5 faces) e ICDAS", link: "/simuladores/odontograma" },
      { name: "Anatomia Dental (Endodontia)", desc: "Anatomia interna, testes de vitalidade e decisão terapêutica", link: "/simuladores/anatomia-endodontia" },
      { name: "Periodontograma", desc: "Sondagem periodontal com classificação AAP/EFP 2018", link: "/simuladores/periodontograma" },
      { name: "Anestesiologia Odontológica", desc: "Técnicas de bloqueio e cálculo de dose máxima", link: "/simuladores/anestesiologia-odonto" },
      { name: "Cefalometria e Angle", desc: "Marcação cefalométrica e cálculo de SNA, SNB e ANB", link: "/simuladores/cefalometria" },
      { name: "Radiografia Odontológica", desc: "Leitura de imagens esquemáticas e identificação de patologias", link: "/simuladores/radiografia-odonto" },
      { name: "Farmacologia Odontológica", desc: "Prescrição segura com gauges de risco por perfil", link: "/simuladores/farmacologia-odonto" },
      { name: "Cirurgia e Exodontia", desc: "Pell & Gregory e planejamento de terceiros molares", link: "/simuladores/cirurgia-exodontia" },
    ],
  },
  {
    title: "Simuladores — Fisioterapia",
    icon: Accessibility,
    description: "8 simuladores para avaliação funcional, neurológica e respiratória com ferramentas visuais interativas.",
    items: [
      { name: "Goniometria Articular", desc: "Medição de ADM com goniômetro virtual e valores AAOS", link: "/simuladores/goniometria" },
      { name: "Avaliação Postural", desc: "Simetrógrafo com marcação de pontos e fio de prumo", link: "/simuladores/avaliacao-postural" },
      { name: "Força Muscular (Oxford/MRC)", desc: "Graduação 0-5 com mapa de calor corporal", link: "/simuladores/forca-muscular" },
      { name: "Dermátomos e Sensibilidade", desc: "Mapeamento sensitivo e correlação com nível de lesão", link: "/simuladores/dermatomos" },
      { name: "Fisioterapia Respiratória", desc: "Ausculta virtual e técnicas de higiene brônquica", link: "/simuladores/respiratorio" },
      { name: "Eletroterapia", desc: "TENS, FES, corrente russa com visualização de onda", link: "/simuladores/eletroterapia" },
      { name: "Testes Ortopédicos", desc: "Testes provocativos com animação SVG da manobra", link: "/simuladores/testes-ortopedicos" },
      { name: "Escala de Berg", desc: "14 itens de equilíbrio com radar e risco de queda", link: "/simuladores/berg" },
    ],
  },
  {
    title: "Simuladores — Nutrição",
    icon: ClipboardList,
    description: "8 simuladores para avaliação nutricional, terapia enteral/parenteral e condições clínicas especiais.",
    items: [
      { name: "Avaliação Nutricional", desc: "IMC, composição corporal e risco metabólico", link: "/simuladores/avaliacao-nutricional" },
      { name: "Triagem Nutricional (NRS-2002)", desc: "Ferramentas de triagem e decisão de conduta", link: "/simuladores/triagem-nutricional" },
      { name: "Necessidades Energéticas", desc: "Harris-Benedict, Mifflin e macronutrientes", link: "/simuladores/necessidades-energeticas" },
      { name: "Terapia Nutricional Enteral", desc: "Fórmulas, vias de acesso e complicações", link: "/simuladores/tne" },
      { name: "Terapia Nutricional Parenteral", desc: "Prescrição, compatibilidade e manejo", link: "/simuladores/tnp" },
      { name: "Disfagia", desc: "Testes à beira-leito, FOIS e consistências", link: "/simuladores/disfagia" },
      { name: "Nutrição Renal", desc: "Prescrição dietética na DRC", link: "/simuladores/nutricao-renal" },
      { name: "Nutrição Materno-Infantil", desc: "Atalah, suplementação e intercorrências", link: "/simuladores/nutricao-materno-infantil" },
    ],
  },
  {
    title: "Simuladores — Genética",
    icon: Dna,
    description: "8 simuladores de genética molecular e clássica com visualizações interativas de laboratório e herança.",
    items: [
      { name: "Sequenciamento de DNA (Sanger e NGS)", desc: "Eletroferogramas, Phred score e cobertura", link: "/simuladores/sequenciamento-dna" },
      { name: "SNPs e Farmacogenética", desc: "Polimorfismos CYP450, VKORC1 e DPYD", link: "/simuladores/snp-farmacogenetica" },
      { name: "Cariótipo e Anomalias Cromossômicas", desc: "Trissomias, monossomias e translocações", link: "/simuladores/cariotipo" },
      { name: "Herança Mendeliana e Heredogramas", desc: "Quadro de Punnett e probabilidades genéticas", link: "/simuladores/heranca-mendeliana" },
      { name: "PCR e Eletroforese em Gel", desc: "Ciclos térmicos, primers e bandas em gel", link: "/simuladores/pcr-eletroforese" },
      { name: "Epigenética e Regulação Gênica", desc: "Metilação de DNA e acetilação de histonas", link: "/simuladores/epigenetica" },
      { name: "Mutações e Reparo de DNA", desc: "Mecanismos de reparo MMR, BER, NER e HR", link: "/simuladores/mutacoes-reparo" },
      { name: "Genética de Populações", desc: "Hardy-Weinberg, seleção natural e deriva genética", link: "/simuladores/genetica-populacoes" },
    ],
  },
  {
    title: "Simuladores — Farmacoterapia Laboratorial",
    icon: TestTube,
    description: "8 simuladores de interpretação de exames laboratoriais aplicados à conduta farmacoterapêutica.",
    items: [
      { name: "Hemograma e Condutas Hematológicas", desc: "Anemias, neutropenias e plaquetopenias", link: "/simuladores/farmacoterapia-hemograma" },
      { name: "Distúrbios Ácido-Base e Eletrólitos", desc: "Gasometria e correção farmacológica", link: "/simuladores/farmacoterapia-acido-base" },
      { name: "Hepatopatias e Ajuste Hepático", desc: "Transaminases, INR e Child-Pugh", link: "/simuladores/farmacoterapia-hepatopatia" },
      { name: "Função Renal e Ajuste de Dose", desc: "ClCr/TFG, estadiamento DRC e nefrotóxicos", link: "/simuladores/farmacoterapia-renal" },
      { name: "Marcadores de Infecção e Antibioticoterapia", desc: "PCR, PCT, lactato e leucograma diferencial", link: "/simuladores/farmacoterapia-infeccao-lab" },
      { name: "Perfil Lipídico e Risco Cardiovascular", desc: "LDL, HDL, triglicerídeos e escolha de estatinas", link: "/simuladores/farmacoterapia-dislipidemia" },
      { name: "Glicemia, Diabetes e Insulinoterapia", desc: "Glicemia, HbA1c e ajuste de antidiabéticos", link: "/simuladores/farmacoterapia-glicemia" },
      { name: "Coagulação e Anticoagulantes", desc: "INR, TTPa, anti-Xa e reversão", link: "/simuladores/farmacoterapia-coagulacao" },
    ],
  },
  {
    title: "MedView 3D",
    icon: Scan,
    description: "Visualizador de modelos 3D anatômicos e procedimentos clínicos (via Sketchfab/Z-Anatomy) organizado em 6 categorias: Ortopedia, Cardiologia Intervencionista, Odontologia, Farmacologia/Dispositivos, Dermatologia/Cirurgia Plástica e Cirurgia Geral. Recurso exclusivo do plano Premium, bloqueado por rota (/medview-3d/*) via AppLayout.",
    items: [
      { name: "Ortopedia e Traumatologia", desc: "Próteses de joelho/quadril e fixação com placas", link: "/medview-3d/ortopedia-proteses" },
      { name: "Cardiologia Intervencionista", desc: "Angioplastia com stent e cateterismo cardíaco", link: "/medview-3d/cardiologia-stent" },
      { name: "Odontologia e Bucomaxilofacial", desc: "Implantes, exodontia e movimentação ortodôntica", link: "/medview-3d/odontologia-implantes" },
      { name: "Farmacologia e Dispositivos", desc: "DIU, implante subdérmico e terapia-alvo", link: "/medview-3d/farmacologia-dispositivos" },
      { name: "Dermatologia e Cirurgia Plástica", desc: "Toxina botulínica e preenchimento facial", link: "/medview-3d/dermatologia-cirurgia-plastica" },
      { name: "Cirurgia Geral", desc: "Colecistectomia e apendicectomia laparoscópicas", link: "/medview-3d/cirurgia-geral-laparoscopia" },
    ],
  },
  {
    title: "Laboratório Virtual",
    icon: Microscope,
    description: "11 bancadas de pesquisa modulares com fluxo sequencial (Módulo 1→5), onde cada escolha impacta os resultados seguintes, mais mini-relatório com exportação PDF (premium). Integrado com Salas Virtuais e Analytics. Recurso exclusivo do plano Premium, bloqueado por rota (/laboratorio-virtual/*) via AppLayout.",
    items: [
      { name: "Desenvolvimento de Fármacos", desc: "Alvo → ligante → docking → ensaio clínico → relatório", link: "/laboratorio-virtual" },
      { name: "Microbiologia", desc: "Cepa → antibióticos → placa de Petri → curva de crescimento", link: "/laboratorio-virtual" },
      { name: "Toxicologia", desc: "Substância → desenho de ensaio → dose-resposta → parâmetros tox.", link: "/laboratorio-virtual" },
      { name: "Farmacogenômica", desc: "Fármaco → população → curvas PK → comparação de AUC", link: "/laboratorio-virtual" },
      { name: "Estabilidade", desc: "Formulação → condições ICH → degradação → Arrhenius", link: "/laboratorio-virtual" },
      { name: "Controle de Qualidade", desc: "Método → calibração → quantificação → validação ICH Q2", link: "/laboratorio-virtual" },
      { name: "Epidemiologia", desc: "Desenho → variáveis → tabela 2×2 → forest plot", link: "/laboratorio-virtual" },
      { name: "Biotecnologia", desc: "Constructo → indução → SDS-PAGE → curva de expressão", link: "/laboratorio-virtual" },
      { name: "Simulação Realística", desc: "Cenários clínicos com decisões em tempo real e desfechos variáveis", link: "/laboratorio-virtual" },
      { name: "Perícia Forense", desc: "Coleta de evidências → análise toxicológica → laudo pericial", link: "/laboratorio-virtual" },
      { name: "Modelagem Molecular", desc: "Busca de compostos → edição molecular → predições in silico", link: "/laboratorio-virtual" },
    ],
  },
  {
    title: "Jogos Clínicos",
    icon: Gamepad2,
    description: "Mais de 20 jogos educativos para treinar farmacologia e clínica de forma divertida e gamificada. Organização por categorias com busca e visualização em grade/lista.",
    items: [
      { name: "Alerta Vermelho", desc: "Identificação de emergências" },
      { name: "Código Azul", desc: "Simulação de parada cardíaca" },
      { name: "Milionário da Farma", desc: "Quiz farmacológico" },
      { name: "Detetive Toxicológico", desc: "Investigação de intoxicações" },
      { name: "RPG do TCC", desc: "Role-playing de caso clínico" },
      { name: "E mais 15+ jogos temáticos" },
    ],
  },
  {
    title: "Salas Virtuais",
    icon: DoorOpen,
    description: "Crie salas com PIN para atividades em grupo. Suporta simuladores, laboratórios de pesquisa e casos clínicos em equipe ao vivo, com Analytics completo (decisões, radar, relatório e sinal de risco por aluno), certificação OSCE ao final de provas multi-estação, e feedback de IA com trilha de raciocínio auditável para o professor.",
    items: [
      { name: "Criação de salas com PIN de 6 dígitos" },
      { name: "Modo Simulação Unitária ou Atividade Simulada (roteiro multi-etapas)" },
      { name: "Catálogo com 109+ simuladores e 11 bancadas de pesquisa" },
      { name: "Caso em Equipe (ao vivo)", desc: "Nova atividade da Atividade Simulada: papéis (médico, farmacêutico, enfermagem) assumidos por participantes diferentes na mesma sessão, com timeline compartilhada em tempo real (Postgres Changes) e presença online (Supabase Presence). O professor injeta intercorrências do roteiro do caso e conduz a sessão em \"Abrir sessão ao vivo\" (/salas-virtuais/:roomId/ao-vivo/:activityId); o aluno participa em /sala/equipe/:activityId. Ao encerrar, cada participante recebe uma submissão automática (formato simulator_decisions) que entra no Analytics normalmente — sem tela de relatório nova. 1 caso-piloto disponível: \"Sepse grave — admissão na UTI\" (3 papéis)" },
      { name: "Dashboard do professor com submissões e analytics em tempo real" },
      { name: "Suporte a grupos e participantes individuais" },
      { name: "Analytics com gráfico radar, decisões detalhadas, relatórios de laboratório e sinal de risco por aluno", desc: "Badge \"Observar\"/\"Atenção\" na tabela de desempenho por aluno (Salas Virtuais → Analytics e em cada Turma), calculado 100% client-side a partir dos dados já coletados — sem tabela nova, sem IA: queda de nota entre a primeira e a segunda metade das submissões, abandono (entrou e nunca submeteu, ou não concluiu uma sequência de atividades) e tempo de resposta muito diferente da turma numa mesma atividade (só quando há 3+ colegas com tempo real registrado)" },
      { name: "Certificado OSCE", desc: "Quando a Atividade Simulada (roteiro multi-etapas) está completa para um aluno, o professor pode emitir na aba de submissões um certificado com nota final (média das estações), detalhamento de desempenho por competência agrupado pela mesma categoria de simulador do Mapa de Competências, e um sinal leve de integridade de prova (trocas de aba/saídas de tela-cheia registradas durante as estações, sem webcam). Gera PDF client-side (jsPDF) com código de verificação único e pode ser revogado a qualquer momento; verificação pública sem login em /verificar-certificado/:codigo" },
      { name: "Feedback de Simulação com Trilha de Raciocínio Explicável", desc: "Chat de IA para o professor que aplica modelos pedagógicos (Pendleton, R2C2, ALOBA, SBI, Mini-CEX etc.) sobre o desempenho de uma sala. O botão \"Finalizar e salvar avaliação\" converte a conversa inteira numa cadeia de critérios auditável via tool calling forçado (instrumento pedagógico aplicado, critério por critério com observação real da sala, referência e veredito, mais um resumo), persistida na tabela ai_reasoning_traces — mesmo padrão de RLS de osce_certificates (só o professor dono da sala e admin, sem SELECT público). A tela lista \"Avaliações salvas nesta sala\", permitindo reabrir uma avaliação já finalizada depois de um reload", link: "/agente-feedback" },
    ],
  },
  {
    title: "Gamificação",
    icon: Trophy,
    description: "Sistema de pontos, badges, streaks, leaderboard e mapa de competências para motivar o uso contínuo.",
    items: [
      { name: "Pontuação por simuladores, jogos e calculadoras — inclui simuladores resolvidos individualmente (fora de Sala Virtual), proporcional ao score obtido" },
      { name: "Badges de conquistas (Explorer, Maratonista, etc.)" },
      { name: "Streak diário de uso" },
      { name: "Leaderboard global" },
      { name: "Mapa de Competências (aba \"Competências\" em /gamificacao): score de maestria por categoria de simulador, calculado como média dos scores reais de cada tentativa ponderada por recência (meia-vida de 30 dias) — não é Bayesian Knowledge Tracing. Categorias com menos de 2 tentativas aparecem como \"poucos dados ainda\" em vez de entrar no radar" },
      { name: "Teaser de maestria no Dashboard, destacando categoria mais forte e mais fraca (só quando há dado confiável)" },
      { name: "Créditos de Educação Continuada", desc: "Na mesma aba \"Competências\", cada trilha (= categoria de simulador do Mapa de Competências) com maestria ponderada ≥70% e 3+ simuladores distintos concluídos libera um botão para emitir um certificado de trilha em PDF (jsPDF), com código de verificação público em /verificar-credito/:codigo. Exclusivo Premium — a edge function education-credit-issue recalcula a elegibilidade no servidor a partir de simulator_attempts, nunca confia no client. Diferente do certificado OSCE (escopado a uma sala/prova), cobre qualquer uso da plataforma, dentro ou fora de Salas Virtuais. É um certificado verificável simples (PDF + verificação por código), não um Open Badge/Verifiable Credential assinado, e não há integração real com conselhos profissionais (CFF/CRF/CFM) — o próprio PDF avisa que o reconhecimento formal depende de trâmite institucional próprio" },
    ],
  },
  {
    title: "Marketplace",
    icon: Store,
    description: "Publique e compartilhe ferramentas criadas por IA. Compre e venda calculadoras personalizadas. Toda publicação passa por curadoria clínica: uma auditoria de IA analisa a fórmula e os campos, e um admin pode conceder o selo \"Validado clinicamente\".",
    items: [
      { name: "Criação de calculadoras com IA generativa" },
      { name: "Publicação no marketplace", desc: "Continua imediata — a curadoria roda em segundo plano e não bloqueia a publicação" },
      { name: "Auditoria clínica automática", desc: "Edge function audit-marketplace-tool (disparada ao publicar) audita fórmula/campos contra literatura e faixas de referência clínicas, gravando um veredito pending/clear/flagged com notas. Se sinalizar risco clínico real (\"flagged\"), a ferramenta é despublicada automaticamente até revisão humana" },
      { name: "Selo \"Validado clinicamente\"", desc: "Ícone ShieldCheck exibido nos cards de /marketplace — só aparece depois que um admin aprova manualmente em /admin/marketplace-review; a auditoria de IA sozinha não concede o selo, só sinaliza" },
      { name: "Curadoria (admin)", desc: "Lista ferramentas publicadas com filtro por status de auditoria, notas da IA e campos/fórmula; permite aprovar e conceder selo, remover selo, despublicar ou republicar", link: "/admin/marketplace-review" },
      { name: "Sistema de avaliações e reviews" },
    ],
  },
  {
    title: "Suporte Técnico",
    icon: LifeBuoy,
    description: "Central de chamados técnicos com thread de mensagens entre usuário e admin. Usuários logados abrem chamados com assunto, categoria, descrição e anexo opcional, acompanham status e prioridade, e respondem para reabrir chamados resolvidos/fechados. Administradores contam com painel dedicado de triagem e uma aba de Diagnóstico com dados de conta/plano, contexto técnico do navegador e atividade recente do usuário.",
    items: [
      { name: "Abrir chamado", desc: "Assunto, categoria (bug, dúvida, financeiro, sugestão ou outro), descrição e anexo opcional", link: "/suporte" },
      { name: "Acompanhar chamados", desc: "Status (aberto/em andamento/resolvido/fechado) e prioridade — responder reabre chamados resolvidos ou fechados", link: "/suporte" },
      { name: "Notificação por e-mail", desc: "Aviso ao admin na abertura do chamado e ao usuário quando a equipe responde (via Resend)" },
      { name: "Painel admin de chamados", desc: "Filtros por status/prioridade/busca, thread de resposta e alteração de status/prioridade", link: "/admin/tickets" },
      { name: "Diagnóstico (admin)", desc: "Conta e plano do usuário, contexto técnico do navegador na abertura do chamado e atividade recente (tool_visits, analytics_events, usage_logs)", link: "/admin/tickets" },
    ],
  },
  {
    title: "Recursos Gerais",
    icon: Shield,
    description: "Funcionalidades transversais da plataforma.",
    items: [
      { name: "Histórico de cálculos por paciente", desc: "Salve resultados e acompanhe tendências" },
      { name: "Relatórios em PDF", desc: "Gere laudos clínicos e relatórios de laboratório (premium)" },
      { name: "Compartilhamento de ferramentas", desc: "Links públicos com token seguro" },
      { name: "Modo clínico e educativo", desc: "Recomendações adaptadas ao contexto" },
      { name: "Multilíngue", desc: "Português, inglês e espanhol" },
      { name: "Responsivo", desc: "Desktop, tablet e celular" },
      { name: "Analytics", desc: "Métricas de uso e engajamento (premium)" },
      { name: "Oráculo (assistente de IA)", desc: "Chat flutuante que orienta o usuário logado sobre qual ferramenta usar. Dentro da página de um simulador, se a última tentativa individual do usuário teve decisões erradas, o Oráculo vira um preceptor socrático (método do preceptor de um minuto): pergunta sobre uma decisão específica antes de revelar a resposta certa, em vez de responder direto — ação rápida 'Refletir sobre este caso'" },
      { name: "Lia (consultora comercial de IA)", desc: "Assistente de vendas para visitantes não autenticados" },
      { name: "Recomendado para você (Dashboard)", desc: "Bloco no Dashboard com até 5 sugestões baseadas em recência/cobertura de uso: ferramentas paradas há 14+ dias e calculadoras de categorias que você frequenta mas nunca abriu" },
      { name: "Revisão espaçada semanal (e-mail)", desc: "E-mail semanal (segunda-feira, via Resend) com a mesma lógica de recomendação do Dashboard. Opt-in em Minha Conta → Preferências (ativado por padrão)" },
      { name: "App instalável e uso offline (PWA)", desc: "Instale a plataforma como aplicativo; as 34 calculadoras continuam funcionando offline após a primeira visita — um aviso informa que os resultados só são salvos no histórico ao reconectar" },
    ],
  },
];

const techSections = [
  {
    title: "Stack Tecnológico",
    icon: Code,
    content: [
      { label: "Frontend", value: "React 18 + TypeScript + Vite 7 (SPA)" },
      { label: "Estilização", value: "Tailwind CSS 3.4 + shadcn/ui (Radix primitives)" },
      { label: "Roteamento", value: "React Router DOM v7 (client-side routing)" },
      { label: "Gráficos", value: "Recharts (LineChart, BarChart, RadarChart, PieChart)" },
      { label: "Animações", value: "tailwindcss-animate (utilitários de animação Tailwind) + transições CSS" },
      { label: "Internacionalização", value: "i18next + react-i18next (pt, en, es)" },
      { label: "Notificações", value: "Sonner (toasts) + shadcn Toast" },
      { label: "PDF", value: "jsPDF (100% client-side) para relatórios, certificado OSCE e crédito de educação continuada exportáveis" },
      { label: "Testes", value: "Vitest + Testing Library" },
      { label: "Linting", value: "ESLint com config flat (eslint.config.js)" },
      { label: "Build", value: "Vite com tree-shaking, code splitting por rota (lazy imports)" },
      { label: "PWA / Offline", value: "vite-plugin-pwa (Workbox) — precache do app shell para uso offline das calculadoras após a primeira visita, com cache runtime NetworkFirst para chamadas REST do Supabase" },
    ],
  },
  {
    title: "Backend — Supabase",
    icon: Cloud,
    content: [
      { label: "Provedor", value: "Supabase (PostgreSQL gerenciado + Auth + Edge Functions + Storage)" },
      { label: "Autenticação", value: "Supabase Auth com email/senha, persistência em localStorage, autoRefreshToken" },
      { label: "SDK", value: "supabase-js v2 com tipagem gerada automaticamente (Database types)" },
      { label: "Client", value: "Singleton em src/integrations/supabase/client.ts com createClient<Database>()" },
      { label: "Tipos", value: "src/integrations/supabase/types.ts — gerado automaticamente pelo CLI do Supabase" },
      { label: "Projeto ID", value: "hxfzgjxwozzuzgdsrrpb" },
    ],
  },
  {
    title: "Banco de Dados — Tabelas",
    icon: Database,
    content: [
      { label: "profiles", value: "Perfis de usuário (user_id, full_name, avatar_url, has_unlimited_access, status, weekly_digest_opt_in)" },
      { label: "user_roles", value: "Roles separadas (admin, user, professor) — enum app_role" },
      { label: "tools", value: "Ferramentas/calculadoras (name, slug, type, fields JSON, formula JSON, category_id, is_marketplace, ai_audit_status pending/clear/flagged, ai_audit_notes, ai_audited_at, clinically_validated, clinically_validated_by, clinically_validated_at)" },
      { label: "categories", value: "Categorias de ferramentas (name, slug, icon)" },
      { label: "simulator_cases", value: "Casos clínicos (case_data JSONB, simulator_slug, difficulty, is_ai_generated)" },
      { label: "virtual_rooms", value: "Salas virtuais (pin, title, simulator_slug, case_id, expires_at, is_active)" },
      { label: "room_activities", value: "Atividades de sala (room_id, simulator_slug, case_id, position)" },
      { label: "room_participants", value: "Participantes (participant_name, is_group, group_members JSONB)" },
      { label: "room_submissions", value: "Submissões (actions JSONB, score, time_spent_seconds, step_index, tab_switch_count — sinal leve de integridade de prova para o certificado OSCE)" },
      { label: "live_sessions", value: "Sessão ao vivo de um Caso em Equipe (room_id, activity_id, case_key, status lobby/active/ended, started_at, ended_at, created_by)" },
      { label: "live_session_participants", value: "Papel assumido por cada participante numa sessão de Caso em Equipe (session_id, participant_id, role) — únicos por papel e por pessoa dentro da sessão" },
      { label: "live_session_events", value: "Log append-only de ações dos participantes, intercorrências injetadas pelo professor e eventos de sistema (event_type action/intercorrencia/system, payload JSONB) — o estado do caso é derivado deste log, não uma linha mutável, evitando condições de corrida entre papéis" },
      { label: "calculation_history", value: "Histórico de cálculos por usuário (calculator_slug, details JSONB, patient_name)" },
      { label: "student_points", value: "Pontuação gamificada (source, points, simulator_slug)" },
      { label: "user_badges", value: "Badges conquistadas (badge_id, earned_at)" },
      { label: "simulator_attempts", value: "Log append-only de tentativas de simulador (simulator_slug, score 0-100, actions JSONB) — base do Mapa de Competências (useMastery)" },
      { label: "osce_certificates", value: "Certificado OSCE emitido pelo professor ao final de uma Atividade Simulada (room_id, participant_id, verification_code único, student_name, exam_title, final_score, competency_breakdown JSONB, integrity_flags JSONB, issued_by, issued_at, revoked_at) — sem RLS de leitura pública" },
      { label: "education_credits", value: "Crédito de educação continuada por trilha (= categoria de simulador do Mapa de Competências): user_id, student_name, track_category, mastery_pct, distinct_simulators, credit_hours, verification_code único, issued_at, revoked_at — 1 por usuário/categoria (UNIQUE), emitido só pela edge function education-credit-issue (sem policy de INSERT client-side) e sem policy de SELECT pública" },
      { label: "ai_reasoning_traces", value: "Cadeia de raciocínio estruturada por trás de uma avaliação de sala gerada no Feedback de Simulação (room_id, created_by, instrument, criteria JSONB, summary, transcript JSONB, created_at), persistida quando o professor clica \"Finalizar e salvar avaliação\" — sem RLS de leitura pública, mesmo padrão de osce_certificates" },
      { label: "voice_usage_daily", value: "Contador diário de turnos de voz por usuário (user_id, usage_date, turns_count) — teto do simulador Paciente-IA por Voz via RPCs increment_voice_usage_turn/decrement_voice_usage_turn (SECURITY DEFINER)" },
      { label: "marketplace_purchases", value: "Compras do marketplace (tool_id, buyer_id, seller_id, price_brl)" },
      { label: "shared_tools", value: "Links compartilhados (share_token, tool_id, expires_at)" },
      { label: "tool_reviews", value: "Avaliações de ferramentas (rating, comment)" },
      { label: "analytics_events", value: "Eventos de analytics (event_type, session_id, page_path, metadata JSONB)" },
      { label: "ai_api_keys", value: "Chaves de API de IA (provider, model, priority, is_active) — somente admin" },
      { label: "ai_usage_log", value: "Log de uso de IA (tokens_input/output, estimated_cost_usd, prompt_type)" },
      { label: "contact_messages", value: "Mensagens de contato (name, email, subject, message)" },
      { label: "usage_logs", value: "Logs de uso de ferramentas (tool_id, user_id)" },
      { label: "subscribers", value: "Status de assinatura Stripe persistido (user_id, status, plan, stripe_customer_id, stripe_subscription_id, current_period_end) — sincronizado por stripe-webhook, fonte de verdade para check-subscription e getFullAccess()" },
      { label: "support_tickets", value: "Chamados de suporte (user_id, subject, category, status, priority, diagnostic_snapshot JSONB com contexto do navegador)" },
      { label: "support_ticket_messages", value: "Thread de mensagens dos chamados (ticket_id, sender_id, sender_role, message, attachment_url)" },
      { label: "leaderboard (View)", value: "View agregada com total_points, active_days, badge_count por usuário" },
    ],
  },
  {
    title: "Segurança — RLS & Auth",
    icon: Lock,
    content: [
      { label: "RLS (Row-Level Security)", value: "Habilitado em todas as tabelas. Políticas PERMISSIVE baseadas em auth.uid() e has_role()" },
      { label: "Função has_role()", value: "SECURITY DEFINER que consulta user_roles sem recursão RLS" },
      { label: "Trigger on_auth_user_created", value: "Cria profile + atribui role 'user' automaticamente no signup" },
      { label: "Roles", value: "Enum app_role: admin | user | professor" },
      { label: "Padrão de acesso", value: "Propriedade (auth.uid() = user_id/created_by) ou role admin" },
      { label: "Salas Virtuais", value: "Acesso público para leitura (is_active=true), CRUD restrito ao criador" },
      { label: "Caso em Equipe (ao vivo)", value: "live_sessions/live_session_participants/live_session_events têm leitura pública (timeline e presença compartilhadas entre os papéis) e escrita autenticada restrita ao dono da sala; participantes anônimos só escrevem (entrar em papel, registrar ação) via edge function live-session-access com service role, mesmo padrão de room-access" },
      { label: "Marketplace", value: "Leitura pública de tools ativos + marketplace; escrita restrita ao dono" },
      { label: "Certificados OSCE", value: "osce_certificates sem nenhuma policy de SELECT pública (evita vazar nome de aluno certificado) — só o professor dono da sala (via virtual_rooms.created_by) e admins gerenciam; a verificação pública passa exclusivamente pela edge function certificate-verify (service role), mesmo padrão de room-access" },
      { label: "Créditos de Educação Continuada", value: "education_credits sem policy de SELECT pública (evita vazar nome do aluno certificado) — usuário autenticado só enxerga os próprios créditos, admins gerenciam todos; sem policy de INSERT/UPDATE para authenticated, então a emissão só acontece via edge function education-credit-issue (service role) e a verificação pública só via education-credit-verify (service role), mesmo padrão de osce_certificates/certificate-verify" },
      { label: "Trilha de raciocínio da IA (Feedback de Simulação)", value: "ai_reasoning_traces sem nenhuma policy de SELECT pública (evita vazar avaliação de alunos) — só o professor dono da sala (via virtual_rooms.created_by) e admins leem/escrevem, mesmo padrão de proteção de osce_certificates; a gravação de fato acontece via feedback-agent (service role) porque é ali que a IA gera a cadeia de critérios por tool calling, não porque a RLS excluiria o professor" },
      { label: "Proteção dos campos de curadoria clínica", value: "Trigger BEFORE UPDATE protect_clinical_review_fields em tools impede que o dono da ferramenta altere ai_audit_status/ai_audit_notes/ai_audited_at/clinically_validated(_by/_at) via update client-side — só admin ou a edge function audit-marketplace-tool (service role) podem escrever nessas colunas, mesma classe de proteção de profiles.has_unlimited_access" },
      { label: "Chamados de suporte", value: "Usuário vê/cria os próprios chamados e mensagens; status/prioridade só mudam pela mão do admin. Bucket privado support-attachments com acesso restrito ao dono do arquivo ou admin" },
      { label: "Bloqueio de auto-promoção", value: "Trigger BEFORE UPDATE em profiles impede que o próprio usuário altere has_unlimited_access; somente admin pode conceder" },
      { label: "Gating Premium server-side", value: "getFullAccess() (supabase/functions/_shared/subscription.ts) valida assinatura ativa, has_unlimited_access e role admin dentro de generate-tool, generate-game, generate-lab-context, generate-simulation-scenario e education-credit-issue, fechando o bypass de chamar a edge function direto sem passar pela checagem do cliente" },
      { label: "Gating Premium por rota", value: "AppLayout aplica PremiumGate em /laboratorio-virtual/*, /medview-3d/* e /simuladores/*, bloqueando deep links/refresh para páginas Premium — inclui simuladores dinâmicos criados por IA" },
      { label: "Limite de calculadoras", value: "3 calculadoras/dia do plano Gratuito verificadas centralmente em AppLayout a cada navegação para /calculadoras/*, cobrindo links diretos e refresh (antes só era checado a partir do hub)" },
      { label: "Autenticação obrigatória", value: "generate-simulation-scenario e generate-lab-context agora exigem JWT válido (antes eram chamáveis sem autenticação)" },
      { label: "Limite diário de turnos de voz", value: "voice_usage_daily + RPC increment_voice_usage_turn (SECURITY DEFINER) aplicam um teto de 15 turnos/dia por usuário dentro das edge functions voice-transcribe/voice-patient-turn/voice-patient-eval — primeiro rate limit real de custo de IA no backend do produto (o limite de calculadoras é apenas contagem de uso, sem relação com gasto de IA)" },
      { label: "Cookies", value: "Banner LGPD com consentimento granular (CookieConsentContext)" },
    ],
  },
  {
    title: "Edge Functions (Serverless)",
    icon: Server,
    content: [
      { label: "generate-case", value: "Gera casos clínicos via IA (OpenAI/compatível) para simuladores" },
      { label: "generate-game", value: "Gera conteúdo de jogos clínicos via IA" },
      { label: "generate-tool", value: "Cria calculadoras personalizadas via IA generativa" },
      { label: "generate-lab-context", value: "Gera contexto científico para bancadas do Laboratório Virtual" },
      { label: "generate-simulation-scenario", value: "Gera cenários de simulação realística via IA" },
      { label: "feedback-agent", value: "Agente de feedback educacional com IA sobre o desempenho de uma sala virtual (Pendleton, R2C2, ALOBA, SBI etc.); modo finalize (tool calling forçado, submit_reasoning_chain) converte a conversa numa cadeia de critérios auditável e grava em ai_reasoning_traces" },
      { label: "predict-admet", value: "Predição ADMET in silico para modelagem molecular" },
      { label: "docking-comparativo", value: "Análise comparativa de docking (original vs. modificado vs. análogo) via IA" },
      { label: "analyze-modification", value: "Analisa impacto de modificações estruturais em moléculas via IA" },
      { label: "oracle-agent", value: "Chat 'Oráculo' — assistente de IA que orienta usuários logados sobre a plataforma; dentro de um simulador, verifica o JWT do usuário e lê a tentativa mais recente em simulator_attempts para atuar como preceptor socrático sobre decisões erradas" },
      { label: "sales-agent", value: "Chat 'Lia' — consultora comercial de IA para visitantes" },
      { label: "generate-roadmap", value: "Gera sugestões de roadmap/funcionalidades via IA (uso administrativo)" },
      { label: "voice-transcribe", value: "Transcreve (STT) o áudio gravado pelo aluno no simulador Paciente-IA por Voz via Groq/OpenAI Whisper, reaproveitando a tabela ai_api_keys; aplica o limite diário de 15 turnos" },
      { label: "voice-patient-turn", value: "Gera a resposta em texto do paciente simulado por IA a cada turno de anamnese do Paciente-IA por Voz, no mesmo padrão callAI()/_shared/ai-provider.ts do Oráculo — persona revela histórico só sob pergunta específica" },
      { label: "voice-patient-eval", value: "Avalia a qualidade da anamnese conduzida ao final da consulta do Paciente-IA por Voz (0-100 + rubrica, via tool calling), gravando o resultado em simulator_attempts" },
      { label: "check-subscription", value: "Lê status de assinatura da tabela subscribers (fast path); se não houver registro, consulta a Stripe ao vivo e faz backfill" },
      { label: "stripe-webhook", value: "Recebe eventos do Stripe (checkout.session.completed, customer.subscription.updated/created/deleted) e sincroniza a tabela subscribers, com verificação de assinatura via STRIPE_WEBHOOK_SECRET" },
      { label: "create-checkout", value: "Cria sessão de checkout Stripe para assinaturas" },
      { label: "customer-portal", value: "Portal de gerenciamento de assinatura (Stripe)" },
      { label: "purchase-tool", value: "Processa compras do marketplace" },
      { label: "audit-marketplace-tool", value: "Disparada ao publicar uma calculadora no Marketplace; audita fórmula/campos via IA contra literatura/faixas de referência clínicas e grava veredito ai_audit_status (pending/clear/flagged) com notas — despublica automaticamente se sinalizar risco clínico real, até revisão de admin em /admin/marketplace-review" },
      { label: "award-points", value: "Concede pontuação de gamificação por ações do usuário" },
      { label: "send-contact-email", value: "Envia emails de contato via Resend API" },
      { label: "invite-user / list-invited-users", value: "Convite de usuários pelo admin" },
      { label: "list-all-users", value: "Lista todos os usuários da plataforma (somente admin)" },
      { label: "room-access", value: "Valida acesso de alunos a salas virtuais via PIN" },
      { label: "certificate-verify", value: "Verificação pública (sem login) de certificados OSCE por código via service role — osce_certificates não tem policy de SELECT pública" },
      { label: "education-credit-issue", value: "Autenticada + gate Premium (getFullAccess); recalcula no servidor a elegibilidade do crédito de educação continuada a partir de simulator_attempts (maestria ponderada ≥70% e 3+ simuladores distintos na trilha/categoria) e emite o crédito — idempotente por usuário/categoria" },
      { label: "education-credit-verify", value: "Verificação pública (sem login) de créditos de educação continuada por código via service role — education_credits não tem policy de SELECT pública, mesmo padrão de certificate-verify" },
      { label: "live-session-access", value: "Mesmo padrão de room-access para participantes anônimos de um Caso em Equipe (ao vivo): ações get-or-create-session, join-role, submit-action e leave, todas via service role" },
      { label: "search-sketchfab", value: "Busca modelos 3D na API do Sketchfab (MedView 3D)" },
      { label: "oembed", value: "Endpoint oEmbed para incorporação de ferramentas compartilhadas" },
      { label: "game-ranking / update-game", value: "Ranking e atualização de jogos" },
      { label: "case-authors / list-marketplace-cases", value: "Consulta autores e casos do marketplace" },
      { label: "hub-metrics / send-metrics-to-hub", value: "Métricas e integração com hub externo" },
      { label: "expire-inactive-rooms", value: "Expira salas virtuais inativas (cron/manual)" },
      { label: "verify-share", value: "Valida tokens de compartilhamento de ferramentas" },
      { label: "notify-ticket-event", value: "Envia email via Resend ao admin (novo chamado) e ao usuário (nova resposta) nos chamados de suporte" },
      { label: "generate-review-digest", value: "Envia e-mail semanal (via Resend) com sugestões de ferramentas paradas/não exploradas para usuários com weekly_digest_opt_in; disparada por pg_cron toda segunda-feira" },
    ],
  },
  {
    title: "Integrações & APIs Externas",
    icon: Network,
    content: [
      { label: "Multi-provedor de IA", value: "Google Gemini (prioridade padrão), Groq, OpenAI, Anthropic e OpenRouter — ordem definida por prioridade em ai_api_keys" },
      { label: "Stripe", value: "Pagamentos, assinaturas e portal do cliente (STRIPE_SECRET_KEY); eventos sincronizados via stripe-webhook (STRIPE_WEBHOOK_SECRET) para a tabela subscribers" },
      { label: "Resend", value: "Envio de emails transacionais — contato, chamados de suporte e resumo semanal de revisão espaçada (RESEND_API_KEY)" },
      { label: "Sketchfab", value: "Busca e embed de modelos 3D anatômicos (SKETCHFAB_API_KEY)" },
      { label: "RxNav (NIH)", value: "Interações medicamentosas no simulador de Interações" },
      { label: "Z-Anatomy", value: "Visualizador 3D anatômico integrado (MedView 3D)" },
      { label: "Hub externo", value: "Sincronização de métricas (HUB_SERVICE_KEY, HUB_SERVICE_ID)" },
    ],
  },
  {
    title: "Secrets (Variáveis de Ambiente)",
    icon: Key,
    content: [
      { label: "VITE_SUPABASE_URL", value: "URL pública do projeto Supabase (frontend)" },
      { label: "VITE_SUPABASE_PUBLISHABLE_KEY", value: "Chave anon/pública do Supabase (frontend)" },
      { label: "SUPABASE_SERVICE_ROLE_KEY", value: "Chave de serviço (somente Edge Functions — nunca no frontend)" },
      { label: "STRIPE_SECRET_KEY", value: "Chave secreta Stripe (Edge Functions)" },
      { label: "STRIPE_WEBHOOK_SECRET", value: "Segredo de verificação de assinatura do webhook Stripe (Edge Function stripe-webhook)" },
      { label: "RESEND_API_KEY", value: "Chave da API Resend (Edge Functions)" },
      { label: "SKETCHFAB_API_KEY", value: "Chave da API Sketchfab (Edge Functions)" },
      { label: "HUB_SERVICE_KEY / HUB_SERVICE_ID", value: "Credenciais do hub de métricas externo" },
      { label: "HUB_METRICS_KEY", value: "Chave de métricas do hub" },
    ],
  },
  {
    title: "Arquitetura Frontend",
    icon: Layers,
    content: [
      { label: "Estrutura de pastas", value: "src/pages (rotas), src/components (UI), src/hooks (lógica), src/contexts (estado global), src/data (constantes)" },
      { label: "Roteamento", value: "App.tsx com React Router — rotas públicas (PublicLayout) e protegidas (AppLayout + ProtectedRoute)" },
      { label: "Autenticação", value: "AuthContext com useAuth() — session, user, isAdmin, isProfessor, signIn, signUp, signOut" },
      { label: "Feature Gating", value: "useFeatureGating() — controle de acesso a funcionalidades por plano/role" },
      { label: "Gamificação", value: "useGamification() — pontos, badges, streaks (student_points + user_badges)" },
      { label: "Mapa de Competências", value: "useMastery() — score de maestria por categoria de simulador a partir de simulator_attempts, ponderado por recência (src/data/simulatorCategories.ts mapeia slug → categoria)" },
      { label: "Paciente Digital Contínuo", value: "PatientProvider (src/contexts/PatientContext.tsx) + motor puro src/lib/patientEngine.ts — estado fisiológico único entre os 5 simuladores de Fisiologia Humana com caso clínico (SNA, Depuração Renal, Ácido-Base, Glicemia, Eletrofisiologia), persistido em sessionStorage; desativado dentro de Sala Virtual (useVirtualRoomCase)" },
      { label: "Histórico", value: "useCalculationHistory() — CRUD de cálculos salvos por paciente" },
      { label: "Assinatura", value: "useSubscription() — verifica plano ativo via Edge Function" },
      { label: "Componentes de gating", value: "PremiumGate (bloqueio de rota inteira) e PdfExportButton (bloqueio da exportação PDF) centralizam a checagem de plano, evitando repetir isPremium em cada página" },
      { label: "Salas Virtuais", value: "useVirtualRoomCase() — carrega caso e simulador de uma sala; também escuta visibilitychange/fullscreenchange e acumula tab_switch_count (sinal leve de integridade para o certificado OSCE, sem webcam e não-bloqueante)" },
      { label: "Certificado OSCE", value: "src/lib/osceCertificate.ts — computeCompetencyBreakdown() agrupa as notas das estações por categoria de simulador (mesmo mapa do Mapa de Competências) e generateCertificateCode() gera o código de verificação; PDF montado client-side com jsPDF em SalaDetalhe.tsx" },
      { label: "Créditos de Educação Continuada", value: "useEducationCredits()/useIssueEducationCredit() (src/hooks/useEducationCredits.ts) — lista os créditos do usuário e emite via edge function education-credit-issue; PDF client-side com jsPDF em src/lib/educationCredit.ts (generateEducationCreditPDF), mesmo padrão do certificado OSCE" },
      { label: "Caso em Equipe (ao vivo)", value: "SalaAoVivo.tsx (professor) e simuladores/LiveTeamCase.tsx (aluno) — canal Supabase Presence (quem está conectado) + Postgres Changes na tabela live_session_events (timeline), mesmo padrão de CDC do canal realtime de Analytics.tsx, sem introduzir Broadcast. Caso-piloto hardcoded em src/data/liveTeamCases/sepseGrave.ts (sem editor de casos ainda)" },
      { label: "Risco por aluno", value: "src/lib/studentRisk.ts (computeStudentRisk/riskBadgeProps) — heurística client-side sobre room_submissions/room_participants/room_activities já carregados (tendência de nota, abandono de atividades, anomalia de tempo por etapa), sem tabela nova nem IA; usada em Analytics (aba Salas Virtuais) e em TurmaDetalhe" },
      { label: "Trilha de raciocínio explicável", value: "src/components/ReasoningTrail.tsx — painel expansível item a item (critério/decisão) com observação, referência e veredito; reutilizado em AgenteFeedback.tsx (cadeia de critérios salva do Feedback de Simulação), SimuladorPacienteVoz.tsx (rubrica final de anamnese) e Analytics.tsx (decisões no formato simulator_decisions)" },
      { label: "Design System", value: "Tokens semânticos em index.css (--primary, --background, etc.) + tailwind.config.ts" },
      { label: "Componentes UI", value: "shadcn/ui (40+ componentes) com variantes customizadas" },
    ],
  },
  {
    title: "Deploy & Infraestrutura",
    icon: GitBranch,
    content: [
      { label: "Hospedagem", value: "Frontend com domínio customizado; backend (banco + Edge Functions) no Supabase" },
      { label: "Domínio publicado", value: "simulador.posologia.app" },
      { label: "CI/CD", value: "GitHub Actions (.github/workflows/deploy-supabase.yml) — a cada push em main que altera supabase/**, roda supabase db push e supabase functions deploy automaticamente, sem passo manual" },
      { label: "Edge Functions", value: "Deploy automático via GitHub Actions (Supabase CLI, Deno runtime)" },
      { label: "CDN", value: "Assets estáticos servidos via CDN do Lovable" },
      { label: "Monitoramento", value: "Logs de Edge Functions no dashboard Supabase + analytics interno" },
      { label: "Banco de dados", value: "PostgreSQL gerenciado pelo Supabase (região automática)" },
    ],
  },
];

export default function Documentacao() {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-xl bg-primary/10 p-3">
            <FileText className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Documentação</h1>
            <p className="text-muted-foreground">Guia completo de funcionalidades e infraestrutura técnica do Posologia Clinical Hub</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="funcionalidades" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="funcionalidades" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Funcionalidades
          </TabsTrigger>
          <TabsTrigger value="tecnico" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Infraestrutura Técnica
          </TabsTrigger>
        </TabsList>

        <TabsContent value="funcionalidades">
          <div className="space-y-8">
            {sections.map((section) => (
              <div key={section.title} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <section.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{section.title}</h2>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {section.items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                      <span className="text-primary mt-0.5">•</span>
                      <div className="min-w-0">
                        {"link" in item && item.link ? (
                          <Link to={item.link} className="text-sm font-medium text-primary hover:underline">{item.name}</Link>
                        ) : (
                          <span className="text-sm font-medium">{item.name}</span>
                        )}
                        {"desc" in item && item.desc && (
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tecnico">
          <div className="space-y-8">
            {techSections.map((section) => (
              <div key={section.title} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <section.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold">{section.title}</h2>
                </div>
                <div className="space-y-1">
                  {section.content.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                      <span className="text-xs font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded whitespace-nowrap mt-0.5 min-w-[140px] text-center">
                        {item.label}
                      </span>
                      <span className="text-sm text-muted-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
