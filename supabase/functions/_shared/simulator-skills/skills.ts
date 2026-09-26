import type { SimulatorSkill } from "./types.ts";

/**
 * Playbooks por tipo de simulador. Ao criar uma skill nova: (1) `quandoUsar` numa frase (é o que o roteador lê),
 * (2) palavras-chave para o fallback, (3) `exige` só para o que é essencial ao tipo, (4) playbook com estrutura de etapas,
 * regras do domínio, números a calcular antes de escrever e distratores plausíveis. Depois registre em ./index.ts.
 */

const prm: SimulatorSkill = {
  id: "prm-revisao-prescricao",
  nome: "Revisão de prescrição e PRM",
  quandoUsar: "O aluno revisa uma prescrição ou lista de medicamentos de um paciente e identifica problemas relacionados a medicamentos (indicação, efetividade, segurança, adesão, interação, dose).",
  palavrasChave: ["prm", "prescrição", "prescricao", "revisão de prescrição", "polifarmácia", "polifarmacia", "interação", "interacao", "beers", "duplicidade", "reconciliação", "reconciliacao", "mai", "cascata"],
  categoriaSugerida: "Atenção Farmacêutica",
  dificuldadePadrao: "Médio",
  etapas: [3, 4],
  exige: [{ tipos: ["checklist", "radio"], mensagem: "Revisão de prescrição precisa de painel checklist/radio para o aluno marcar os problemas." }],
  playbook: `SKILL: REVISÃO DE PRESCRIÇÃO E PRM
ESTRUTURA SUGERIDA:
1. Caso: info com paciente (idade, peso, função renal/hepática, alergias, comorbidades, sinais vitais, exames) + a prescrição completa (fármaco, dose, via, frequência). Sem apontar os problemas.
2. Triagem: checklist com os itens da prescrição; o aluno marca quais têm problema. Inclua 1-2 itens SEM problema (distrator honesto).
3. Classificação: radio por problema central (indicação, efetividade, segurança, adesão), com 4 alternativas que erram UM aspecto cada (tipo de PRM, causa, fármaco).
4. Conduta: explorer com 2-4 intervenções (ajustar dose, trocar, suspender, monitorar) e o efeito nos marcadores do caso, seguido de radio "qual intervenção e o que comunicar ao prescritor".
REGRAS DO DOMÍNIO:
- Ajuste renal por clearance calculado (Cockcroft-Gault) com os dados do caso; cite o número. Idoso: critérios de Beers/STOPP só se tiver certeza do item.
- Interação: nomeie o mecanismo (CYP, aditiva, absorção) e a consequência clínica mensurável (QTc, K⁺, INR).
- Pelo menos 2 problemas reais e de tipos DIFERENTES; nada de erro de digitação como PRM.
- A conduta é sempre uma recomendação ao prescritor (SBAR/mensagem curta), não uma ordem.
DISTRATORES PLAUSÍVEIS: classificar interação como problema de adesão; ajustar dose sem olhar o clearance; suspender o fármaco certo pelo motivo errado; tratar o efeito adverso com outro fármaco (cascata de prescrição).`,
};

const stewardship: SimulatorSkill = {
  id: "stewardship-antimicrobianos",
  nome: "Stewardship de antimicrobianos",
  quandoUsar: "Caso infeccioso em que o aluno escolhe terapia empírica, pede culturas, interpreta antibiograma e descalona ou ajusta o antimicrobiano ao longo do tempo.",
  palavrasChave: ["antibiótico", "antibiotico", "antimicrobiano", "stewardship", "descalonamento", "cultura", "antibiograma", "sepse", "pneumonia", "itu", "infecção", "infeccao", "mic", "cim"],
  categoriaSugerida: "Stewardship de Antimicrobianos",
  dificuldadePadrao: "Difícil",
  etapas: [3, 5],
  exige: [{ tipos: ["explorer", "modelo", "chart"], mensagem: "Stewardship precisa de um painel em que o aluno compare opções ou veja a evolução (explorer, modelo ou chart)." }],
  playbook: `SKILL: STEWARDSHIP DE ANTIMICROBIANOS
ESTRUTURA SUGERIDA (linha do tempo):
1. Dia 0: info com foco, gravidade (qSOFA/SOFA se sepse), função renal, alergias, uso prévio de antibiótico, colonização por resistentes. radio: terapia empírica adequada ao foco e ao risco de resistência.
2. Culturas e exames: checklist do que coletar ANTES do antibiótico e por quê.
3. Dia 2-3: info com cultura/antibiograma (tabela S/I/R com CIM) e evolução clínica; explorer com 3-4 opções (manter, descalonar, escalonar, suspender) mostrando espectro, custo e risco de ecologia.
4. Duração e desfecho: radio sobre tempo de tratamento e critérios de parada.
REGRAS DO DOMÍNIO:
- Só use combinações patógeno-antibiótico e perfis de resistência realistas (ex.: E. coli ESBL sensível a carbapenêmico; MRSA sensível a vancomicina). Se não tem certeza de uma sensibilidade, não a invente.
- Dose ajustada pela função renal; via e tempo de infusão quando relevante.
- Descalonar = estreitar o espectro guiado pela cultura; nunca "trocar por outro de amplo espectro".
- Nunca peça troca só porque o paciente "ainda tem febre no dia 2" sem ler o antibiograma e o controle do foco.
DISTRATORES PLAUSÍVEIS: manter o carbapenêmico com cultura sensível a cefalosporina; descalonar para fármaco com sensibilidade intermediária; suspender cedo demais em bacteremia por S. aureus; ignorar controle de foco.`,
};

