// Caso-piloto do item 04 do roadmap (Salas Virtuais ao vivo — Caso em Equipe).
// Conteúdo hardcoded para o MVP: não há editor de casos em equipe para o professor ainda,
// só este cenário fixo — mesmo padrão de escopo do item 09 (pipeline novo, 1 cenário pra validar
// antes de generalizar). Cada ação marcada `ideal: true` é o que conta como acerto no relatório
// gerado ao encerrar a sessão (ver SalaAoVivo.tsx `endSession`).

export type LiveTeamRole = "medico" | "farmaceutico" | "enfermagem";

export interface LiveTeamAction {
  id: string;
  label: string;
  category: string;
  ideal: boolean;
  explanation: string;
}

export interface LiveTeamIntercorrencia {
  id: string;
  label: string;
  description: string;
}

export interface LiveTeamCase {
  key: string;
  title: string;
  patient: { name: string; age: number; sex: string; context: string };
  scenario: string;
  roles: { role: LiveTeamRole; label: string; icon: string }[];
  actionsByRole: Record<LiveTeamRole, LiveTeamAction[]>;
  intercorrencias: LiveTeamIntercorrencia[];
}

const sepseGrave: LiveTeamCase = {
  key: "sepse-grave-uti",
  title: "Sepse grave — admissão na UTI",
  patient: {
    name: "J.A.S.",
    age: 62,
    sex: "Masculino",
    context: "Diabético, admitido via emergência com febre, confusão mental e hipotensão há 2h. Foco infeccioso ainda não definido.",
  },
  scenario:
    "PA 84/52 mmHg, FC 118 bpm, Tax 38.9°C, SpO2 92% em ar ambiente, diurese não avaliada. Equipe multiprofissional precisa agir nos primeiros 60 minutos.",
  roles: [
    { role: "medico", label: "Médico", icon: "🩺" },
    { role: "farmaceutico", label: "Farmacêutico", icon: "💊" },
    { role: "enfermagem", label: "Enfermagem", icon: "🩹" },
  ],
  actionsByRole: {
    medico: [
      { id: "med-1", label: "Solicitar hemocultura + lactato antes de iniciar antibiótico", category: "Diagnóstico", ideal: true, explanation: "Coletar culturas antes do antibiótico evita mascarar o agente, sem atrasar o tratamento além do tolerável." },
      { id: "med-2", label: "Iniciar antibioticoterapia empírica de amplo espectro em até 1h", category: "Tratamento", ideal: true, explanation: "Cada hora de atraso no antibiótico em sepse aumenta mortalidade — janela de 1h é padrão (Surviving Sepsis Campaign)." },
      { id: "med-3", label: "Prescrever cristaloide 30 mL/kg em bólus", category: "Tratamento", ideal: true, explanation: "Ressuscitação volêmica precoce é pilar do pacote de 1ª hora em sepse com hipotensão." },
      { id: "med-4", label: "Aguardar resultado dos exames antes de qualquer conduta", category: "Tratamento", ideal: false, explanation: "Atrasar a conduta esperando exames em paciente hipotenso piora o desfecho — a hora de ouro é agora." },
      { id: "med-5", label: "Prescrever apenas antitérmico e reavaliar em 6h", category: "Tratamento", ideal: false, explanation: "Subestima a gravidade — critérios de sepse grave com hipotensão exigem conduta imediata, não expectante." },
    ],
    farmaceutico: [
      { id: "farm-1", label: "Validar a dose do antibiótico pela função renal do paciente", category: "Farmacovigilância", ideal: true, explanation: "Ajuste renal evita toxicidade e subdose em paciente com potencial disfunção de órgão pela sepse." },
      { id: "farm-2", label: "Checar interação entre o antibiótico prescrito e as medicações em uso", category: "Farmacovigilância", ideal: true, explanation: "Revisão de interações antes da dispensação é a barreira clássica de segurança do farmacêutico clínico." },
      { id: "farm-3", label: "Sugerir otimização do tempo de infusão para maximizar tempo acima da CIM", category: "Farmacocinética", ideal: true, explanation: "Infusão estendida/otimizada melhora eficácia de beta-lactâmicos em sepse — intervenção farmacocinética de alto impacto." },
      { id: "farm-4", label: "Dispensar o antibiótico sem checar a função renal", category: "Farmacovigilância", ideal: false, explanation: "Pula a barreira de segurança justamente no paciente com maior risco de lesão renal aguda." },
    ],
    enfermagem: [
      { id: "enf-1", label: "Puncionar acesso venoso calibroso e coletar hemocultura antes do antibiótico", category: "Execução", ideal: true, explanation: "Sequência correta: acesso + coleta de cultura primeiro, sem atrasar o antibiótico além do necessário." },
      { id: "enf-2", label: "Iniciar monitorização contínua de PA e diurese", category: "Monitorização", ideal: true, explanation: "Monitorização horária é essencial para avaliar resposta à ressuscitação volêmica." },
      { id: "enf-3", label: "Comunicar a equipe imediatamente se a PA sistólica cair abaixo de 90 mmHg", category: "Comunicação", ideal: true, explanation: "Fechamento do ciclo de segurança — sinal de alerta precisa chegar rápido a quem decide a conduta." },
      { id: "enf-4", label: "Administrar o antibiótico antes de coletar a hemocultura", category: "Execução", ideal: false, explanation: "Inverte a sequência recomendada e pode comprometer o resultado da cultura." },
    ],
  },
  intercorrencias: [
    { id: "int-1", label: "Hipotensão refratária", description: "Após o bólus inicial, a PA permanece em 78/50 mmHg — a equipe precisa decidir o próximo passo." },
    { id: "int-2", label: "Lactato elevado", description: "Resultado retorna: lactato 4.8 mmol/L, confirmando hipoperfusão tecidual." },
    { id: "int-3", label: "Família chega ao setor", description: "Familiares chegam pedindo informações — a comunicação da equipe está sendo observada." },
  ],
};

export const LIVE_TEAM_CASES: Record<string, LiveTeamCase> = {
  [sepseGrave.key]: sepseGrave,
};

export function getLiveTeamCase(key: string): LiveTeamCase | undefined {
  return LIVE_TEAM_CASES[key];
}
