export type LandingLocale = "pt" | "en" | "es";

export interface LandingCopy {
  hero: {
    eyebrow: string;
    headlineLine1: string;
    headlineAccent: string;
    headlineLine2: string;
    subtitle: string;
    ctaPrimary: string;
    ctaDemo: string;
    ctaCatalog: string;
    pinTitle: string;
    pinSubtitle: string;
    pinBadge: string;
    pinPlaceholder: string;
    pinSubmit: string;
    pinAria: string;
    telemetryTag: string;
    telemetryTitle: string;
    telemetryMeta: string;
    trustMetrics: { value: string; label: string }[];
    quickCards: {
      badge: string;
      title: string;
      desc: string;
      cta: string;
      to: string;
      accent: "teal" | "sky" | "violet";
    }[];
  };
  story: {
    eyebrow: string;
    title: string;
    subtitle: string;
    acts: {
      id: string;
      index: string;
      tag: string;
      title: string;
      desc: string;
      bullets: string[];
      metricLabel: string;
      metricValue: string;
    }[];
  };
  pillars: {
    eyebrow: string;
    title: string;
    subtitle: string;
    items: {
      id: string;
      badge: string;
      count: string;
      title: string;
      desc: string;
      tags: string[];
      accent: "teal" | "sky" | "violet" | "amber";
      to: string;
    }[];
    spotlight: {
      eyebrow: string;
      title: string;
      subtitle: string;
      presetsLabel: string;
      doseLabel: string;
      intervalLabel: string;
      clcrLabel: string;
      targetLegend: string;
      ctaText: string;
      disclaimer: string;
      presets: {
        id: string;
        label: string;
        summary: string;
        doseMg: number;
        intervalH: number;
        clcr: number;
        weightKg: number;
      }[];
      status: {
        sub: { label: string; action: string };
        target: { label: string; action: string };
        toxic: { label: string; action: string };
      };
    };
  };
  playground: {
    eyebrow: string;
    title: string;
    subtitle: string;
    tabs: { id: "pk" | "team" | "voice"; label: string; badge: string }[];
    pk: {
      title: string;
      desc: string;
      presets: {
        id: string;
        name: string;
        detail: string;
        age: number;
        weight: number;
        scr: number;
        sex: "m" | "f";
        dose: number;
        tau: number;
      }[];
      labels: {
        clcr: string;
        halfLife: string;
        aucMic: string;
        status: string;
        conduct: string;
      };
    };
    team: {
      title: string;
      desc: string;
      caseTitle: string;
      replay: string;
      pause: string;
      play: string;
      intercurrenceBadge: string;
      rubricTitle: string;
      events: {
        time: string;
        role: string;
        roleColor: "sky" | "teal" | "violet" | "amber";
        action: string;
        impact: string;
        isIntercurrence?: boolean;
      }[];
      rubric: { label: string; target: number }[];
    };
    voice: {
      title: string;
      desc: string;
      patientLabel: string;
      audioLabel: string;
      playAudio: string;
      pauseAudio: string;
      viewTranscript: string;
      viewFhir: string;
      rubricBadge: string;
      turns: { speaker: "student" | "patient"; text: string; tag?: string }[];
      fhirCaption: string;
    };
  };
  bento: {
    eyebrow: string;
    title: string;
    subtitle: string;
    cards: {
      id: "sim-engine" | "virtual-room" | "lab-bench" | "ai-voice-fhir";
      eyebrow: string;
      title: string;
      desc: string;
      metric: string;
      accent: "teal" | "sky" | "violet" | "amber";
    }[];
  };
  workflow: {
    eyebrow: string;
    title: string;
    subtitle: string;
    inspectHint: string;
    nodes: {
      id: string;
      stage: string;
      label: string;
      sublabel: string;
      detail: string;
      metrics: string[];
      accent: "teal" | "sky" | "violet" | "amber";
    }[];
  };
  authority: {
    eyebrow: string;
    title: string;
    subtitle: string;
    pillars: { title: string; desc: string }[];
    videoBadge: string;
    videoTitle: string;
    videoDuration: string;
    chaptersLabel: string;
    chapters: { time: string; title: string; summary: string }[];
  };
  finalCta: {
    eyebrow: string;
    title: string;
    subtitle: string;
    primary: string;
    secondary: string;
    docsLink: string;
    plansLink: string;
  };
  showreel: {
    title: string;
    subtitle: string;
    close: string;
    play: string;
    pause: string;
    cta: string;
    chapters: {
      id: string;
      time: string;
      tag: string;
      title: string;
      caption: string;
      highlights: string[];
    }[];
  };
}