const tdm: SimulatorSkill = {
  id: "tdm-farmacocinetica",
  nome: "TDM e farmacocinética clínica",
  quandoUsar: "Ajuste de dose de fármaco com janela terapêutica estreita a partir de níveis séricos, clearance e parâmetros farmacocinéticos, com curva concentração x tempo.",
  palavrasChave: ["tdm", "nível sérico", "nivel serico", "vale", "pico", "vancomicina", "gentamicina", "fenitoína", "fenitoina", "lítio", "litio", "digoxina", "farmacocinética", "farmacocinetica", "auc", "meia-vida", "clearance", "vd"],
  categoriaSugerida: "Farmacocinética Clínica",
  dificuldadePadrao: "Difícil",
  etapas: [3, 4],
  exige: [{ tipos: ["modelo", "chart"], mensagem: "TDM precisa de curva concentração x tempo (modelo ou chart)." }],
  playbook: `SKILL: TDM E FARMACOCINÉTICA CLÍNICA
ESTRUTURA SUGERIDA:
1. Caso e coleta: info com paciente, função renal (creatinina, clearance), regime atual e HORÁRIO real da coleta. radio: a coleta foi válida (tempo em relação à dose)?
2. Estimativa: painel "modelo" com inputs dose e intervalo e a curva C(t) em forma fechada (monocompartimental: C = (Dose/Vd) × e^(−k×t), com acúmulo no estado de equilíbrio 1/(1−e^(−k×τ))), refLines da janela terapêutica e outputs vale/pico/AUC. Use k = CL/Vd e t½ = 0,693/k calculados com os dados do caso.
3. Decisão: radio sobre novo regime (dose e intervalo) com a leitura do vale, do pico ou da AUC, e o que monitorar.
4. Seguimento: quando repetir o nível (após 4-5 meias-vidas) e o que fazer se a função renal mudar.
REGRAS DO DOMÍNIO:
- Janelas terapêuticas conhecidas apenas se tiver certeza (vancomicina: AUC24 400-600 mg·h/L pelo consenso ASHP/IDSA 2020, ou vale 15-20 mg/L em regimes antigos; gentamicina em dose única diária: nível sérico indetectável antes da próxima dose; fenitoína: cinética não linear, correção pela albumina). Se não sabe, use fármaco fictício claramente rotulado.
- Estado de equilíbrio só após ~4-5 meias-vidas; níveis antes disso não orientam ajuste fino.
- Coleta em horário errado é o erro mais comum: o caso deve ter esse risco.
- Calcule Vd, k, t½ e a concentração prevista com os dados do caso ANTES de escrever a curva e os outputs.
DISTRATORES PLAUSÍVEIS: dobrar a dose (ignora não linearidade); alongar o intervalo sem recalcular o pico; ler vale coletado 2 h após a dose; ajustar pelo nível antes do equilíbrio.`,
};

