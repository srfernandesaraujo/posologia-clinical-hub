import { useTranslation } from "react-i18next";
import { Brain, Home, FlaskConical, Search, Crosshair, Award, Link, Building, Lock, Activity, Syringe, Droplet, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState } from "react";
import RpgTccGame from "@/components/games/RpgTccGame";
import VilaSaudeGame from "@/components/games/VilaSaudeGame";
import LaboratorioInteracoesGame from "@/components/games/LaboratorioInteracoesGame";
import DetetiveHistoricoGame from "@/components/games/DetetiveHistoricoGame";
import ResseccaoOncologicaGame from "@/components/games/ResseccaoOncologicaGame";
import MilionarioFarmaGame from "@/components/games/MilionarioFarmaGame";
import DominoClinicoGame from "@/components/games/DominoClinicoGame";
import CarreiraClinicaGame from "@/components/games/CarreiraClinicaGame";
import PlantaoNoturnoGame from "@/components/games/PlantaoNoturnoGame";
import GestorClearanceGame from "@/components/games/GestorClearanceGame";
import AlertaVermelhoGame from "@/components/games/AlertaVermelhoGame";
import JanelaTerapeuticaGame from "@/components/games/JanelaTerapeuticaGame";
import LabirintoHemogramaGame from "@/components/games/LabirintoHemogramaGame";
import BolsaMetabolicaGame from "@/components/games/BolsaMetabolicaGame";
import GameHeader from "@/components/games/GameHeader";
import GameRanking from "@/components/games/GameRanking";
import { Button } from "@/components/ui/button";

const games = [
  {
    id: "rpg-tcc",
    title: "RPG Clínico — TCC",
    description: "Combata monstros de distorções cognitivas usando lógica e pensamento racional.",
    icon: Brain,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    badge: "7 batalhas",
  },
  {
    id: "vila-saude",
    title: "Vila da Saúde",
    description: "Construa e melhore uma cidade ao registar que tomou os seus remédios.",
    icon: Home,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    badge: "6 construções",
  },
  {
    id: "laboratorio",
    title: "Laboratório de Interações",
    description: "Combine medicamentos, alimentos e fitoterápicos para descobrir interações.",
    icon: FlaskConical,
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
    badge: "6 substâncias",
  },
  {
    id: "detetive",
    title: "Detetive do Histórico",
    description: "Organize a sua anamnese farmacoterapêutica passo a passo antes da consulta.",
    icon: Search,
    iconBg: "bg-stone-100",
    iconColor: "text-stone-600",
    badge: "4 pistas",
  },
  {
    id: "resseccao",
    title: "Ressecção Oncológica",
    description: "Elimine células tumorais aplicando terapia alvo neste puzzle Resta 1.",
    icon: Crosshair,
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
    badge: "Puzzle",
  },
  {
    id: "milionario",
    title: "Milionário da Farmacologia",
    description: "Responda perguntas de farmacologia clínica e suba na carreira hospitalar.",
    icon: Award,
    iconBg: "bg-yellow-100",
    iconColor: "text-yellow-600",
    badge: "5 níveis",
  },
  {
    id: "domino",
    title: "Dominó Clínico",
    description: "Conecte peças de doenças, fármacos e efeitos adversos numa cascata prescritiva.",
    icon: Link,
    iconBg: "bg-stone-100",
    iconColor: "text-stone-600",
    badge: "7 peças",
  },
  {
    id: "carreira",
    title: "Carreira Clínica",
    description: "Gerencie um consultório num tabuleiro estilo Banco Imobiliário.",
    icon: Building,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    badge: "16 casas",
  },
  {
    id: "plantao",
    title: "O Plantão Noturno",
    description: "Escape Room clínico: encontre pistas e salve o paciente antes do tempo acabar.",
    icon: Lock,
    iconBg: "bg-zinc-200",
    iconColor: "text-zinc-700",
    badge: "Escape Room",
  },
  {
    id: "clearance",
    title: "Gestor de Clearance",
    description: "Ajuste doses de Vancomicina monitorizando a função renal do paciente.",
    icon: Activity,
    iconBg: "bg-teal-100",
    iconColor: "text-teal-600",
    badge: "7 dias",
  },
  {
    id: "alerta-vermelho",
    title: "Alerta Vermelho",
    description: "Investigue qual medicamento causa os sintomas do paciente.",
    icon: Syringe,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    badge: "Investigação",
  },
  {
    id: "janela",
    title: "A Janela Terapêutica",
    description: "Ajuste a dose de Varfarina para manter o INR na zona segura.",
    icon: Activity,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    badge: "10 dias",
  },
  {
    id: "labirinto",
    title: "Labirinto do Hemograma",
    description: "Navegue pela árvore de decisão para diagnosticar o tipo de anemia.",
    icon: Droplet,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    badge: "3 passos",
  },
  {
    id: "bolsa",
    title: "Bolsa de Valores Metabólica",
    description: "Transforme exames laboratoriais em ações de saúde estilo trading.",
    icon: TrendingUp,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    badge: "Portfólio",
  },
];

