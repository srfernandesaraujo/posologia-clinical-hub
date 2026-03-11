

# Melhorias nos 8 Simuladores de Fisioterapia + Infraestrutura

## Resumo

Reescrever os 8 simuladores de fisioterapia para: (1) melhorar módulos onde o aluno apenas confirma sem decidir, (2) adicionar feedback final com desfecho clínico, (3) adicionar botão voltar, Como Usar, AdminPromptViewer, geração de casos IA, e (4) adicionar system prompts.

---

## Melhorias por Simulador

### 1. Goniometria Articular
- **M3**: Em vez de apenas ver a tabela e confirmar, o aluno deve **classificar o déficit** (leve/moderado/grave) para cada movimento. O sistema compara com a classificação real e pontua acertos
- **Feedback final**: Desfecho clínico baseado nas técnicas escolhidas vs déficits encontrados

### 2. Avaliação Postural
- **M2**: Em vez de marcar todos os 8 pontos (todos alunos fariam igual), o sistema apresenta **12 pontos possíveis** (8 corretos + 4 distratores). O aluno decide quais são relevantes baseado no caso de M1
- **M3**: Em vez de apenas ver desvios, o aluno deve **selecionar entre opções de diagnóstico** (múltipla escolha com distratores). Ex: "Qual o desvio principal?" com 4 opções
- **Feedback final**: Previsão de evolução postural baseada no programa de correção escolhido

### 3. Força Muscular (Oxford/MRC)
- **M2**: O aluno clica no músculo, simula o teste (animação), e o **sistema determina a força medida** baseado no caso clínico (não o aluno que escolhe o grau)
- **M3**: Em vez de apenas ver o mapa, o aluno deve **identificar o padrão neurológico** (múltipla escolha: hemiparesia, tetraparesia, padrão radicular, etc.) e o **nível da lesão**
- **Feedback final**: Prognóstico funcional baseado no programa de fortalecimento

### 4. Dermátomos
- **M2**: Ao clicar no dermátomo, a sensibilidade é **medida automaticamente pelo sistema** (simulando o teste real). O aluno observa o resultado mas não o define
- **M3**: Em vez de confirmar correlação, o aluno deve **escolher o nível lesional** e o **padrão** (central vs periférico) em múltipla escolha
- **M4**: O aluno deve **decidir a classificação ASIA** (para medulares) ou o **diagnóstico diferencial** entre opções com distratores
- **Feedback final**: Prognóstico neurológico e funcional

### 5. Fisioterapia Respiratória
- **M4**: Em vez de apenas clicar "Nova Ausculta" e ver que melhorou, o aluno deve **decidir a conduta seguinte**: manter técnicas, trocar, ajustar parâmetros de ventilação, ou encaminhar para intubação. O sistema apresenta a reavaliação com resultado variável baseado nas técnicas de M3
- **Feedback final**: Evolução respiratória do paciente

### 6. Eletroterapia
- Fluxo atual está bom, apenas adicionar **feedback final** com avaliação da adequação dos parâmetros e desfecho (analgesia alcançada? contração efetiva? edema reduzido?)

### 7. Testes Ortopédicos
- **M3**: Em vez de mostrar o diagnóstico pronto, apresentar **4-5 opções de diagnóstico** para o aluno escolher baseado nos testes positivos/negativos de M2
- **Feedback final**: Prognóstico de reabilitação

### 8. Escala de Berg
- **M3**: Em vez de mostrar score + risco prontos, o aluno vê apenas o **gráfico radar** e deve **decidir o score total** (campo numérico) e a **classificação de risco** (alto/moderado/baixo). O sistema compara com os valores reais
- **Feedback final**: Risco de queda projetado e evolução funcional

---

## Infraestrutura (todos os 8 simuladores)

1. **Botão Voltar** (`ArrowLeft` → `/simuladores`)
2. **SimulatorHowToUse** com steps específicos por simulador
3. **AdminPromptViewer** com prompt do simulador
4. **Dashboard de casos** (NativeCaseCard + geração IA com `useSimulatorCases`)
5. **SimulatorFeedback** antes do LabReportPanel
6. **16 system prompts** em `nativeSystemPrompts.ts` (8 fisio + os 8 odonto que podem estar faltando)

---

## Arquivos Afetados

**Reescrita** (8):
- `src/pages/simuladores/fisioterapia/SimuladorGoniometria.tsx`
- `src/pages/simuladores/fisioterapia/SimuladorAvaliacaoPostural.tsx`
- `src/pages/simuladores/fisioterapia/SimuladorForcaMuscular.tsx`
- `src/pages/simuladores/fisioterapia/SimuladorDermatomos.tsx`
- `src/pages/simuladores/fisioterapia/SimuladorRespiratorio.tsx`
- `src/pages/simuladores/fisioterapia/SimuladorEletroterapia.tsx`
- `src/pages/simuladores/fisioterapia/SimuladorTestesOrtopedicos.tsx`
- `src/pages/simuladores/fisioterapia/SimuladorBerg.tsx`

**Edição** (1):
- `src/data/nativeSystemPrompts.ts` — 16 novos prompts (8 odonto + 8 fisio)

**Correção** (4 odonto com erro de build):
- Corrigir uso de `AICaseCard` nos 4 simuladores de odontologia (adicionar props faltantes `onDelete`, `onUpdate`, `onCopy`, `availableTargets`)