const pt: LandingCopy = {
  hero: {
    eyebrow: "POSOLOGIA CLINICAL HUB · 111 SIMULADORES · 34 CALCULADORAS · 11 BANCADAS",
    headlineLine1: "Decisões clínicas se treinam",
    headlineAccent: "antes do paciente real.",
    headlineLine2: "",
    subtitle:
      "Simuladores farmacocinéticos e fisiológicos com resposta em tempo real, 34 calculadoras validadas offline (PWA), 11 bancadas de laboratório virtual e Salas Virtuais com PIN, Caso em Equipe ao vivo e Certificado OSCE verificável.",
    ctaPrimary: "Criar conta gratuita",
    ctaDemo: "Assistir demonstração",
    ctaCatalog: "Ver catálogo",
    pinTitle: "Entrar na Sala Virtual com PIN",
    pinSubtitle: "Sem cadastro para alunos — digite o código de 6 dígitos do professor.",
    pinBadge: "ACESSO IMEDIATO",
    pinPlaceholder: "PIN de 6 dígitos",
    pinSubmit: "Entrar na sala",
    pinAria: "PIN da sala virtual com 6 números",
    telemetryTag: "MOTOR PK/PD EM TEMPO REAL",
    telemetryTitle: "Vancomicina AUC₂₄/MIC · Paciente Contínuo · FHIR R4",
    telemetryMeta: "Diretrizes IDSA 2020 · KDIGO 2021 · Sepsis-3 · GINA",
    trustMetrics: [
      { value: "111", label: "Simuladores em 14 áreas" },
      { value: "34", label: "Calculadoras offline (PWA)" },
      { value: "11", label: "Bancadas de Laboratório" },
      { value: "OSCE", label: "Certificados verificáveis" },
    ],
    quickCards: [
      {
        badge: "ESTUDANTES & RESIDÊNCIA",
        title: "Pratique casos sem risco real",
        desc: "Ajuste variáveis, veja curvas PK/PD reagirem e receba preceptoria do Oráculo após cada tentativa.",
        cta: "Começar gratuitamente",
        to: "/cadastro",
        accent: "teal",
      },
      {
        badge: "DOCENTES & COORDENADORES",
        title: "Salas Virtuais, TBL e OSCE",
        desc: "Crie roteiros multi-estações, conduza Caso em Equipe ao vivo e acompanhe radar de competências e sinais de risco.",
        cta: "Conhecer planos",
        to: "/planos",
        accent: "sky",
      },
      {
        badge: "PRÁTICA CLÍNICA & PLANTÃO",
        title: "34 Calculadoras instaláveis offline",
        desc: "CKD-EPI 2021, Vancomicina AUC/MIC, Wells, MELD, Pediatria e Oncologia com laudo em PDF e histórico.",
        cta: "Explorar vitrine",
        to: "/vitrine",
        accent: "violet",
      },
    ],
  },
  story: {
    eyebrow: "COMO A APRENDIZAGEM ACONTECE",
    title: "Mexe no simulador. Interpreta o dado. Decide em grupo.",
    subtitle:
      "Cada caso substitui memorização passiva por um ciclo completo de raciocínio clínico — da manipulação do parâmetro à avaliação auditável.",
    acts: [
      {
        id: "act-1",
        index: "ATO 01",
        tag: "ENTRADA · CENÁRIO CLÍNICO REAL",
        title: "Um paciente vivo, não uma questão estática.",
        desc: "O professor abre uma Sala Virtual com PIN de 6 dígitos — ou o aluno inicia um caso individual ou gerado por IA. Exames laboratoriais, prescrição, gasometria e histórico longitudinal chegam prontos para investigação.",
        bullets: [
          "Acesso do aluno via PIN sem exigir criação de conta",
          "Modos Individual, Grupo com Líder, TBL ou Caso em Equipe ao vivo",
          "Prontuário longitudinal com visualização real em JSON FHIR R4",
        ],
        metricLabel: "TEMPO DE ENTRADA EM SALA",
        metricValue: "< 10 segundos",
      },
      {
        id: "act-2",
        index: "ATO 02",
        tag: "MOTOR · RESPOSTA EM TEMPO REAL",
        title: "Cada variável alterada transforma o desfecho.",
        desc: "Ao ajustar dose, intervalo, infusão, bloqueio de receptores ou hidratação, o motor recalcula curvas farmacocinéticas, compensação ácido-base ou sinais vitais herdados pelo Paciente Digital Contínuo.",
        bullets: [
          "Paciente Digital Contínuo integra 5 simuladores de Fisiologia na mesma sessão",
          "Paciente-IA por Voz responde à anamnese falada e avalia em rubrica 0–100",
          "Oráculo assume papel de Preceptor (One-Minute Preceptor) diante de erros",
        ],
        metricLabel: "CATEGORIAS DE SIMULAÇÃO",
        metricValue: "14 áreas da saúde",
      },
      {
        id: "act-3",
        index: "ATO 03",
        tag: "RESULTADO · AVALIAÇÃO AUDITÁVEL",
        title: "Decisão documentada, feedback explicável e certificado verificável.",
        desc: "O desempenho da turma vira gráfico radar, alertas precoces de risco (sem caixa-preta), Trilha de Raciocínio Explicável baseada em Pendleton/R2C2/Mini-CEX e Certificado OSCE com código público de validação.",
        bullets: [
          "Sinal de risco automático por queda de nota, abandono ou desvio de tempo",
          "Certificado OSCE em PDF + validação pública em /verificar-certificado/",
          "Mapa de Competências por recência com Créditos de Educação Continuada",
        ],
        metricLabel: "RASTREABILIDADE PEDAGÓGICA",
        metricValue: "100% auditável",
      },
    ],
  },
  pillars: {
    eyebrow: "ECOSSISTEMA VERIFICADO",
    title: "Seis verticais integradas para ensino e prática em saúde.",
    subtitle:
      "Do ciclo básico à preceptoria clínica e gestão no SUS — tudo no mesmo ambiente, com dados reais e sem planilhas paralelas.",
    items: [
      {
        id: "simulators",
        badge: "14 CATEGORIAS",
        count: "111",
        title: "Simuladores Interativos",
        desc: "Farmácia Clínica, Fisiologia, Bioquímica, Farmacologia, Farmacotécnica, Química Farmacêutica, Odonto, Fisio, Nutrição, Genética, Lab Clínico, Docência, FHIR e Assistência Farmacêutica no SUS.",
        tags: ["Motor em tempo real", "Casos IA", "Construtor IA (7 etapas)"],
        accent: "teal",
        to: "/vitrine",
      },
      {
        id: "calculators",
        badge: "OFFLINE PWA",
        count: "34",
        title: "Calculadoras Clínicas",
        desc: "CKD-EPI 2021, Vancomicina AUC/MIC, Wells, qSOFA, MELD/Child-Pugh, Risco CV, Pediatria, Obstetrícia e Oncologia — com modo clínico/educativo, referências e laudo PDF.",
        tags: ["Funciona sem internet", "Exportação PDF", "Histórico"],
        accent: "sky",
        to: "/vitrine",
      },
      {
        id: "labs",
        badge: "FLUXO MODULAR",
        count: "11",
        title: "Bancadas de Laboratório",
        desc: "Desenvolvimento de Fármacos, Microbiologia, Toxicologia, Farmacogenômica, Estabilidade, CQ, Epidemiologia, Biotecnologia, Forense e Modelagem Molecular em 4 módulos + mini-relatório.",
        tags: ["4 etapas encadeadas", "Mini-relatório PDF", "Salas Virtuais"],
        accent: "violet",
        to: "/vitrine",
      },
      {
        id: "rooms",
        badge: "TEMPO REAL",
        count: "PIN",
        title: "Salas Virtuais & OSCE",
        desc: "Roteiros multi-estações, trabalho em grupo (Líder ou TBL), Caso em Equipe multiprofissional ao vivo com intercorrências, Analytics com radar e Certificado OSCE verificável.",
        tags: ["Zero login p/ aluno", "Caso em Equipe", "Sinal de risco"],
        accent: "amber",
        to: "/planos",
      },
      {
        id: "ai-3d",
        badge: "IA + ANATOMIA 3D",
        count: "3D + IA",
        title: "Paciente-IA por Voz & MedView 3D",
        desc: "Conduza anamnese falada com avaliação por rubrica, explore modelos 3D em 6 especialidades cirúrgicas/anatômicas e conte com o Oráculo Preceptor e Feedback explicável.",
        tags: ["Anamnese por voz", "6 áreas 3D", "Oráculo Preceptor"],
        accent: "violet",
        to: "/docs",
      },
      {
        id: "gamification",
        badge: "ENGAJAMENTO",
        count: "20+",
        title: "Jogos, Competências & Créditos",
        desc: "Mais de 20 jogos clínicos (Código Azul, Detetive Toxicológico, Milionário da Farmacologia), Mapa de Competências ponderado por recência e Créditos verificáveis por trilha.",
        tags: ["20+ jogos", "Mapa de Competências", "Marketplace validado"],
        accent: "teal",
        to: "/vitrine",
      },
    ],
    spotlight: {
      eyebrow: "PROVA REAL DO MOTOR · SIMULADOR TDM (VANCOMICINA)",
      title: "Ajuste a posologia e observe a janela terapêutica reagir.",
      subtitle:
        "Modelo farmacocinético de 1 compartimento baseado nas diretrizes IDSA/ASHP 2020 (alvo AUC₂₄/MIC entre 400 e 600 mg·h/L para MIC = 1 mg/L). Teste perfis clínicos reais abaixo.",
      presetsLabel: "Perfis clínicos de teste",
      doseLabel: "Dose por infusão",
      intervalLabel: "Intervalo posológico (τ)",
      clcrLabel: "Clearance de Creatinina (ClCr)",
      targetLegend: "Faixa alvo IDSA (AUC₂₄/MIC 400–600)",
      ctaText: "Criar conta e abrir o Simulador TDM completo",
      disclaimer: "Modelo educativo simplificado para demonstração da plataforma; decisões assistenciais exigem validação clínica completa.",
      presets: [
        {
          id: "normal",
          label: "Adulto · Renal Normal",
          summary: "70 kg · ClCr 95 mL/min",
          doseMg: 1000,
          intervalH: 12,
          clcr: 95,
          weightKg: 70,
        },
        {
          id: "drc",
          label: "Idoso · DRC Estágio 3",
          summary: "68 kg · ClCr 42 mL/min",
          doseMg: 1000,
          intervalH: 12,
          clcr: 42,
          weightKg: 68,
        },
        {
          id: "sepse",
          label: "UTI · Clearance Aumentado",
          summary: "82 kg · ClCr 135 mL/min",
          doseMg: 1000,
          intervalH: 12,
          clcr: 135,
          weightKg: 82,
        },
      ],
      status: {
        sub: {
          label: "Subterapêutico (< 400)",
          action: "Risco de falha terapêutica — considere elevar a dose ou reduzir o intervalo.",
        },
        target: {
          label: "Alvo IDSA Atingido (400–600)",
          action: "Exposição eficaz com menor risco nefrotóxico — manter esquema e monitorar.",
        },
        toxic: {
          label: "Supraterapêutico (> 600)",
          action: "Risco elevado de nefrotoxicidade — reduzir dose ou estender o intervalo (ex.: q18h–q24h).",
        },
      },
    },
  },
  playground: {
    eyebrow: "PLAYGROUND INTERATIVO DO PRODUTO",
    title: "Teste três módulos reais antes mesmo de criar sua conta.",
    subtitle:
      "Alterne entre cálculo farmacocinético, simulação multiprofissional em Sala Virtual ao vivo e anamnese por voz com exportação FHIR.",
    tabs: [
      { id: "pk", label: "Calculadoras & PK", badge: "IDSA 2020" },
      { id: "team", label: "Caso em Equipe (Ao Vivo)", badge: "UTI · SEPSE" },
      { id: "voice", label: "Paciente-IA & FHIR R4", badge: "VOZ + JSON" },
    ],
    pk: {
      title: "Simulação Rápida: Vancomicina AUC₂₄/MIC + Cockcroft-Gault",
      desc: "Selecione um perfil clínico e veja clearance estimado, meia-vida (t½), AUC₂₄/MIC e conduta estruturada.",
      presets: [
        {
          id: "p1",
          name: "Pneumonia nosocomial (UTI)",
          detail: "M, 58 anos, 76 kg, Cr 0,9 mg/dL · 1000 mg q12h",
          age: 58,
          weight: 76,
          scr: 0.9,
          sex: "m",
          dose: 1000,
          tau: 12,
        },
        {
          id: "p2",
          name: "Bacteremia em idosa com DRC",
          detail: "F, 76 anos, 62 kg, Cr 1,6 mg/dL · 1000 mg q12h",
          age: 76,
          weight: 62,
          scr: 1.6,
          sex: "f",
          dose: 1000,
          tau: 12,
        },
        {
          id: "p3",
          name: "Adulto jovem com hiperfiltração",
          detail: "M, 31 anos, 88 kg, Cr 0,7 mg/dL · 1500 mg q12h",
          age: 31,
          weight: 88,
          scr: 0.7,
          sex: "m",
          dose: 1500,
          tau: 12,
        },
      ],
      labels: {
        clcr: "ClCr (Cockcroft-Gault)",
        halfLife: "Meia-vida estimada (t½)",
        aucMic: "AUC₂₄ / MIC (MIC = 1)",
        status: "Classificação",
        conduct: "Conduta sugerida",
      },
    },
    team: {
      title: "Linha do Tempo Compartilhada — Sepse Grave na Admissão da UTI",
      desc: "Médico, farmacêutico e enfermagem atuam simultaneamente enquanto o professor injeta intercorrências ao vivo.",
      caseTitle: "Sala PIN #482910 · Equipe Alfa (3 papéis online)",
      replay: "Reiniciar sessão",
      pause: "Pausar",
      play: "Continuar",
      intercurrenceBadge: "INTERCORRÊNCIA INJETADA PELO DOCENTE",
      rubricTitle: "Rubrica ao vivo da equipe",
      events: [
        {
          time: "00:08",
          role: "Enfermagem",
          roleColor: "sky",
          action: "Coleta 2 pares de hemoculturas e lactato arterial (4,2 mmol/L); punciona 2 acessos calibrosos.",
          impact: "Bundle da 1ª hora iniciado sem atraso ao antimicrobiano.",
        },
        {
          time: "00:19",
          role: "Medicina",
          roleColor: "violet",
          action: "Prescreve expansão com cristaloide balanceado 30 mL/kg e solicita cobertura empírica para foco pulmonar.",
          impact: "PAM sobe de 58 para 63 mmHg; ainda requer suporte vasopressor.",
        },
        {
          time: "00:31",
          role: "Farmácia Clínica",
          roleColor: "teal",
          action: "Ajusta dose de ataque de Vancomicina (25 mg/kg) + Piperacilina-tazobactam em infusão estendida; valida compatibilidade em Y.",
          impact: "Tempo porta-antibiótico: 31 min. Incompatibilidade evitada.",
        },
        {
          time: "00:44",
          role: "Docente (Ao vivo)",
          roleColor: "amber",
          action: "Injeta intercorrência: PAM cai para 54 mmHg após reposição volêmica e débito urinário cai para 15 mL/h.",
          impact: "Equipe aciona noradrenalina titulada e registra decisão coordenada.",
          isIntercurrence: true,
        },
      ],
      rubric: [
        { label: "Bundle 1ª hora (Sepse-3)", target: 96 },
        { label: "Segurança medicamentosa", target: 94 },
        { label: "Comunicação interprofissional", target: 91 },
      ],
    },
    voice: {
      title: "Anamnese por Voz + Interoperabilidade Prontuário FHIR R4",
      desc: "Pratique entrevista clínica falada com rubrica automática ou inspecione como os dados clínicos trafegam como recursos FHIR reais.",
      patientLabel: "Caso: Dispneia progressiva e tosse noturna · Avaliação por Rubrica",
      audioLabel: "Prévia da resposta clínica narrada",
      playAudio: "Ouvir prévia",
      pauseAudio: "Pausar áudio",
      viewTranscript: "Transcrição & Rubrica",
      viewFhir: "Ver como FHIR R4",
      rubricBadge: "Rubrica de Anamnese · 92/100",
      turns: [
        {
          speaker: "student",
          text: "“Há quanto tempo começou a falta de ar e você percebe piora à noite ou após esforço?”",
          tag: "Investigação de sintomas · +25 pts",
        },
        {
          speaker: "patient",
          text: "“Começou há umas três semanas, doutor. À noite eu acordo chiando e preciso usar a bombinha de alívio quase todo dia.”",
        },
        {
          speaker: "student",
          text: "“Você usa alguma medicação de controle diário ou teve exposição recente a poeira, mofo ou AINEs?”",
          tag: "Histórico terapêutico e gatilhos · +30 pts",
        },
      ],
      fhirCaption: "Recurso Observation + MedicationRequest gerado no simulador de Informática em Saúde",
    },
  },
  bento: {
    eyebrow: "FLUXOS EM MOVIMENTO",
    title: "Quatro engrenagens que diferenciam a plataforma.",
    subtitle:
      "Cada cartão exibe a lógica real da interface — e transita automaticamente para clipes gravados da plataforma assim que publicados.",
    cards: [
      {
        id: "sim-engine",
        eyebrow: "FISIOLOGIA CONTÍNUA",
        title: "Paciente Digital Contínuo entre 5 simuladores",
        desc: "Alterou o tônus simpático no SNA? A Depuração Renal, o Equilíbrio Ácido-Base e a Eletrofisiologia herdam os novos vitais na mesma sessão.",
        metric: "SNA → Renal → Ácido-Base → Glicemia → Cardíaco",
        accent: "teal",
      },
      {
        id: "virtual-room",
        eyebrow: "ANALYTICS & OSCE",
        title: "Detecção precoce de risco e Certificado OSCE",
        desc: "Identifique alunos com queda de rendimento ou abandono, gere feedback explicável (Pendleton/R2C2) e emita certificados com validação pública.",
        metric: "Radar por competência · /verificar-certificado/",
        accent: "amber",
      },
      {
        id: "lab-bench",
        eyebrow: "11 BANCADAS MODULARES",
        title: "Experimentos encadeados com mini-relatório PDF",
        desc: "As escolhas do Módulo 1 condicionam os dados dos Módulos 2 a 4, culminando em hipótese, conclusão e relatório científico exportável.",
        metric: "4 módulos sequenciais + PDF + Salas Virtuais",
        accent: "sky",
      },
      {
        id: "ai-voice-fhir",
        eyebrow: "CONSTRUTOR IA & FHIR",
        title: "Crie simuladores com IA e explore dados FHIR R4",
        desc: "Descreva o objetivo pedagógico: a IA seleciona skills clínicas, monta até 7 etapas com sliders reativos e passa por auditoria automática de qualidade.",
        metric: "13 skills clínicas · Painel de modelo reativo",
        accent: "violet",
      },
    ],
  },
  workflow: {
    eyebrow: "ARQUITETURA DO APRENDIZADO",
    title: "Do caso clínico ao certificado verificável em um fluxo contínuo.",
    subtitle:
      "Clique ou passe o mouse sobre qualquer nó do ecossistema para inspecionar como cada camada se conecta.",
    inspectHint: "Selecione um nó para inspecionar",
    nodes: [
      {
        id: "input",
        stage: "01 · ENTRADA",
        label: "Caso / PIN / Prompt IA",
        sublabel: "Sala Virtual ou Estudo Solo",
        detail: "O aluno entra sem login via PIN de 6 dígitos na sala do professor, escolhe um dos 111 simuladores nativos ou gera um novo caso clínico/simulador por IA.",
        metrics: ["PIN 6 dígitos sem conta", "Casos nativos + IA", "Roteiros multi-estações"],
        accent: "amber",
      },
      {
        id: "engine",
        stage: "02 · MOTOR CLÍNICO",
        label: "Simuladores, Calc & Lab",
        sublabel: "111 Sim · 34 Calc · 11 Labs",
        detail: "Motores matemáticos em TypeScript recalculam curvas PK/PD, gasometria, sinais vitais herdados (Paciente Contínuo) e resultados de bancada em tempo real.",
        metrics: ["34 calculadoras offline PWA", "Paciente Contínuo (5 módulos)", "MedView 3D (6 áreas)"],
        accent: "teal",
      },
      {
        id: "mentor",
        stage: "03 · VERIFICAÇÃO",
        label: "Oráculo & Rubricas IA",
        sublabel: "Preceptoria + Auditoria",
        detail: "Diante de uma decisão equivocada, o Oráculo atua como Preceptor de Um Minuto. No Marketplace, toda calculadora publicada passa por auditoria clínica automática.",
        metrics: ["One-Minute Preceptor", "Rubrica 0–100 (Voz)", "Auditoria clínica Marketplace"],
        accent: "violet",
      },
      {
        id: "output",
        stage: "04 · RESULTADO AUDITÁVEL",
        label: "Analytics, Trilha & OSCE",
        sublabel: "PDF & Código Público",
        detail: "Professores recebem radar de competências, alertas de risco e Trilha de Raciocínio Explicável; alunos emitem Certificados OSCE e Créditos verificáveis online.",
        metrics: ["Trilha Pendleton / R2C2", "Sinal de risco por aluno", "Validação pública sem login"],
        accent: "sky",
      },
    ],
  },
  authority: {
    eyebrow: "RIGOR CLÍNICO E PEDAGÓGICO",
    title: "Construído por quem ensina saúde — para quem decide na prática.",
    subtitle:
      "Desenvolvido por Sérgio Araújo (Posologia Produções), o Posologia Clinical Hub une modelos validados pela literatura a transparência pedagógica real.",
    pillars: [
      {
        title: "Referências clínicas explícitas",
        desc: "Equações e condutas ancoradas em KDIGO 2021, IDSA/ASHP 2020, Sepsis-3, GINA, Portaria 344/98 e DCNs, sempre citadas inline.",
      },
      {
        title: "Sem caixa-preta na avaliação",
        desc: "O Mapa de Competências usa média ponderada transparente por recência, e o Feedback de Simulação grava cada critério na Trilha Explicável.",
      },
      {
        title: "Certificados e créditos verificáveis",
        desc: "Qualquer instituição valida autenticidade de certificados OSCE e créditos por trilha via código público, sem precisar criar conta.",
      },
      {
        title: "Feito para sala de aula e plantão",
        desc: "Instale como app (PWA) com 34 calculadoras offline no hospital e conduza turmas inteiras por PIN sem fricção de login.",
      },
    ],
    videoBadge: "APRESENTAÇÃO DO FUNDADOR",
    videoTitle: "Por que construímos o Posologia Clinical Hub",
    videoDuration: "01:10",
    chaptersLabel: "Roteiro interativo da apresentação",
    chapters: [
      {
        time: "00:00",
        title: "O limite das questões de memorização",
        summary: "Por que decorar posologias sem ver o paciente reagir falha na transição da sala de aula para o plantão.",
      },
      {
        time: "00:18",
        title: "Simulação com motor real e Paciente Contínuo",
        summary: "Como 111 simuladores, 34 calculadoras offline e 11 bancadas conectam fisiologia, farmacologia e conduta.",
      },
      {
        time: "00:40",
        title: "Sala Virtual com PIN, Caso em Equipe e OSCE",
        summary: "Como professores orquestram turmas em tempo real com Analytics, sinais de risco e feedback explicável.",
      },
      {
        time: "00:58",
        title: "Comece hoje com seu primeiro caso",
        summary: "Crie sua conta gratuita, teste as calculadoras offline ou entre em uma sala com o PIN da sua disciplina.",
      },
    ],
  },
  finalCta: {
    eyebrow: "PRÓXIMO PASSO",
    title: "Leve simulação clínica real para sua próxima aula ou plantão.",
    subtitle:
      "Comece gratuitamente com acesso às calculadoras clínicas e conheça o ecossistema completo de 111 simuladores, 11 bancadas e Salas Virtuais.",
    primary: "Criar conta gratuita",
    secondary: "Já tenho conta",
    docsLink: "Ler documentação pública",
    plansLink: "Comparar Gratuito vs Premium",
  },
  showreel: {
    title: "Tour pelo Posologia Clinical Hub",
    subtitle: "Veja em 4 capítulos como estudantes, docentes e profissionais usam a plataforma.",
    close: "Fechar",
    play: "Reproduzir",
    pause: "Pausar",
    cta: "Criar conta gratuita",
    chapters: [
      {
        id: "ch1",
        time: "00:00 – 00:12",
        tag: "01 · SIMULADORES PK/PD",
        title: "111 simuladores em 14 áreas com resposta imediata",
        caption: "Ajuste variáveis farmacocinéticas, gasométricas ou terapêuticas e acompanhe gráficos e desfechos reagirem em tempo real — sem perguntas estáticas.",
        highlights: ["Paciente Digital Contínuo (5 módulos)", "Modo Desafio mexe → interpreta → decide", "Construtor IA com 13 skills clínicas"],
      },
      {
        id: "ch2",
        time: "00:12 – 00:24",
        tag: "02 · SALAS VIRTUAIS & OSCE",
        title: "Turmas ao vivo via PIN de 6 dígitos (zero login)",
        caption: "Roteiros multi-estações OSCE, modo TBL, Caso em Equipe multiprofissional com intercorrências ao vivo e Analytics com radar e alertas de risco.",
        highlights: ["Médico + Farmacêutico + Enfermagem ao vivo", "Trilha de Raciocínio Explicável (Pendleton/R2C2)", "Certificado OSCE verificável por código"],
      },
      {
        id: "ch3",
        time: "00:24 – 00:36",
        tag: "03 · CALCULADORAS, LAB & 3D",
        title: "34 calculadoras offline (PWA), 11 bancadas e MedView 3D",
        caption: "Fórmulas validadas com exportação PDF no plantão sem internet, bancadas experimentais modulares e visualização anatômica em 6 especialidades.",
        highlights: ["CKD-EPI 2021, Vancomicina AUC, Wells, MELD", "11 bancadas com 4 etapas + mini-relatório PDF", "MedView 3D + 20+ Jogos Clínicos"],
      },
      {
        id: "ch4",
        time: "00:36 – 00:45",
        tag: "04 · IA PRECEPTORA & FHIR",
        title: "Paciente-IA por Voz, Oráculo Preceptor e Prontuário FHIR",
        caption: "Anamnese falada com nota 0–100 por rubrica, preceptoria socrática após erros e recursos FHIR R4 anotados para ensino de interoperabilidade.",
        highlights: ["Transcrição + rubrica automática de anamnese", "Oráculo em modo One-Minute Preceptor", "Créditos de Educação Continuada verificáveis"],
      },
    ],
  },
};

