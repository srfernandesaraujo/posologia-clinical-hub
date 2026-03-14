import { ArrowLeft, Calculator, FlaskConical, Gamepad2, DoorOpen, BarChart3, Store, Trophy, Shield, FileText, Globe, Brain, Pill, Heart, Activity, Droplets, HeartPulse, Beaker, Microscope, GraduationCap, BookOpen, Dna, Flame, TestTube, Zap, Syringe, ClipboardList, PillBottle, Scan, Accessibility } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

const sections = [
  {
    title: "Calculadoras Clínicas",
    icon: Calculator,
    description: "Mais de 20 calculadoras nativas com fórmulas validadas, modo clínico/educativo, relatório PDF e referências inline. Organização por categorias com busca e visualização em grade/lista.",
    items: [
      { name: "CKD-EPI 2021 (TFGe)", desc: "Equação sem correção racial — KDIGO 2021", link: "/calculadoras/ckd-epi" },
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
      { name: "Risco Cardiovascular", desc: "Framingham / ACC-AHA", link: "/calculadoras/risco-cardiovascular" },
      { name: "Desmame de Corticoide", desc: "Protocolos de redução gradual", link: "/calculadoras/desmame-corticoide" },
      { name: "Equivalência de Opioides", desc: "Conversão entre opioides", link: "/calculadoras/equivalencia-opioides" },
      { name: "HOMA-IR", desc: "Resistência insulínica", link: "/calculadoras/homa-ir" },
      { name: "FINDRISC", desc: "Risco de diabetes tipo 2", link: "/calculadoras/findrisc" },
    ],
  },
  {
    title: "Simuladores — Farmácia Clínica",
    icon: Pill,
    description: "Simuladores de raciocínio farmacoterapêutico com casos gerados por IA, modo exame e integração com Salas Virtuais. A plataforma possui 96+ simuladores em 12 categorias.",
    items: [
      { name: "Método SOAP", desc: "Documentação clínica estruturada", link: "/simuladores/metodo-soap" },
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
    ],
  },
  {
    title: "Simuladores — Fisiologia Humana",
    icon: HeartPulse,
    description: "Modelos fisiológicos interativos com gráficos em tempo real, 10 simuladores cobrindo sistemas cardiovascular, renal, endócrino e mais.",
    items: [
      { name: "Sistema Nervoso Autônomo (SNA)", desc: "Tônus simpático/parassimpático e efeitos em FC, PA, pupila e TGI", link: "/simuladores/sna" },
      { name: "Eletrofisiologia Cardíaca", desc: "Potencial de ação com canais de Na⁺, K⁺ e Ca²⁺", link: "/simuladores/eletrofisiologia-cardiaca" },
      { name: "Depuração Renal e TFG", desc: "Pressões arteriolares, hidratação e permeabilidade tubular", link: "/simuladores/depuracao-renal" },
      { name: "Equilíbrio Ácido-Base", desc: "Distúrbios metabólicos/respiratórios e correção de pH", link: "/simuladores/equilibrio-acido-base" },
      { name: "Regulação Glicêmica", desc: "Insulina, glucagon, DM1, DM2 e resistência insulínica", link: "/simuladores/regulacao-glicemica" },
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
    description: "7 simuladores de tecnologia farmacêutica cobrindo formulação, estabilidade e controle de qualidade.",
    items: [
      { name: "Estabilidade e Prazo de Validade", desc: "Cinética de degradação e Arrhenius", link: "/simuladores/estabilidade" },
      { name: "Sistemas de Liberação", desc: "Higuchi, Korsmeyer-Peppas e perfis de liberação", link: "/simuladores/liberacao-farmacos" },
      { name: "Diluição e Concentração", desc: "C1V1=C2V2, seriada e isotonia", link: "/simuladores/diluicao" },
      { name: "Reologia e Viscosidade", desc: "Reogramas interativos e espessantes", link: "/simuladores/reologia" },
      { name: "Equilíbrio HLB e Emulsões", desc: "Span/Tween e estabilidade de emulsões", link: "/simuladores/hlb-emulsoes" },
      { name: "Granulometria", desc: "D10, D50, D90 e span para controle de pós", link: "/simuladores/granulometria" },
      { name: "Compressão de Comprimidos", desc: "Heckel, Kawakita, dureza e friabilidade", link: "/simuladores/compressao" },
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
    title: "Laboratório Virtual",
    icon: Microscope,
    description: "11 bancadas de pesquisa modulares com fluxo sequencial (Módulo 1→5), onde cada escolha impacta os resultados seguintes, mais mini-relatório com exportação PDF. Integrado com Salas Virtuais e Analytics.",
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
    description: "Mais de 20 jogos educativos para treinar farmacologia e clínica de forma divertida e gamificada.",
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
    description: "Crie salas com PIN para atividades em grupo. Alunos acessam pelo PIN sem necessidade de cadastro.",
    items: [
      { name: "Criação de salas com PIN de 6 dígitos" },
      { name: "Atividades com simuladores e casos clínicos" },
      { name: "Dashboard do professor com submissões em tempo real" },
      { name: "Suporte a grupos e participantes individuais" },
    ],
  },
  {
    title: "Gamificação",
    icon: Trophy,
    description: "Sistema de pontos, badges, streaks e leaderboard para motivar o uso contínuo.",
    items: [
      { name: "Pontuação por simuladores, jogos e calculadoras" },
      { name: "Badges de conquistas (Explorer, Maratonista, etc.)" },
      { name: "Streak diário de uso" },
      { name: "Leaderboard global" },
    ],
  },
  {
    title: "Marketplace",
    icon: Store,
    description: "Publique e compartilhe ferramentas criadas por IA. Compre e venda calculadoras personalizadas.",
    items: [
      { name: "Criação de calculadoras com IA generativa" },
      { name: "Publicação no marketplace" },
      { name: "Sistema de avaliações e reviews" },
    ],
  },
  {
    title: "Recursos Gerais",
    icon: Shield,
    description: "Funcionalidades transversais da plataforma.",
    items: [
      { name: "Histórico de cálculos por paciente", desc: "Salve resultados e acompanhe tendências" },
      { name: "Relatórios em PDF", desc: "Gere laudos clínicos e relatórios de laboratório" },
      { name: "Compartilhamento de ferramentas", desc: "Links públicos com token seguro" },
      { name: "Modo clínico e educativo", desc: "Recomendações adaptadas ao contexto" },
      { name: "Multilíngue", desc: "Português, inglês e espanhol" },
      { name: "Responsivo", desc: "Desktop, tablet e celular" },
      { name: "Analytics", desc: "Métricas de uso e engajamento (premium)" },
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
            <p className="text-muted-foreground">Guia completo de todas as funcionalidades do Posologia Clinical Hub</p>
          </div>
        </div>
      </div>

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
    </div>
  );
}