const acompanhamento: SimulatorSkill = {
  id: "acompanhamento-longitudinal",
  nome: "Acompanhamento farmacoterapêutico longitudinal",
  quandoUsar: "Seguimento de paciente crônico em várias consultas/retornos, com exames que evoluem, adesão, metas terapêuticas e ajustes ao longo do tempo.",
  palavrasChave: ["acompanhamento", "seguimento", "longitudinal", "retorno", "consulta", "hipertensão", "hipertensao", "diabetes", "hba1c", "adesão", "adesao", "metas", "crônico", "cronico", "soap"],
  categoriaSugerida: "Atenção Farmacêutica",
  dificuldadePadrao: "Médio",
  etapas: [3, 5],
  exige: [{ tipos: ["chart", "modelo"], mensagem: "Acompanhamento longitudinal precisa de gráfico de tendência dos exames (chart ou modelo)." }],
  playbook: `SKILL: ACOMPANHAMENTO FARMACOTERAPÊUTICO LONGITUDINAL
ESTRUTURA SUGERIDA (uma etapa por consulta: mês 0, mês 3, mês 6...):
1. Consulta 1: info com queixas, medicamentos (posologia real), exames basais e metas (ex.: PA < 130/80, HbA1c individualizada). radio: principal problema a priorizar.
2. Consulta 2: info com evolução; chart com a tendência dos marcadores (valores fixos, com linha da meta). radio: a evolução mostra falta de efetividade, de adesão ou de segurança? Cite os números.
3. Consulta 3: explorer com 2-4 condutas (reforçar adesão, ajustar dose, trocar, associar) e o efeito esperado nos marcadores.
4. Fechamento: radio sobre plano de monitorização (o que medir, quando) e o que orientar.
REGRAS DO DOMÍNIO:
- A tendência deve ser fisiologicamente plausível (HbA1c leva ~3 meses; PA responde em 2-4 semanas; creatinina/K⁺ 1-2 semanas após IECA/BRA).
- Diferencie falta de efetividade (adesão boa, meta não atingida) de falta de adesão (marcadores acompanham as falhas de retirada) e de RAM (marcador de segurança piora).
- O resultado de uma consulta vira dado da seguinte (a conduta escolhida altera o exame do retorno).
DISTRATORES PLAUSÍVEIS: intensificar dose diante de má adesão; atribuir a piora a "progressão da doença" sem checar dispensação; suspender fármaco eficaz por efeito adverso leve; ignorar interação nova.`,
};

const equipamento: SimulatorSkill = {
  id: "equipamento-bomba-monitor",
  nome: "Equipamento: bomba de infusão e monitor",
  quandoUsar: "O aluno programa ou opera um equipamento (bomba de infusão, monitor, seringa) com display, teclado, alarmes e cálculo de taxa.",
  palavrasChave: ["bomba de infusão", "bomba de infusao", "infusão", "infusao", "monitor", "alarme", "drug library", "ml/h", "gotejamento", "seringa", "equipo", "titulação", "titulacao", "noradrenalina", "heparina"],
  categoriaSugerida: "Emergência",
  dificuldadePadrao: "Médio",
  etapas: [3, 4],
  exige: [{ tipos: ["numeric_keypad", "indicator"], mensagem: "Simulação de equipamento precisa de numeric_keypad (entrada) e/ou indicator (status)." }],
  playbook: `SKILL: EQUIPAMENTO (BOMBA DE INFUSÃO / MONITOR)
ESTRUTURA SUGERIDA:
1. Prescrição: info com o pedido (fármaco, dose por kg/min ou mg/h, diluição padronizada, peso). calculation: converter dose em mL/h passo a passo (dose × peso ÷ concentração), com tolerância.
2. Programação: numeric_keypad com o valor correto (correctValue e tolerance) + indicator com o estado da bomba (infundindo, alarme de oclusão, bateria).
3. Alarme/evento: info + indicator com um alarme ou variação do monitor (PAM, FC, SpO₂); radio sobre a primeira ação segura.
4. Titulação: explorer ou modelo (dose × PAM esperada) e radio sobre o próximo ajuste e a checagem dupla.
REGRAS DO DOMÍNIO:
- Cálculo com unidades explícitas: mg/kg/min → mL/h exige concentração final (mg/mL) e peso; mostre o valor esperado com 1 casa decimal e aceite tolerância de arredondamento.
- Erro clássico do caso: unidades confundidas (mcg × mg), diluição não padronizada, peso errado; inclua um.
- Alarme: primeiro tornar o paciente seguro (pausar/checar via e paciente), depois o equipamento.
- Use doses e diluições de rotina que você conhece; se não conhece a diluição padronizada de um fármaco, use fármaco fictício rotulado como tal.
DISTRATORES PLAUSÍVEIS: silenciar o alarme sem checar o paciente; aumentar a taxa para "compensar" dose perdida; ignorar o volume morto do equipo; programar bolus como taxa contínua.`,
};

