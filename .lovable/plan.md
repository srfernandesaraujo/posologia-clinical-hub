

# Plano de Implantação: Simuladores de Fisiologia Humana

## Visão Geral

Criação de 10 simuladores nativos de fisiologia humana, seguindo exatamente o padrão de qualidade dos simuladores existentes (Bomba de Infusão, Desmame de Benzo, etc.): casos clínicos built-in, suporte a casos IA, gráficos Recharts interativos, integração com salas virtuais, modo exame e exportação PDF.

## Arquitetura

Cada simulador será um componente React em `src/pages/simuladores/fisiologia/`, registrado como rota protegida em `App.tsx` e listado em `Simuladores.tsx` sob a nova categoria **"Fisiologia Humana"**.

### Padrão de cada simulador:
- Dashboard inicial com casos built-in + botão "Gerar com IA"
- Sliders/controles interativos para manipular variáveis fisiológicas
- Gráficos Recharts em tempo real (LineChart, AreaChart, BarChart)
- Modo educativo com explicações farmacológicas/fisiológicas
- Integração com `useSimulatorCases`, `useVirtualRoomCase`, `ExamBanner`, `ExamFeedbackOverlay`, `AdminCaseActions`
- Exportação PDF com jsPDF

## Implementação por Lotes

### Lote 1 (4 simuladores — sistemas cardiovascular e renal)

1. **SimuladorSNA** (`sna`) — Sistema Nervoso Autônomo
   - Sliders: tônus simpático (0-100%) e parassimpático (0-100%)
   - Outputs em tempo real: FC, PA, diâmetro pupilar, motilidade GI
   - Gráfico temporal mostrando evolução dos parâmetros
   - Casos: bradicardia vagal, tempestade adrenérgica, síncope vasovagal

2. **SimuladorEletrofisiologiaCardiaca** (`eletrofisiologia-cardiaca`) — Canais Iônicos
   - Gráfico do potencial de ação (fases 0-4) com Recharts
   - Sliders para condutância de Na⁺, K⁺, Ca²⁺
   - Toggle entre miócito ventricular e célula nodal SA
   - Simulação de bloqueios (antiarrítmicos classe I-IV)

3. **SimuladorDepuracaoRenal** (`depuracao-renal`) — TFG e Néfron
   - Controles: PA aferente/eferente, hidratação, permeabilidade tubular
   - Outputs: TFG, volume urina, reabsorção Na⁺/glicose
   - Gráfico de barras empilhadas (filtrado vs reabsorvido vs excretado)

4. **SimuladorEquilibrioAcidoBase** (`equilibrio-acido-base`) — Gasometria
   - Botões para injetar distúrbios (cetoacidose, DPOC, vômitos, diarreia)
   - Sliders: frequência respiratória e excreção renal de HCO₃⁻
   - Display de pH, pCO₂, HCO₃⁻, BE com classificação automática
   - Diagrama de Davenport interativo

### Lote 2 (3 simuladores — endócrino e metabólico)

5. **SimuladorRegulacaoGlicemica** (`regulacao-glicemica`) — Resistência à Insulina
   - Controles: ingestão de carboidratos, sensibilidade à insulina, função pancreática
   - Gráficos: glicemia, insulinemia e captação muscular ao longo do tempo
   - Toggle para simular DM1, DM2, estado normal

6. **SimuladorEixoHPA** (`eixo-hpa`) — Hipotálamo-Hipófise-Adrenal
   - Timeline com feedback negativo: CRH → ACTH → Cortisol
   - Botões: aplicar estresse, administrar corticoide exógeno
   - Gráfico de linhas múltiplas mostrando supressão hormonal

7. **SimuladorCineticaEnzimatica** (`cinetica-enzimatica`) — Michaelis-Menten
   - Sliders: [S], [E], Vmax, Km
   - Botões para adicionar inibidor competitivo / não-competitivo
   - Gráfico V vs [S] com curva de Michaelis-Menten
   - Gráfico de Lineweaver-Burk (1/V vs 1/[S])

### Lote 3 (3 simuladores — GI, coagulação e farmacocinética)

8. **SimuladorSecrecaoGastrica** (`secrecao-gastrica`) — Célula Parietal
   - Toggles: histamina (H2), acetilcolina (M3), gastrina (CCK-B)
   - Botões para bloquear: IBP, anti-H2, anticolinérgico
   - Output: taxa de secreção H⁺, pH gástrico
   - Diagrama da célula parietal com vias destacadas

9. **SimuladorCascataCoagulacao** (`cascata-coagulacao`) — Hemostasia
   - Fluxograma interativo das vias intrínseca/extrínseca/comum
   - Toggle para desativar fatores (II, V, VII, VIII, IX, X, XI, XII)
   - Simulação de hemofilias A/B, uso de varfarina, heparina, DOACs
   - Outputs: TP, INR, TTPa

10. **SimuladorADME** (`compartimentos-adme`) — Farmacocinética
    - Modelo de 2 compartimentos com absorção oral
    - Sliders: biodisponibilidade, Vd, clearance, Ka
    - Gráficos: concentração plasmática vs tempo, quantidade em cada compartimento
    - Toggle para metabolismo de primeira passagem

## Alterações em arquivos existentes

- **`App.tsx`**: 10 novas rotas em `/simuladores/fisiologia/*`
- **`Simuladores.tsx`**: Adicionar 10 entradas em `NATIVE_SIMULATORS` com categoria "Fisiologia Humana" e ícones Lucide apropriados (Brain, Heart, Beaker, Droplets, etc.)

## Detalhes Técnicos

- Cada simulador terá ~400-700 linhas seguindo o padrão do `SimuladorBombaInfusao.tsx`
- Modelos matemáticos implementados no front-end (equações diferenciais simplificadas com `useEffect` + intervalos)
- Gráficos: `LineChart`, `AreaChart`, `BarChart` do Recharts com `ResponsiveContainer`
- Sliders: `@radix-ui/react-slider` já instalado
- Implementação sequencial por lotes para manter qualidade e permitir revisão