const en: LandingCopy = {
  ...pt,
  hero: {
    eyebrow: "POSOLOGIA CLINICAL HUB · 111 SIMULATORS · 34 CALCULATORS · 11 LAB BENCHES",
    headlineLine1: "Clinical decisions are trained",
    headlineAccent: "before the real patient.",
    headlineLine2: "",
    subtitle:
      "Real-time pharmacokinetic and physiological simulators, 34 offline-ready validated clinical calculators (PWA), 11 modular virtual lab benches, and PIN-based Virtual Classrooms with live Interprofessional Team Cases and verifiable OSCE Certificates.",
    ctaPrimary: "Create free account",
    ctaDemo: "Watch demo",
    ctaCatalog: "Explore catalog",
    pinTitle: "Join a Virtual Room with PIN",
    pinSubtitle: "No student account required — enter your instructor's 6-digit code.",
    pinBadge: "INSTANT ACCESS",
    pinPlaceholder: "6-digit room PIN",
    pinSubmit: "Join room",
    pinAria: "6-digit virtual room PIN",
    telemetryTag: "REAL-TIME PK/PD ENGINE",
    telemetryTitle: "Vancomycin AUC₂₄/MIC · Continuous Digital Patient · FHIR R4",
    telemetryMeta: "IDSA 2020 · KDIGO 2021 · Sepsis-3 · GINA",
    trustMetrics: [
      { value: "111", label: "Simulators across 14 domains" },
      { value: "34", label: "Offline calculators (PWA)" },
      { value: "11", label: "Virtual Lab Benches" },
      { value: "OSCE", label: "Verifiable certificates" },
    ],
    quickCards: [
      {
        badge: "STUDENTS & RESIDENTS",
        title: "Practice clinical reasoning safely",
        desc: "Manipulate live variables, observe PK/PD responses, and get Socratic preceptorship from Oracle after mistakes.",
        cta: "Start for free",
        to: "/cadastro",
        accent: "teal",
      },
      {
        badge: "FACULTY & EDUCATORS",
        title: "Virtual Rooms, TBL & OSCE",
        desc: "Build multi-station simulations, run live interprofessional team cases, and monitor competency radars and early risk alerts.",
        cta: "View plans",
        to: "/planos",
        accent: "sky",
      },
      {
        badge: "POINT-OF-CARE PRACTICE",
        title: "34 Offline-ready calculators",
        desc: "CKD-EPI 2021, Vancomycin AUC/MIC, Wells, MELD, Pediatrics & Oncology with PDF reports and history.",
        cta: "Browse tools",
        to: "/vitrine",
        accent: "violet",
      },
    ],
  },
  story: {
    eyebrow: "HOW LEARNING HAPPENS",
    title: "Adjust the engine. Interpret the signal. Decide together.",
    subtitle:
      "Every scenario replaces rote memorization with a complete clinical reasoning loop — from parameter manipulation to auditable assessment.",
    acts: [
      {
        id: "act-1",
        index: "ACT 01",
        tag: "INPUT · REAL CLINICAL SCENARIO",
        title: "A living patient, not a static multiple-choice card.",
        desc: "Instructors launch a 6-digit PIN Virtual Room — or learners open native and AI-generated cases with lab work, prescriptions, blood gases, and longitudinal records.",
        bullets: [
          "Student PIN access in seconds with zero account friction",
          "Individual, Group Leader, TBL, or Live Interprofessional Team modes",
          "Longitudinal EHR with real annotated FHIR R4 JSON inspection",
        ],
        metricLabel: "CLASSROOM JOIN TIME",
        metricValue: "< 10 seconds",
      },
      {
        id: "act-2",
        index: "ACT 02",
        tag: "ENGINE · LIVE RESPONSE",
        title: "Every variable you change shifts the clinical outcome.",
        desc: "Modify dose, dosing interval, receptor blockade, or fluid status and watch PK/PD curves, acid-base compensation, and the Continuous Digital Patient respond immediately.",
        bullets: [
          "Continuous Digital Patient links 5 Physiology simulators in one session",
          "Voice AI Patient runs spoken history-taking with 0–100 rubric scoring",
          "Oracle switches to One-Minute Preceptor mode when errors occur",
        ],
        metricLabel: "SIMULATION DOMAINS",
        metricValue: "14 health fields",
      },
      {
        id: "act-3",
        index: "ACT 03",
        tag: "OUTPUT · AUDITABLE DECISION",
        title: "Explainable feedback, analytics, and verifiable credentials.",
        desc: "Cohort performance becomes competency radars, deterministic early-risk badges, Explainable Reasoning Trails (Pendleton/R2C2/Mini-CEX), and publicly verifiable OSCE certificates.",
        bullets: [
          "Automated student risk alerts (score drop, incomplete work, timing outliers)",
          "PDF OSCE Certificate with public verification code",
          "Recency-weighted Competency Map & Continuing Education Credits",
        ],
        metricLabel: "PEDAGOGICAL TRACEABILITY",
        metricValue: "100% auditable",
      },
    ],
  },
  finalCta: {
    eyebrow: "NEXT STEP",
    title: "Bring real clinical simulation to your next class or shift.",
    subtitle:
      "Start free with validated offline clinical calculators and explore 111 simulators, 11 lab benches, and live Virtual Rooms.",
    primary: "Create free account",
    secondary: "Sign in",
    docsLink: "Read public documentation",
    plansLink: "Compare Free vs Premium",
  },
};