const laboratorio: SimulatorSkill = {
  id: "interpretacao-laboratorial",
  nome: "Interpretação laboratorial e ajuste terapêutico",
  quandoUsar: "O aluno interpreta exames (hemograma, gasometria, função renal/hepática, lipídios, coagulação, glicemia) e ajusta fármacos ou doses testando condutas e lendo o efeito nos marcadores.",
  palavrasChave: ["exame", "laboratorial", "hemograma", "gasometria", "creatinina", "hepatograma", "inr", "lipídios", "lipidios", "glicemia", "eletrólitos", "eletrolitos", "potássio", "potassio", "sódio", "sodio", "ajuste de dose", "função renal", "funcao renal"],
  categoriaSugerida: "Farmacologia Clínica",
  dificuldadePadrao: "Médio",
  etapas: [3, 4],
  exige: [{ tipos: ["explorer", "modelo"], mensagem: "Este tipo precisa de explorer/modelo: o aluno testa condutas e vê o efeito nos marcadores." }],
  playbook: `SKILL: INTERPRETAÇÃO LABORATORIAL E AJUSTE TERAPÊUTICO
ESTRUTURA SUGERIDA:
1. Achados: info com exames e limites de referência, sem dar o diagnóstico. radio: o que os números indicam (lesão x função, aguda x crônica, compensado x descompensado).
2. Teste: explorer com 3-5 condutas (fármaco/dose/suspender) e os MESMOS marcadores em todas; baseline antes. Inclua a opção "número bonito" (melhora um marcador sem tratar a causa).
3. Decisão: radio que cita os números do explorer e pede a conduta e o motivo; um colega propõe a conduta tentadora e errada.
4. Seguimento: quando repetir o exame, o que esperar e sinais de alerta.
REGRAS DO DOMÍNIO:
- Diferencie MARCADOR DE LESÃO (transaminases, CPK, troponina) de MARCADOR DE FUNÇÃO (bilirrubina, INR, albumina, creatinina, gasometria).
- Efeitos no explorer devem respeitar a janela de tempo (o marcador muda em dias, não em horas) e a gravidade do caso (o mesmo fármaco age menos quando a causa é outra).
- Limites de referência reais; unidades corretas; escore/fórmula (Child-Pugh, Cockcroft-Gault, ânion gap, correção de cálcio) calculado com os números do caso e citado no feedback.
- O texto do caso traz achados e valores, nunca o diagnóstico.
DISTRATORES PLAUSÍVEIS: tratar o marcador em vez da causa; atribuir o efeito ao órgão errado; ignorar a janela de tempo; usar limiar de outra diretriz.`,
};