const gameComponents: Record<string, {
  component: React.FC<{ customData?: any }>;
  title: string;
  subtitle: string;
  howToPlay: string;
  aiPrompt: string;
}> = {
  "rpg-tcc": {
    component: RpgTccGame,
    title: "RPG de Texto Clínico — TCC",
    subtitle: "Combata distorções cognitivas usando pensamento racional.",
    howToPlay: `🎮 RPG Clínico — Terapia Cognitivo-Comportamental

📋 Objetivo: Derrote 7 monstros que representam distorções cognitivas usando pensamento racional.

🕹️ Como jogar:
1. Cada monstro apresenta uma situação distorcida
2. Escolha a resposta mais racional entre as opções
3. Resposta correta: derrota o monstro e ganha 50 XP
4. Resposta errada: perde 20 HP de vida
5. Se o HP chegar a 0, é Game Over

💡 Dica: Identifique qual distorção cognitiva está em jogo (leitura mental, catastrofização, generalização, etc.) e escolha o pensamento mais equilibrado.`,
    aiPrompt: `Gere um array JSON "battles" com 7 novas batalhas de RPG de TCC (Terapia Cognitivo-Comportamental).
Cada batalha deve ter: id (number), monsterName (string criativo), monsterDescription (string - cenário cotidiano com distorção cognitiva entre aspas), options (array de 3 strings - respostas possíveis), correctOptionIndex (0-2).
Distorções a cobrir: leitura mental, catastrofização, generalização excessiva, pensamento "tem que", tudo-ou-nada, personalização, filtro negativo.
Use cenários do dia-a-dia (trabalho, relacionamentos, saúde, estudos). Apenas UMA opção deve ser racional.
Retorne: { "battles": [...] }`,
  },
  "vila-saude": {
    component: VilaSaudeGame,
    title: "Vila da Saúde",
    subtitle: "Tome os seus remédios e construa a sua vila!",
    howToPlay: `🏘️ Vila da Saúde — Adesão Medicamentosa

📋 Objetivo: Tome os seus medicamentos diários e use as moedas ganhas para construir e melhorar a sua vila.

🕹️ Como jogar:
1. Marque cada medicamento como tomado para ganhar moedas
2. Use as moedas para melhorar as construções da vila
3. Cada construção tem 3-4 níveis de evolução
4. Ao atingir o nível máximo, ganha confetes!

💡 Dica: Priorize melhorar as construções mais baratas primeiro para ver progresso rápido.`,
    aiPrompt: `Gere novos dados para o jogo Vila da Saúde com tema de adesão medicamentosa.
Crie: 
- "medications": array de 3 medicamentos com { id (number), name (string - nome real de medicamento), time (string HH:MM), taken (false), reward (number 15-30) }
- "buildings": array de 6 construções com { id (number), name (string), type (string - um de: HeartPulse, TreePine, Home, Dumbbell, Apple, Flame), level (1), maxLevel (3 ou 4), upgradeCost (number 30-100), description (string curta), levelNames (array de strings - nomes criativos para cada nível) }
Use medicamentos diferentes dos originais (ex: Atenolol, Sinvastatina, Levotiroxina, AAS).
Use construções com tema de saúde comunitária diferente.
Retorne: { "medications": [...], "buildings": [...] }`,
  },
  "laboratorio": {
    component: LaboratorioInteracoesGame,
    title: "Laboratório de Interações",
    subtitle: "Descubra interações entre medicamentos, alimentos e fitoterápicos.",
    howToPlay: `🧪 Laboratório de Interações

📋 Objetivo: Descubra todas as interações perigosas combinando substâncias no misturador.

🕹️ Como jogar:
1. Selecione 2 substâncias do inventário
2. Clique em "MISTURAR" para ver o resultado
3. Interações perigosas valem mais pontos
4. Combinações seguras valem 10 pontos
5. Descubra todas as 3 interações perigosas!

💡 Dica: Pense em interações farmacocinéticas (enzimas CYP) e farmacodinâmicas (efeitos aditivos/antagônicos).`,
    aiPrompt: `Gere novos dados para o Laboratório de Interações Medicamentosas.
Crie:
- "items": array de 6 substâncias com { id (string M1-M4, A1, F1), name (string), type ("Pill" ou "Leaf"), category (string), color (string classe Tailwind como "bg-blue-100 text-blue-700") }
- "interactions": objeto onde chaves são "ID1-ID2" (IDs ordenados) e valores são { type ("danger" ou "safe"), title (string), description (string com mecanismo farmacológico), points (number 50-75 para danger, 10 para safe) }
Inclua exatamente 3 interações perigosas reais e documentadas. Use medicamentos e substâncias diferentes dos originais.
Exemplo de interações: Metformina+Álcool, IECA+Espironolactona, ISRS+Tramadol, Lítio+AINE, etc.
Retorne: { "items": [...], "interactions": {...} }`,
  },
  "detetive": {
    component: DetetiveHistoricoGame,
    title: "Detetive do Histórico Clínico",
    subtitle: "Construa o seu dossiê farmacoterapêutico passo a passo.",
    howToPlay: `🔍 Detetive do Histórico Clínico

📋 Objetivo: Complete uma anamnese farmacoterapêutica completa, passo a passo.

🕹️ Como jogar:
1. Responda a cada pergunta sobre o histórico do paciente
2. Para perguntas Sim/Não, detalhe se responder Sim
3. Avance pelas 4 etapas da investigação
4. No final, revise o dossiê completo

💡 Dica: Seja detalhado nas respostas. Um bom histórico farmacoterapêutico é a base de qualquer cuidado farmacêutico.`,
    aiPrompt: `Gere novas perguntas para o Detetive do Histórico Clínico farmacoterapêutico.
Crie "questions": array de 5 perguntas com { id (number), title (string criativo), description (string - pergunta detalhada), type ("text" ou "boolean-text"), icon (string - um de: Search, Pill, Leaf, AlertTriangle, FileText), booleanLabel (string, apenas se type="boolean-text"), textPlaceholder (string exemplo) }
Cubra aspectos diferentes: queixa principal, medicamentos de uso contínuo, automedicação, alergias, hábitos de vida (álcool, tabaco), e histórico familiar.
Retorne: { "questions": [...] }`,
  },
  "resseccao": {
    component: ResseccaoOncologicaGame,
    title: "Ressecção Oncológica: Terapia Alvo",
    subtitle: "Elimine todas as células tumorais até restar apenas uma.",
    howToPlay: `🎯 Ressecção Oncológica — Terapia Alvo (Resta 1)

📋 Objetivo: Elimine células tumorais até restar apenas UMA célula saudável no tabuleiro.

🕹️ Como jogar:
1. Clique numa célula tumoral (vermelha) para selecioná-la
2. Clique numa posição vazia (escura) para saltar
3. O salto deve ser sobre outra célula tumoral (ela será eliminada)
4. Apenas saltos horizontais e verticais são permitidos
5. Vence quando restar apenas 1 célula

💡 Dica: Planeje várias jogadas à frente. Comece pelas bordas e trabalhe em direção ao centro.`,
    aiPrompt: `Gere uma nova configuração de tabuleiro para o jogo Resta 1 Oncológico.
Crie "board": array 7x7 onde cada célula é null (fora do tabuleiro), 0 (vazio) ou 1 (célula tumoral).
O tabuleiro deve ter formato de cruz (como o Resta 1 clássico) mas com a posição vazia inicial em local DIFERENTE do centro.
Pode ser: canto superior, lateral, ou qualquer posição que ainda permita solução.
Retorne: { "board": [[...], ...] }`,
  },
  "milionario": {
    component: MilionarioFarmaGame,
    title: "Milionário da Farmacologia",
    subtitle: "Responda perguntas clínicas e alcance o nível de Chefe de Clínica!",
    howToPlay: `💰 Milionário da Farmacologia

📋 Objetivo: Responda 5 perguntas de dificuldade crescente e alcance o nível de Chefe de Clínica.

🕹️ Como jogar:
1. Leia a pergunta e selecione uma opção
2. Clique em "Confirmar Decisão Clínica"
3. Ajudas disponíveis (uma vez cada):
   📚 Revisão de Literatura: elimina 2 opções erradas
   📞 Ligar para o Preceptor: dica sobre a resposta
   👥 Reunião Clínica: mostra % de votos

💡 Dica: Use as ajudas nas perguntas mais difíceis. Guarde-as para os níveis finais.`,
    aiPrompt: `Gere 5 novas perguntas de farmacologia clínica para o jogo Milionário.
Crie "questions": array de 5 perguntas com dificuldade crescente.
Cada pergunta: { id (number 1-5), levelName (string: "Interno", "Residente Júnior", "Residente Sênior", "Especialista", "Chefe de Clínica"), question (string - cenário clínico real), options (array de 4 strings), correctIndex (0-3), hint (string - dica do preceptor), audienceVotes (array de 4 numbers que somam ~100) }
Temas: farmacocinética, interações, efeitos adversos, protocolos, mecanismos de ação. Use cenários clínicos realistas.
Retorne: { "questions": [...] }`,
  },
  "domino": {
    component: DominoClinicoGame,
    title: "Dominó Clínico",
    subtitle: "Desvende a cascata prescritiva conectando peças clínicas.",
    howToPlay: `🁡 Dominó Clínico — Cascata Prescritiva

📋 Objetivo: Conecte todas as peças do dominó criando uma cascata prescritiva completa.

🕹️ Como jogar:
1. O tabuleiro começa com uma peça (doença → fármaco)
2. Clique numa peça da sua mão para jogá-la
3. A peça deve conectar: lado esquerdo com lado direito
4. Doença ↔ Fármaco ↔ Efeito Adverso ↔ Novo Fármaco
5. Se não encaixar, receberá um aviso

💡 Dica: Observe as pontas abertas do tabuleiro e procure peças que conectem fármaco → efeito adverso ou vice-versa.`,
    aiPrompt: `Gere uma nova cascata prescritiva para o Dominó Clínico.
Crie "tiles": array de 7 peças de dominó com { id (number 1-7), left (string), right (string) }.
A cascata deve seguir a lógica: Doença → Fármaco → Efeito Adverso → Novo Fármaco → Novo Efeito → ...
Use uma cascata prescritiva DIFERENTE da original (Hipertensão→Amlodipina→Edema).
Exemplos: Diabetes→Metformina→Diarreia→Loperamida, ou Depressão→Fluoxetina→Insônia→Zolpidem.
Também forneça "diseases" e "drugs" (arrays de strings para colorir corretamente).
Retorne: { "tiles": [...], "diseases": [...], "drugs": [...] }`,
  },
  "carreira": {
    component: CarreiraClinicaGame,
    title: "Carreira Clínica",
    subtitle: "Gerencie as finanças do seu consultório neste tabuleiro clínico.",
    howToPlay: `🏥 Carreira Clínica — Tabuleiro Clínico

📋 Objetivo: Gerencie o seu consultório sem ir à falência. Compre propriedades e acumule riqueza.

🕹️ Como jogar:
1. Lance os dados para mover o peão pelo tabuleiro
2. Ao passar pela PARTIDA, recebe $200
3. Em propriedades livres: pode comprar para investir
4. Cofre Clínico: sorte ou revés financeiro
5. Imposto/Auditoria: paga taxas obrigatórias
6. Conselho de Ética: perde 1 turno
7. Se o saldo ficar negativo, é falência!

💡 Dica: Compre propriedades estrategicamente. Guarde reserva para impostos inesperados.`,
    aiPrompt: `Gere um novo tabuleiro para o jogo Carreira Clínica (estilo Banco Imobiliário).
Crie:
- "board": array de 16 espaços com { id (0-15), name (string), type (um de: "go", "property", "chest", "tax", "jail", "free", "go-to-jail"), cost (number, apenas property), rent (number, apenas property), color (string classe Tailwind como "bg-blue-500", apenas property) }
- "chestCards": array de 6 cartas com { text (string - evento clínico), amount (number positivo ou negativo) }
Mantenha a estrutura: posição 0=GO, 7=jail, 10=free, 15=go-to-jail. Use temas de gestão hospitalar diferente (ex: telemedicina, saúde mental, pediatria).
Retorne: { "board": [...], "chestCards": [...] }`,
  },
  "plantao": {
    component: PlantaoNoturnoGame,
    title: "O Plantão Noturno",
    subtitle: "Encontre pistas, resolva puzzles e salve o paciente a tempo.",
    howToPlay: `🔒 O Plantão Noturno — Escape Room Clínico

📋 Objetivo: Encontre o antídoto antes que o tempo acabe (10 minutos).

🕹️ Como jogar:
1. 📋 Leia o Prontuário: identifique a síndrome clínica
2. 📖 Consulte o Livro: encontre dados farmacocinéticos
3. 💻 Desbloqueie o Computador: digite o nome do antídoto
4. 🔐 Abra o Cofre: calcule o código de 4 dígitos

⚠️ Código errado no cofre: -30 segundos de penalidade!

💡 Dica: O código combina dados do livro de bioquímica. Pense em meia-vida e dose.`,
    aiPrompt: `Gere um novo cenário para o Escape Room Clínico "O Plantão Noturno".
Crie um caso com:
- "prontuario": { text (string - sintomas do paciente que apontam para uma intoxicação/overdose específica) }
- "book": { text (string - página de farmacologia com dados numéricos: meia-vida e dose de um frasco) }
- "computerPassword": string (nome do antídoto correto, ex: "FLUMAZENIL", "ATROPINA", "DESFERROXAMINA")
- "computerHint": string (pista revelada após desbloquear o computador)
- "safeCode": string de 4 dígitos (calculável a partir dos dados do livro)
- "safeCodeExplanation": string (como calcular o código)
Use um caso DIFERENTE de overdose de opioides. Ex: intoxicação por benzodiazepínicos, organofosforados, paracetamol, digitálicos.
Retorne: { "prontuario": {...}, "book": {...}, "computerPassword": "...", "computerHint": "...", "safeCode": "...", "safeCodeExplanation": "..." }`,
  },
  "clearance": {
    component: GestorClearanceGame,
    title: "Gestor de Clearance",
    subtitle: "Monitore a função renal e ajuste a dose de Vancomicina em 7 dias.",
    howToPlay: `💉 Gestor de Clearance — Ajuste de Dose Renal

📋 Objetivo: Mantenha o paciente vivo por 7 dias ajustando a dose de Vancomicina conforme a função renal.

🕹️ Como jogar:
1. Observe os exames diários (Creatinina e TFG)
2. Escolha a dose adequada para o dia
3. Clique em "Avançar" para ver o impacto
4. Monitore as barras de Toxicidade e Eficácia

⚠️ Toxicidade = 100: nefrotoxicidade fatal
⚠️ Eficácia = 0: infeção generalizada

💡 Dica: Quando a TFG cair abaixo de 50, reduza a dose para 500mg a cada 24h. Nunca suspenda por muito tempo ou a infeção volta.`,
    aiPrompt: `Gere novos dados para o Gestor de Clearance com um cenário clínico diferente.
Crie:
- "patientInfo": { name (string), age (number), drug (string - fármaco nefrotóxico diferente, ex: "Gentamicina IV", "Anfotericina B", "Cisplatina") }
- "labResults": array de 7 objetos com { day (1-7), creatinina (number), tfg (number), alert (string) }. O paciente deve piorar no dia 3-4 e melhorar se dose ajustada.
- "doses": array de 4 strings com opções de dose adequadas ao novo fármaco
Retorne: { "patientInfo": {...}, "labResults": [...], "doses": [...] }`,
  },
  "alerta-vermelho": {
    component: AlertaVermelhoGame,
    title: "Alerta Vermelho: Investigação Toxicológica",
    subtitle: "Descubra qual medicamento está a causar os sintomas do paciente.",
    howToPlay: `🚨 Alerta Vermelho — Investigação Toxicológica

📋 Objetivo: Identifique qual medicamento causa os sintomas e prove com exames laboratoriais.

🕹️ Como jogar:
1. Leia os sintomas do paciente
2. Solicite exames laboratoriais (custo do orçamento)
3. Analise os resultados para encontrar evidências
4. Selecione o medicamento culpado
5. Confirme o diagnóstico

⚠️ Cada exame solicitado reduz a saúde do paciente (-15%)
⚠️ Orçamento limitado: escolha exames estratégicos

💡 Dica: Procure exames com marcador "ALERTA" — são as provas-chave. Não precisa pedir todos os exames.`,
    aiPrompt: `Gere um novo caso para o Alerta Vermelho (investigação toxicológica).
Crie:
- "patientInfo": { name (string), age (number), symptoms (string - sintomas que apontam para reação adversa a medicamento) }
- "currentMeds": array de 3 medicamentos com { id (number 1-3), name (string com dose) }
- "availableTests": array de 4 exames com { id (string T1-T4), name (string), cost (number 15-40), result (string), isKey (boolean - true para no máximo 2 exames) }
- "correctMedId": number (id do medicamento culpado)
O caso deve ser diferente de rabdomiólise. Exemplos: hepatotoxicidade por paracetamol, hipoglicemia por sulfonilureia, sangramento por anticoagulante, síndrome serotoninérgica.
Retorne: { "patientInfo": {...}, "currentMeds": [...], "availableTests": [...], "correctMedId": ... }`,
  },
  "janela": {
    component: JanelaTerapeuticaGame,
    title: "A Janela Terapêutica",
    subtitle: "Ajuste a dose diária de Varfarina para manter o INR na zona segura.",
    howToPlay: `📊 A Janela Terapêutica — Monitorização de INR

📋 Objetivo: Mantenha o INR do paciente entre 2.0 e 3.0 durante 10 dias.

🕹️ Como jogar:
1. Observe o valor atual do INR e o gráfico
2. Escolha a conduta posológica para o dia seguinte:
   ⬆️ Aumentar Dose: INR sobe ~0.6
   ➡️ Manter Dose: INR estável
   ⬇️ Reduzir Dose: INR desce ~0.5
   ⏸️ Suspender: INR desce ~1.2
3. Há variabilidade biológica (±0.2) em cada ajuste

⚠️ INR ≥ 5.0: hemorragia severa (derrota)
⚠️ INR ≤ 1.2 após dia 3: trombose (derrota)

💡 Dica: Mantenha ajustes pequenos. A zona verde (2.0-3.0) é o seu alvo.`,
    aiPrompt: `Gere novos parâmetros para A Janela Terapêutica com um fármaco diferente.
Crie:
- "drugName": string (ex: "Fenitoína", "Lítio", "Digoxina", "Teofilina")
- "parameterName": string (ex: "Nível Sérico", "Concentração Plasmática")
- "unit": string (ex: "mcg/mL", "mEq/L", "ng/mL")
- "targetMin": number (limite inferior da faixa terapêutica)
- "targetMax": number (limite superior da faixa terapêutica)
- "criticalHigh": number (nível tóxico)
- "criticalLow": number (nível subterapêutico)
- "initialValue": number (valor inicial dentro da faixa)
- "maxDays": number (7-12)
- "highLabel": string (ex: "Toxicidade", "Arritmia")
- "lowLabel": string (ex: "Convulsão", "Recidiva")
Retorne: { "drugName": "...", "parameterName": "...", ... }`,
  },
  "labirinto": {
    component: LabirintoHemogramaGame,
    title: "O Labirinto do Hemograma",
    subtitle: "Navegue pela árvore de decisão e diagnostique a anemia.",
    howToPlay: `🩸 O Labirinto do Hemograma

📋 Objetivo: Navegue pela árvore de decisão diagnóstica e identifique o tipo correto de anemia.

🕹️ Como jogar:
1. Leia o dado laboratorial apresentado
2. Escolha o próximo passo diagnóstico correto
3. Resposta correta: avança para o próximo nó
4. Resposta errada: perde 20 pontos (fica no mesmo nó)
5. Chegue ao diagnóstico final com a maior pontuação!

⚠️ Se a pontuação chegar a 0: Game Over

💡 Dica: Siga o algoritmo: Hb baixa → VCM (tamanho) → Exames confirmatórios → Diagnóstico.`,
    aiPrompt: `Gere uma nova árvore de decisão para o Labirinto do Hemograma com um diagnóstico DIFERENTE.
Crie "storyNodes": objeto com nós da árvore de decisão.
Estrutura de cada nó: { id (string), title (string "Passo X: ..."), labData (string com valores de referência), question (string), options: array de 3 opções com { text (string), nextNode (string - "" se erro), isError (boolean) } }
Deve ter: "root" (nó inicial), 2 nós intermediários, e terminar em "victory".
Use um diagnóstico diferente: anemia megaloblástica (B12), anemia hemolítica, anemia aplástica, ou policitemia.
Retorne: { "storyNodes": { "root": {...}, "node2": {...}, "node3": {...} } }`,
  },
  "bolsa": {
    component: BolsaMetabolicaGame,
    title: "Bolsa de Valores Metabólica",
    subtitle: "Os seus exames são ações. Melhore os resultados e ganhe dividendos!",
    howToPlay: `📈 Bolsa de Valores Metabólica

📋 Objetivo: Acompanhe os seus biomarcadores como ações na bolsa e ganhe moedas de saúde.

🕹️ Como jogar:
1. Visualize os 3 biomarcadores (HbA1c, LDL, HDL)
2. Verde com ↗️ = resultado favorável (LUCRO)
3. Vermelho com ↘️ = resultado desfavorável (PREJUÍZO)
4. Clique num card para ver o gráfico de evolução
5. Use "Registar Novos Exames" para simular novos resultados
6. Se bater a meta, ganha 500 moedas em dividendos!

💡 Dica: HbA1c e LDL devem BAIXAR para ser lucro. HDL deve SUBIR.`,
    aiPrompt: `Gere novos biomarcadores para a Bolsa de Valores Metabólica com tema diferente.
Crie:
- "biomarkers": array de 3 biomarcadores com { id (string), name (string), currentValue (number), previousValue (number), target (string como "< X" ou "> X"), unit (string), isHigherBetter (boolean) }
- "historyData": array de 4 semestres com { semester (string "SX YYYY"), [id1] (number), [id2] (number), [id3] (number) }
- "targetLines": objeto { [id]: number } com valor numérico da meta
- "updatedValues": objeto { [id]: number } com novos valores para quando clicar "Registar"
Use biomarcadores diferentes: ex: Triglicerídeos, TSH, Vitamina D, Ácido Úrico, Creatinina, PCR.
Retorne: { "biomarkers": [...], "historyData": [...], "targetLines": {...}, "updatedValues": {...} }`,
  },
};