const es: LandingCopy = {
  ...pt,
  hero: {
    eyebrow: "POSOLOGIA CLINICAL HUB · 111 SIMULADORES · 34 CALCULADORAS · 11 BANCADAS",
    headlineLine1: "Las decisiones clínicas se entrenan",
    headlineAccent: "antes del paciente real.",
    headlineLine2: "",
    subtitle:
      "Simuladores farmacocinéticos y fisiológicos en tiempo real, 34 calculadoras clínicas validadas sin conexión (PWA), 11 bancadas de laboratorio virtual y Salas Virtuales con PIN, Caso en Equipo en vivo y Certificado OSCE verificable.",
    ctaPrimary: "Crear cuenta gratuita",
    ctaDemo: "Ver demostración",
    ctaCatalog: "Ver catálogo",
    pinTitle: "Entrar a la Sala Virtual con PIN",
    pinSubtitle: "Sin registro para estudiantes — ingresa el código de 6 dígitos del docente.",
    pinBadge: "ACCESO INMEDIATO",
    pinPlaceholder: "PIN de 6 dígitos",
    pinSubmit: "Entrar a la sala",
    pinAria: "PIN de sala virtual de 6 dígitos",
    telemetryTag: "MOTOR PK/PD EN TIEMPO REAL",
    telemetryTitle: "Vancomicina AUC₂₄/MIC · Paciente Continuo · FHIR R4",
    telemetryMeta: "IDSA 2020 · KDIGO 2021 · Sepsis-3 · GINA",
    trustMetrics: [
      { value: "111", label: "Simuladores en 14 áreas" },
      { value: "34", label: "Calculadoras offline (PWA)" },
      { value: "11", label: "Bancadas de Laboratorio" },
      { value: "OSCE", label: "Certificados verificables" },
    ],
    quickCards: [
      {
        badge: "ESTUDIANTES Y RESIDENCIA",
        title: "Practica casos sin riesgo real",
        desc: "Ajusta variables, observa curvas PK/PD y recibe preceptoría del Oráculo tras cada intento.",
        cta: "Empezar gratis",
        to: "/cadastro",
        accent: "teal",
      },
      {
        badge: "DOCENTES Y COORDINADORES",
        title: "Salas Virtuales, TBL y OSCE",
        desc: "Crea guiones multiestación, dirige Casos en Equipo en vivo y monitorea radares de competencias y alertas de riesgo.",
        cta: "Ver planes",
        to: "/planos",
        accent: "sky",
      },
      {
        badge: "PRÁCTICA CLÍNICA",
        title: "34 Calculadoras offline (PWA)",
        desc: "CKD-EPI 2021, Vancomicina AUC/MIC, Wells, MELD, Pediatría y Oncología con reporte PDF.",
        cta: "Explorar vitrina",
        to: "/vitrine",
        accent: "violet",
      },
    ],
  },
  finalCta: {
    eyebrow: "SIGUIENTE PASO",
    title: "Lleva simulación clínica real a tu próxima clase o guardia.",
    subtitle:
      "Empieza gratis con calculadoras clínicas validadas y explora 111 simuladores, 11 bancadas y Salas Virtuales.",
    primary: "Crear cuenta gratuita",
    secondary: "Ya tengo cuenta",
    docsLink: "Leer documentación pública",
    plansLink: "Comparar Gratuito vs Premium",
  },
};

export function getLandingCopy(lang?: string): LandingCopy {
  const code = (lang || "pt").toLowerCase().slice(0, 2);
  if (code === "en") return en;
  if (code === "es") return es;
  return pt;
}