const gestao: SimulatorSkill = {
  id: "assistencia-farmaceutica-ciclo",
  nome: "Assistência Farmacêutica: ciclo e gestão da cadeia de suprimentos",
  quandoUsar: "Simulação da gestão de medicamentos no SUS ou em serviços de saúde: seleção (REMUME/RENAME), programação (consumo médio, estoque de segurança), aquisição (licitação, preço), armazenamento (cadeia de frio), distribuição, dispensação, curva ABC/VEN, validade e ruptura.",
  palavrasChave: ["assistência farmacêutica", "assistencia farmaceutica", "cadeia de suprimentos", "logística", "logistica", "estoque", "programação", "programacao", "aquisição", "aquisicao", "licitação", "licitacao", "pregão", "pregao", "rename", "remume", "armazenamento", "distribuição", "distribuicao", "dispensação", "dispensacao", "cmm", "curva abc", "ruptura", "cadeia de frio", "caf", "sus", "gestão", "gestao"],
  categoriaSugerida: "Assistência Farmacêutica",
  dificuldadePadrao: "Médio",
  etapas: [4, 7],
  exige: [{ tipos: ["modelo", "calculation", "explorer"], mensagem: "Gestão de suprimentos precisa de painel que reaja aos parâmetros do aluno (modelo, calculation ou explorer): estoque e custo são números, não texto." }],
  playbook: `SKILL: ASSISTÊNCIA FARMACÊUTICA / CADEIA DE SUPRIMENTOS
Público: estudante de graduação ou recém-formado. O caso é um problema de gestão REAL de um serviço (CAF municipal, farmácia hospitalar, UBS), com números, prazos e restrições, não uma história de paciente. Um município fictício ("Vale do Sol") ajuda a encadear as etapas.
ESTRUTURA SUGERIDA (uma etapa por fase do ciclo pedido, na ordem em que decisões alimentam a seguinte; 4 a 7 etapas):
- SELEÇÃO: info com necessidade da população, orçamento e solicitações de inclusão; explorer com 3-4 solicitações mostrando impacto orçamentário líquido, situação na RENAME, duplicidade de classe e evidência; radio: parecer da comissão (o que entra, o que recusa, o que vira fluxo de exceção).
- PROGRAMAÇÃO: modelo com inputs (CMM, meses de segurança, tempo de reposição, intervalo entre pedidos) e outputs (estoque de segurança, nível máximo, ponto de reposição, quantidade a pedir, cobertura em meses); série de estoque ao longo do tempo com linha de ruptura; radio interpretando ruptura x excesso x validade.
- AQUISIÇÃO: modelo de custo total (preço x quantidade + frete por entrega + manutenção de estoque + perda por vencimento) em função do número de entregas; radio sobre preço de referência (cotações comparáveis, mediana), julgamento de propostas contra o edital e modalidade.
- ARMAZENAMENTO: chart/modelo do registro de temperatura de uma falha de energia; explorer com condutas por lote (liberar, quarentena e consulta, descartar) conforme o dado de estabilidade; radio.
- DISTRIBUIÇÃO: modelo de rateio entre unidades (cobertura em dias = (saldo + recebido) ÷ consumo × 30) com capacidade e limite de risco; radio sobre critério (igualitário x consumo x déficit) e reserva técnica.
- DISPENSAÇÃO: info com a receita (data, itens) e lotes com validade; calculation da quantidade (dose × frequência × dias); radio sobre validade da receita, lote (PVPS/FEFO que cubra o tratamento) e conduta na falta de estoque.
FÓRMULAS DA ÁREA (use exatamente): CMM = média do consumo mensal; CMM corrigido = média de [consumo × 30 ÷ (30 − dias sem estoque)]; estoque de segurança = CMM × meses de segurança; ponto de reposição = CMM × tempo de reposição + estoque de segurança; nível máximo = CMM × (intervalo entre pedidos + tempo de reposição) + estoque de segurança; quantidade a pedir = nível máximo − (estoque + em trânsito); cobertura (meses) = estoque ÷ CMM; classe A/B/C por valor acumulado (~80% / 15% / 5%); impacto líquido de uma troca = usuários × 12 × (custo mensal novo − custo mensal do substituído).
NORMAS QUE VOCÊ PODE CITAR (só estas, sem números de artigo que não tenha certeza): RENAME e Decreto 7.508/2011; Lei 14.133/2021 (licitações; pregão para bens comuns; registro de preços); IN SEGES/ME 65/2021 (pesquisa de preços); RDC 430/2020 (distribuição e armazenagem); RDC 44/2009 (boas práticas farmacêuticas); RDC 471/2021 (antimicrobianos; validade da receita de 10 dias); Portaria SVS/MS 344/98 (controlados); Lei 9.787/1999 (genéricos e intercambialidade); Manual de Rede de Frio do PNI (imunobiológico exposto fora de 2-8 °C: quarentena e avaliação da instância estadual). Nunca invente valor-limite de dispensa de licitação, preço real ou tolerância de estabilidade de um medicamento: use "dado do cenário" ou insulina (fora da refrigeração a até 25 °C por até 28 dias).
REALISMO: preços e quantidades ilustrativos mas plausíveis (avise que são ilustrativos); histórico de consumo com sazonalidade e meses de falta; lotes com validades diferentes; restrições que se chocam (capacidade da câmara x validade x prazo de entrega).
ARMADILHAS PEDAGÓGICAS (use como distratores): média bruta que subestima quem faltou; segurança alta que "resolve" a ruptura mas estoura a câmara ou vence; menor preço de proposta inabilitada; cotação de teto CMED ou compra emergencial no preço de referência; menor custo teórico que não cabe na capacidade; rateio igualitário; curva de temperatura que "voltou ao normal" sem decisão sobre o lote; trocar princípio ativo no balcão; dispensar receita vencida de antimicrobiano.
NÃO FAÇA: pergunta de decoreba de lei; conta que o modelo não mostra; cenário sem restrição real (tudo cabe, ninguém vence, ninguém falta).`,
};

