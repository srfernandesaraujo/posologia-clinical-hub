

## Laboratório Virtual de Perícia Forense — Plano de Implementação

### Visão Geral

Criar uma nova bancada **"Perícia Forense"** no hub do Laboratório Virtual, composta por **3 laboratórios interligados** que compartilham um **caso criminal central**. O aluno recebe a cena do crime e amostras coletadas; cada laboratório analisa evidências diferentes, e os resultados convergem para solucionar o caso no final.

### Arquitetura do Fluxo

```text
┌─────────────────────────────────────────────────────────┐
│  CASO CRIMINAL (Painel fixo no topo)                     │
│  Narrativa da cena, vítima, suspeitos, amostras coletadas│
└──────────────────────┬──────────────────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Lab Químico  │ │ Lab Toxicol. │ │ Lab DNA      │
│ Espectrômetro│ │ HPLC         │ │ Eletrofero-  │
│ de Massa     │ │ Cromatograma │ │ grama        │
│ ID substância│ │ ID veneno    │ │ Match alelos │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │               │               │
       └───────────────┼───────────────┘
                       ▼
        ┌──────────────────────────┐
        │ PAINEL DE CONCLUSÃO      │
        │ Cruzar evidências        │
        │ Acusar suspeito          │
        │ Score + LabReportPanel   │
        └──────────────────────────┘
```

### Casos Pré-definidos (6 cenários nativos)

Cada caso define: narrativa, vítima, 3 suspeitos (A/B/C), amostras químicas, matrizes biológicas, perfis de DNA e o culpado correto.

1. **Envenenamento no Jantar** — Estricnina no vinho
2. **Incêndio Criminoso** — Acelerante identificado em resíduos
3. **Overdose Suspeita** — Mistura de substâncias no sangue
4. **Falsificação de Medicamentos** — Comprimido adulterado
5. **Homicídio por Intoxicação Crônica** — Metal pesado em amostras de cabelo
6. **Acidente ou Crime?** — Substância no conteúdo estomacal

### Laboratório 1 — Químico (Espectrômetro de Massa)

- **Painel esquerdo**: Lista de amostras coletadas na cena (ex: "Pó branco", "Líquido inflamável", "Resíduo de tinta")
- **Painel direito**: Interface do Espectrômetro de Massa
  - Selecionar amostra → "Iniciar Análise" → animação de processamento
  - Gráfico Recharts `LineChart` simulando espectro com picos em m/z específicos por substância
  - Card de resultado comparando assinatura com banco de dados → identifica a substância
- **Decisão**: O aluno deve interpretar os picos e confirmar a identificação

### Laboratório 2 — Toxicológico (HPLC)

- **Formulário de preparação**: Selecionar matriz biológica (Sangue/Urina/Conteúdo Estomacal) + reagente de extração
- **Animação**: Barra de progresso simulando corrida cromatográfica
- **Gráfico**: `AreaChart` Recharts — Tempo de Retenção (X) × Absorbância (Y)
- **Mini-game de interpretação**: Ler o pico mais alto → selecionar no dropdown "Biblioteca de Padrões" qual substância corresponde ao tempo de retenção
- **Decisão**: Match correto confirma a substância tóxica

### Laboratório 3 — Análise de DNA (Perfil Genético)

- **Botões**: "Extrair DNA (Cena)" e "Extrair DNA (Suspeitos)"
- **Mesa de Comparação**: Eletroferogramas com barras verticais simulando picos de alelos em loci genéticos (vWA, TH01, TPOX, D13S317, FGA)
- **Layout**: Gráfico da amostra da cena no topo; gráficos dos Suspeitos A, B, C abaixo
- **Interação**: Aluno analisa visualmente os picos coincidentes e clica "Confirmar Match" no suspeito correto
- **Resultado**: "Identidade Confirmada" ou "Exclusão de Autoria"

### Painel de Conclusão Final

- Resumo cruzado das 3 análises (substância identificada + veneno detectado + DNA match)
- Aluno seleciona o suspeito culpado com base nas evidências convergentes
- Score ponderado: Lab Químico (25%) + Lab Toxicológico (30%) + Lab DNA (25%) + Conclusão (20%)
- `LabReportPanel` reutilizado para mini-relatório e exportação/envio VR

### Arquivos a Criar/Editar

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/lab-virtual/BancadaPericiaForense.tsx` | Página principal — orquestra caso, 3 labs e conclusão |
| `src/components/lab-virtual/ForensicCasePanel.tsx` | Painel do caso criminal (narrativa, vítima, suspeitos, amostras) |
| `src/components/lab-virtual/ChemicalLabPanel.tsx` | Lab Químico — espectrômetro de massa + espectro Recharts |
| `src/components/lab-virtual/ToxicologyLabPanel.tsx` | Lab Toxicológico — HPLC + cromatograma + mini-game |
| `src/components/lab-virtual/DNALabPanel.tsx` | Lab DNA — eletroferogramas + comparação de alelos |
| `src/components/lab-virtual/ForensicConclusionPanel.tsx` | Painel de conclusão — cruzamento de evidências + acusação |
| `src/pages/LaboratorioVirtual.tsx` | Adicionar card da bancada Perícia Forense |
| `src/App.tsx` | Adicionar rota `/laboratorio-virtual/pericia-forense` |

### Integração com Salas Virtuais

- Hook `useVirtualRoomCase` para modo VR
- Botão "Enviar Resultados" no `LabReportPanel`
- Decisões estruturadas enviadas ao Analytics (identificação química, match toxicológico, match DNA, acusação final)

### Detalhes Técnicos

- **Estado compartilhado**: O componente pai (`BancadaPericiaForense`) mantém o caso selecionado e distribui dados para os 3 labs. Resultados de cada lab são coletados e passados ao painel de conclusão.
- **Dados estáticos**: Os 6 cenários são objetos TypeScript com espectros, cromatogramas e perfis genéticos pré-calculados — sem necessidade de IA para gerar.
- **Recharts**: `LineChart` para espectro de massa, `AreaChart` para cromatograma HPLC, `BarChart` para eletroferogramas de DNA.
- **Fluxo sequencial**: Labs desbloqueiam progressivamente (Químico → Toxicológico → DNA → Conclusão) via `completedModules`.
- **Score**: Cada lab contribui com pontos por decisões corretas; score final é a média ponderada.

