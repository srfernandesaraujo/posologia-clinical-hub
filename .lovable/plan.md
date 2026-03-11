

# Melhorias nos Simuladores: "Como Usar", Feedback Final, Fluxo Pedagógico e Infraestrutura

## Resumo

Três frentes de trabalho: (1) botão "Como Usar" em todos os simuladores, (2) reescrita dos 8 simuladores de odontologia com melhorias de fluxo pedagógico + feedback final de decisões, (3) adição de infraestrutura faltante (botão voltar, geração IA, system prompts) nos simuladores de odontologia e fisioterapia.

---

## 1. Componente "Como Usar" (Shared)

Criar `src/components/simulators/SimulatorHowToUse.tsx` — um Dialog com ícone `HelpCircle` que recebe `title` e `steps: string[]` como props. Cada simulador passará suas instruções específicas. O botão ficará ao lado do título do simulador.

---

## 2. Melhorias de Fluxo nos 8 Simuladores de Odontologia

### 2.1 Odontograma Interativo
- **M1**: Adicionar uma "radiografia SVG" esquemática do paciente ao selecionar, para que o aluno veja os achados esperados e possa marcar no odontograma baseado no RX
- **M3**: Transformar de simples confirmação para quiz — o sistema mostra os achados e o aluno escolhe o diagnóstico ICDAS correto para cada lesão (múltipla escolha). Pontuação por acerto
- **M4**: Após confirmar, exibir painel de feedback comparando escolhas do aluno vs plano ideal (verde = acertou, vermelho = errou/faltou), com explicação clínica

### 2.2 Anatomia Dental (Endodontia)
- Após M4 (confirmar restauração), exibir painel de feedback com prognóstico calculado, adequação da terapia à lesão, e consequências clínicas da escolha (ex: "Pulpotomia em necrose = falha terapêutica")

### 2.3 Periodontograma
- Feedback final após M4: comparar tratamento escolhido vs recomendação baseada no estágio/grau. Mostrar consequências (ex: "RAR isolada em Estágio IV = insuficiente")

### 2.4 Anestesiologia
- **M3**: Peso do paciente fixo (determinado pelo caso). O aluno escolhe anestésico e calcula dose para aquele peso
- **M4**: Complicação apresentada pelo sistema (baseada nas escolhas — ex: vasoconstritor em cardiopata = risco intravascular). O aluno escolhe a conduta para resolver

### 2.5 Cefalometria
- Feedback final após M4: projeção de perfil pós-tratamento e avaliação da adequação (ex: "Classe III com ANB -4 → alinhadores insuficientes, cirurgia ortognática indicada")

### 2.6 Radiografia
- **M3**: Em vez de apenas marcar patologias na lista, o aluno deve classificar cada patologia (tipo: radiolúcida/radiopaca/mista + diagnóstico diferencial com múltipla escolha). Pontuação por acurácia
- Feedback final após M4: pontuação do laudo + lista do que faltou identificar

### 2.7 Farmacologia Odontológica
- **M3**: Após ver os gauges de risco, o aluno decide se mantém ou altera a prescrição (trocar fármaco, ajustar dose, remover). O sistema recalcula os riscos em tempo real
- **M4**: Em vez de apenas validar, o sistema apresenta um cenário clínico resultante (ex: "Ibuprofeno em nefropata → piora de TFG em 72h") e o aluno deve confirmar ou alterar
- Feedback final: resumo do que aconteceria com o paciente baseado nas decisões

### 2.8 Cirurgia e Exodontia
- **M3**: Complicação determinada pelo sistema baseada nas escolhas de M2 (ex: não fez osteotomia em Classe III → fratura mandibular). O aluno escolhe a conduta para resolver
- **M4**: Feedback do protocolo medicamentoso vs ideal
- Feedback final: resumo cirúrgico com avaliação

---

## 3. Painel de Feedback Final (Componente Compartilhado)

Criar `src/components/simulators/SimulatorFeedback.tsx` — exibe ao final de todos os módulos (antes do relatório):
- Score geral (0-100%) com gauge visual
- Lista de decisões tomadas vs decisões ideais (verde/vermelho)
- Texto narrativo: "O que aconteceria com o paciente" baseado nas decisões
- Badge de classificação: "Excelente", "Bom", "Precisa melhorar"

Este componente será usado em todos os 8 simuladores de odontologia.

---

## 4. Infraestrutura Faltante (Odontologia + Fisioterapia)

### 4.1 Botão Voltar
Adicionar botão `ArrowLeft` que navega para `/simuladores` em todos os 16 simuladores (8 odonto + 8 fisio).

### 4.2 System Prompts
Adicionar entries em `src/data/nativeSystemPrompts.ts` para os 16 simuladores (8 odonto + 8 fisio) com prompts que descrevem cada simulador e seus módulos.

### 4.3 AdminPromptViewer
Importar e exibir `AdminPromptViewer` no header de cada um dos 16 simuladores.

### 4.4 Geração de Casos com IA
Integrar o padrão existente (useSimulatorCases, NativeCaseCard, AICaseCard, botão "Gerar Caso com IA") nos 16 simuladores. Cada simulador terá:
- Tela de seleção de caso (built-in + AI) como dashboard inicial
- Botão voltar para `/simuladores`
- Botão "Gerar Caso com IA" (admin only)

Isso requer refatorar cada simulador para ter dois estados: (1) dashboard de casos e (2) simulação ativa com os módulos M1-M5.

---

## Arquivos Afetados

**Novos** (2):
- `src/components/simulators/SimulatorHowToUse.tsx`
- `src/components/simulators/SimulatorFeedback.tsx`

**Reescrita** (8 odontologia):
- `src/pages/simuladores/odontologia/SimuladorOdontograma.tsx`
- `src/pages/simuladores/odontologia/SimuladorAnatomiaEndodontia.tsx`
- `src/pages/simuladores/odontologia/SimuladorPeriodontograma.tsx`
- `src/pages/simuladores/odontologia/SimuladorAnestesiologia.tsx`
- `src/pages/simuladores/odontologia/SimuladorCefalometria.tsx`
- `src/pages/simuladores/odontologia/SimuladorRadiografia.tsx`
- `src/pages/simuladores/odontologia/SimuladorFarmacologiaOdonto.tsx`
- `src/pages/simuladores/odontologia/SimuladorCirurgiaExodontia.tsx`

**Reescrita** (8 fisioterapia — adicionar voltar, prompts, IA, "como usar"):
- `src/pages/simuladores/fisioterapia/SimuladorGoniometria.tsx`
- `src/pages/simuladores/fisioterapia/SimuladorAvaliacaoPostural.tsx`
- `src/pages/simuladores/fisioterapia/SimuladorForcaMuscular.tsx`
- `src/pages/simuladores/fisioterapia/SimuladorDermatomos.tsx`
- `src/pages/simuladores/fisioterapia/SimuladorRespiratorio.tsx`
- `src/pages/simuladores/fisioterapia/SimuladorEletroterapia.tsx`
- `src/pages/simuladores/fisioterapia/SimuladorTestesOrtopedicos.tsx`
- `src/pages/simuladores/fisioterapia/SimuladorBerg.tsx`

**Edição** (1):
- `src/data/nativeSystemPrompts.ts` — 16 novos prompts