const dispensacao: SimulatorSkill = {
  id: "dispensacao-balcao",
  nome: "Dispensação e atendimento no balcão",
  quandoUsar: "O aluno atende no balcão de uma farmácia (SUS, comunitária ou hospitalar): valida a receita, escolhe o lote, calcula a quantidade, orienta e trata faltas ou situações especiais (controlados, antimicrobianos, substituição).",
  palavrasChave: ["dispensação", "dispensacao", "balcão", "balcao", "receita", "controlado", "344", "antimicrobiano", "substituição", "substituicao", "genérico", "generico", "lote", "orientação ao paciente", "orientacao", "farmácia comunitária", "farmacia comunitaria", "aconselhamento"],
  categoriaSugerida: "Atenção Farmacêutica",
  dificuldadePadrao: "Fácil",
  etapas: [3, 5],
  exige: [{ tipos: ["radio", "checklist", "calculation"], mensagem: "Dispensação precisa de decisões do aluno (radio/checklist) e do cálculo de quantidade (calculation)." }],
  playbook: `SKILL: DISPENSAÇÃO E ATENDIMENTO NO BALCÃO
ESTRUTURA SUGERIDA:
1. Receita: info com a receita como o paciente a apresenta (data de emissão, prescritor, itens, posologia) e o contexto (data de hoje, regra local). checklist: o que validar antes de dispensar (legibilidade, identificação, data/validade, dose, via, duração, interação, duplicidade).
2. Decisão por item: radio com 4 condutas que erram UM aspecto (dispensar, pedir nova receita, contatar o prescritor, orientar retorno).
3. Estoque e lote: info com tabela de lotes (validade, saldo); calculation da quantidade; radio: qual lote (o que vence primeiro ENTRE OS QUE COBREM o tratamento).
4. Orientação e registro: radio/checklist com o que orientar (horários, conservação, interação, o que fazer se esquecer) e o que registrar (inclusive a FALTA de estoque, que entra no cálculo da demanda).
REGRAS DO DOMÍNIO:
- Receita de antimicrobiano: validade de 10 dias a partir da emissão (RDC 471/2021); receita vencida = nova receita, mesmo com estoque e mesmo com urgência.
- Só se troca por genérico/intercambiável do MESMO princípio ativo (Lei 9.787/1999); outro fármaco é decisão do prescritor. Falta de estoque: registrar a falta e contatar o prescritor, não improvisar.
- Controlados (Portaria 344/98): use a lista/notificação corretas somente se tiver certeza; caso contrário, mantenha o caso em medicamentos de receita simples e antimicrobianos.
- Quantidade = dose por tomada × vezes ao dia × dias; uso contínuo segue o protocolo local (declare-o no caso).
- Lote: PVPS/FEFO, mas a validade tem de cobrir o período de uso do paciente.
DISTRATORES PLAUSÍVEIS: dispensar receita vencida "porque o paciente está doente"; trocar por fármaco parecido; escolher o lote de validade mais longa "para não sobrar vencido"; dispensar metade e mandar voltar; não registrar a falta.`,
};

const calculo: SimulatorSkill = {
  id: "calculo-farmaceutico",
  nome: "Cálculos farmacêuticos e preparo",
  quandoUsar: "O foco é calcular corretamente: doses por peso ou superfície corporal, diluições, concentrações, reconstituição, velocidade de infusão, insulina, ajustes por função renal, conversões de unidades.",
  palavrasChave: ["cálculo", "calculo", "diluição", "diluicao", "concentração", "concentracao", "reconstituição", "reconstituicao", "mg/kg", "superfície corporal", "superficie corporal", "insulina", "conversão", "conversao", "manipulação", "manipulacao", "preparo", "volume", "gotas", "molaridade", "osmolaridade"],
  categoriaSugerida: "Farmacologia Clínica",
  dificuldadePadrao: "Médio",
  etapas: [3, 5],
  exige: [{ tipos: ["calculation", "modelo", "numeric_keypad"], mensagem: "Simulador de cálculo precisa de painel calculation, modelo ou numeric_keypad." }],
  playbook: `SKILL: CÁLCULOS FARMACÊUTICOS E PREPARO
ESTRUTURA SUGERIDA:
1. Prescrição e dados: info com prescrição, peso/altura/função renal e apresentação disponível (concentração, volume do frasco, diluente).
2. Cálculo guiado: calculation com campos em ORDEM (dose total → volume a retirar → volume final → velocidade), cada um com unidade e tolerância, e formula_hint.
3. Visualização: modelo em que o aluno varia peso, dose ou diluição e vê o volume/velocidade/concentração final e um alerta quando passa do limite seguro (ex.: concentração máxima para via periférica).
4. Verificação: radio "o que está errado nesta prescrição/preparo" com um erro de unidade, de diluição ou de dose máxima.
REGRAS DO DOMÍNIO:
- Sempre com unidades e conversões escritas (mg ↔ mcg, mL ↔ L, UI ↔ mL). Arredonde como a prática (mL com 1-2 casas; comprimidos em frações viáveis).
- Dose máxima e concentração máxima só se você tiver certeza do valor de referência; senão use limite fictício rotulado.
- A resposta certa tem de sair da conta com os números do caso: recalcule antes de escrever correctValue.
DISTRATORES PLAUSÍVEIS: erro de fator 10 ou 1000; esquecer o peso; usar concentração do frasco errado; somar diluente ao volume final; confundir mg/kg/dia com mg/kg/dose.`,
};