export default function JogosClinicos() {
  const { t } = useTranslation();
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [aiData, setAiData] = useState<Record<string, any>>({});

  const active = activeGame ? gameComponents[activeGame] : null;

  if (active && activeGame) {
    const GameComponent = active.component;
    const customData = aiData[activeGame] || undefined;
    return (
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" className="mb-4 gap-2" onClick={() => setActiveGame(null)}>
          ← Voltar aos jogos
        </Button>
        <div className="mb-2">
          <h1 className="text-2xl font-bold mb-1">{active.title}</h1>
          <p className="text-muted-foreground">{active.subtitle}</p>
        </div>
        <GameHeader
          howToPlay={active.howToPlay}
          aiPrompt={active.aiPrompt}
          gameId={activeGame}
          onAiUpdate={(data) => setAiData((prev) => ({ ...prev, [activeGame]: data }))}
        />
        <GameComponent key={JSON.stringify(customData)} customData={customData} />
        <GameRanking gameId={activeGame} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t("games.title")}</h1>
        <p className="text-muted-foreground text-lg">{t("games.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => (
          <Card
            key={game.id}
            className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/40"
            onClick={() => setActiveGame(game.id)}
          >
            <CardHeader className="pb-3">
              <div className={`inline-flex rounded-xl ${game.iconBg} p-3 mb-2 w-fit`}>
                <game.icon className={`h-6 w-6 ${game.iconColor}`} />
              </div>
              <CardTitle className="text-lg">{game.title}</CardTitle>
              <CardDescription>{game.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">
                {game.badge}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