const farmacologia: SimulatorSkill = {
  id: "farmacologia-mecanismo",
  nome: "Farmacologia básica: mecanismo e dose-resposta",
  quandoUsar: "Ensino de farmacologia básica ou mecanismos: curvas dose-resposta, agonistas e antagonistas, potência x eficácia, janela terapêutica, cinética de eliminação, receptores.",
  palavrasChave: ["dose-resposta", "dose resposta", "agonista", "antagonista", "receptor", "potência", "potencia", "eficácia", "eficacia", "ec50", "emax", "janela terapêutica", "índice terapêutico", "indice terapeutico", "mecanismo", "cinética de eliminação", "meia-vida", "farmacodinâmica", "farmacodinamica", "biodisponibilidade"],
  categoriaSugerida: "Farmacologia Clínica",
  dificuldadePadrao: "Médio",
  etapas: [3, 4],
  exige: [{ tipos: ["modelo", "explorer", "chart"], mensagem: "Farmacologia básica precisa de painel em que o aluno veja a curva reagir (modelo) ou compare condições (explorer)." }],
  playbook: `SKILL: FARMACOLOGIA BÁSICA (MECANISMO E DOSE-RESPOSTA)
ESTRUTURA SUGERIDA:
1. Situação: info com um fármaco e um problema concreto (um paciente ou experimento), com números (EC50, Emax, dose).
2. Curva: modelo com inputs (dose/concentração, presença de antagonista, afinidade) e a curva E = Emax × C ÷ (EC50 + C) (ou Hill) em forma fechada, com outputs de efeito (%) e ocupação (%). Antagonista competitivo: EC50 aparente = EC50 × (1 + B/Kb).
3. Interpretação: radio que peça a leitura da curva (potência x eficácia, deslocamento para a direita, teto de efeito) aplicada ao paciente.
4. Consequência clínica: radio sobre a conduta (ajustar dose, trocar por agonista parcial, monitorar).
REGRAS DO DOMÍNIO:
- Distinga potência (posição da curva, EC50) de eficácia (altura, Emax). Antagonista competitivo desloca à direita sem baixar o teto; não competitivo baixa o teto.
- Todo número do enunciado sai da fórmula do modelo; escreva as fórmulas no formulaHint.
- Contextualize sempre em um caso (paciente ou serviço); não peça "definição de agonista".
DISTRATORES PLAUSÍVEIS: confundir potência com eficácia; achar que aumentar a dose vence qualquer antagonista não competitivo; ler a dose eficaz como dose segura.`,
};

const comunicacao: SimulatorSkill = {
  id: "comunicacao-anamnese",
  nome: "Comunicação, anamnese e aconselhamento",
  quandoUsar: "Treino de entrevista, anamnese farmacêutica, aconselhamento, adesão ou tomada de decisão compartilhada, em que a qualidade da conduta e da fala do aluno é o que se avalia.",
  palavrasChave: ["anamnese", "entrevista", "aconselhamento", "comunicação", "comunicacao", "adesão", "adesao", "entrevista motivacional", "osce", "empatia", "paciente difícil", "paciente dificil", "orientação", "orientacao", "letramento", "consulta farmacêutica", "consulta farmaceutica"],
  categoriaSugerida: "Atenção Farmacêutica",
  dificuldadePadrao: "Médio",
  etapas: [3, 5],
  exige: [{ tipos: ["radio", "checklist", "text"], mensagem: "Comunicação precisa de painéis de decisão (radio/checklist) ou resposta escrita." }],
  playbook: `SKILL: COMUNICAÇÃO, ANAMNESE E ACONSELHAMENTO
ESTRUTURA SUGERIDA:
1. Cena: info com o paciente (falas literais curtas, contexto, o que ele diz e o que NÃO diz).
2. Coleta: checklist das perguntas que revelam o problema (uso real do medicamento, o que o paciente entende, barreiras, automedicação, fitoterápicos), incluindo 1-2 perguntas que não agregam.
3. Resposta: radio com 4 falas do farmacêutico que erram UM aspecto (jargão, julgamento, ordem, fechar cedo demais, dar alta carga de informação).
4. Plano: radio/text sobre o que combinar com o paciente (meta, lembrete, contato com o prescritor) e como checar entendimento (teach-back).
REGRAS DO DOMÍNIO:
- O comportamento certo é observável: pergunta aberta antes de fechada, validar a emoção, uma ideia por vez, checar entendimento, respeitar autonomia.
- O caso tem informação escondida que só aparece se o aluno perguntar bem (adesão parcial por custo, medo de efeito, crença).
- O paciente não é caricatura; a barreira é plausível (custo, rotina de trabalho, letramento).
DISTRATORES PLAUSÍVEIS: orientar antes de escutar; culpar o paciente; despejar todas as orientações de uma vez; prometer desfecho; ignorar a preocupação real.`,
};

const farmacovigilancia: SimulatorSkill = {
  id: "farmacovigilancia-rams",
  nome: "Farmacovigilância e reações adversas",
  quandoUsar: "Investigação de suspeita de reação adversa: causalidade (Naranjo/OMS), gravidade, evitabilidade, conduta com o medicamento suspeito e notificação.",
  palavrasChave: ["reação adversa", "reacao adversa", "ram", "farmacovigilância", "farmacovigilancia", "naranjo", "notificação", "notificacao", "causalidade", "evento adverso", "rechallenge", "dechallenge", "alergia", "anafilaxia", "hepatotoxicidade", "stevens", "dress"],
  categoriaSugerida: "Farmacologia Clínica",
  dificuldadePadrao: "Médio",
  etapas: [3, 4],
  exige: [{ tipos: ["radio", "checklist", "calculation", "modelo"], mensagem: "Farmacovigilância precisa de decisões do aluno (causalidade, conduta, notificação)." }],
  playbook: `SKILL: FARMACOVIGILÂNCIA E REAÇÕES ADVERSAS
ESTRUTURA SUGERIDA:
1. Evento: info com a cronologia (início do fármaco, do sintoma, resposta à suspensão), medicamentos em uso, exames.
2. Causalidade: modelo ou calculation do escore de Naranjo com os itens do caso (cada resposta soma pontos) e classificação (improvável/possível/provável/definida) calculada pelo próprio escore.
3. Conduta: explorer com opções (suspender, reduzir, manter e monitorar, trocar) e o efeito esperado no marcador; radio sobre a decisão e o que informar ao paciente.
4. Notificação: radio/checklist sobre o que notificar (sistema nacional de notificação da Anvisa/VigiMed), com que dados e por quê.
REGRAS DO DOMÍNIO:
- Use a cronologia como eixo (relação temporal plausível, dechallenge, rechallenge só se seguro).
- Diferencie reação do tipo A (previsível, dose) de tipo B (idiossincrática); alergia grave contraindica reexposição.
- Notificação é dever profissional mesmo na suspeita; não exige certeza.
DISTRATORES PLAUSÍVEIS: descartar a RAM porque "não está na bula"; reexpor ao fármaco para "confirmar"; notificar só se grave e definida; culpar o último medicamento iniciado sem olhar a cronologia.`,
};

const oncologia: SimulatorSkill = {
  id: "oncologia-protocolos",
  nome: "Oncologia: protocolos, doses e toxicidade",
  quandoUsar: "Validação de protocolo de quimioterapia ou terapia-alvo: cálculo de dose por superfície corporal, ajuste por toxicidade e função orgão-específica, interações e liberação de ciclo.",
  palavrasChave: ["quimioterapia", "oncologia", "antineoplásico", "antineoplasico", "protocolo", "carboplatina", "calvert", "superfície corporal", "neutropenia", "ciclo", "tki", "cumulativa", "antraciclina", "g-csf"],
  categoriaSugerida: "Oncologia",
  dificuldadePadrao: "Difícil",
  etapas: [3, 5],
  exige: [{ tipos: ["calculation", "modelo"], mensagem: "Oncologia precisa do cálculo de dose (calculation ou modelo)." }],
  playbook: `SKILL: ONCOLOGIA (PROTOCOLOS, DOSES E TOXICIDADE)
ESTRUTURA SUGERIDA:
1. Prescrição e paciente: info com protocolo, peso, altura, creatinina, exames do dia. calculation: superfície corporal (Mosteller = √(altura × peso ÷ 3600)) e dose por m².
2. Ajuste: modelo com inputs (clearance, AUC alvo) e a fórmula de Calvert (dose = AUC × (TFG + 25)), com teto de TFG de 125 mL/min; outputs de dose e alerta.
3. Liberação do ciclo: explorer com exames (neutrófilos, plaquetas, bilirrubina) x condutas (liberar, atrasar, reduzir, G-CSF) e radio interpretando os limiares do protocolo do caso (declare os limiares no caso).
4. Segurança: radio sobre interação, dose cumulativa ou ordem de infusão.
REGRAS DO DOMÍNIO:
- Fórmulas: Mosteller e Calvert como acima; qualquer limiar de liberação (neutrófilos, plaquetas) deve vir DECLARADO no enunciado como o critério do protocolo do caso, sem afirmar que é universal.
- Nunca invente dose de protocolo real; use doses e esquemas que você conhece ou declare o esquema como fictício.
- A decisão final é humana e multiprofissional: o simulador treina a triagem, não substitui a validação.
DISTRATORES PLAUSÍVEIS: usar peso real e não a TFG limitada em Calvert; ignorar a redução por toxicidade do ciclo anterior; liberar com neutropenia por "o paciente está bem"; somar doses cumulativas errado.`,
};

export const TODAS_AS_SKILLS: SimulatorSkill[] = [
  prm, stewardship, tdm, acompanhamento, equipamento, laboratorio, gestao, dispensacao, calculo, farmacologia, comunicacao, farmacovigilancia, oncologia,
];
