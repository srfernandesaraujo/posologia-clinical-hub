

# Plano: Simuladores de Bioquímica

## Visão Geral

Criação de 10 simuladores de Bioquímica seguindo o padrão existente dos simuladores de Fisiologia Humana: casos built-in, suporte a casos IA (`useSimulatorCases`), gráficos Recharts interativos, integração com salas virtuais e modo exame.

## Arquitetura

- Novos componentes em `src/pages/simuladores/bioquimica/`
- Nova categoria **"Bioquímica"** no `NATIVE_SIMULATORS` de `Simuladores.tsx`
- Rotas registradas em `App.tsx` (padrão + sala virtual)
- Slugs adicionados em `useSimulatorCases.ts`

## Simuladores por Lotes

### Lote 1 (4 simuladores — Metabolismo energético e enzimologia)

1. **SimuladorCadeiaTransporteEletrons** (`cadeia-eletrons`)
   - Visualização da membrana mitocondrial com Complexos I-IV e ATP Sintase
   - Sliders: concentração de NADH, FADH2
   - Botões para inibidores (rotenona, antimicina A, cianeto) e desacopladores (DNP)
   - Outputs: gradiente de H⁺, taxa de síntese de ATP, consumo de O₂
   - Gráfico temporal da produção de ATP e gradiente

2. **SimuladorDissociacaoHemoglobina** (`dissociacao-hemoglobina`)
   - Curva sigmoidal de Hb e hiperbólica de mioglobina com Recharts
   - Sliders: pH, pCO₂, temperatura, 2,3-BPG
   - Cálculo de P50 dinâmico com desvio da curva
   - Casos: anemia falciforme, intoxicação por CO, exercício intenso

3. **SimuladorGlicoliseGliconeogenese** (`glicolise-gliconeogenese`)
   - Toggle alimentado (insulina) vs jejum (glucagon)
   - Diagrama de fluxo: glicose → piruvato vs piruvato → glicose
   - Destaque de enzimas regulatórias (PFK-1, F1,6-bifosfatase, piruvato quinase/carboxilase)
   - Indicadores de fosforilação/desfosforilação enzimática

4. **SimuladorCineticaAvancada** (`cinetica-avancada`)
   - Extensão do simulador existente com inibição **acompetitiva**
   - Gráficos simultâneos: Michaelis-Menten + Lineweaver-Burk
   - Sliders: [S], [E], concentração do inibidor
   - Visualização de alterações em Km, Vmax, inclinação e interceções

### Lote 2 (3 simuladores — Metabolismo lipídico e azotado)

5. **SimuladorCicloUreia** (`ciclo-ureia`)
   - Fluxograma do ciclo: ornitina → citrulina → argininossuccinato → arginina → ureia
   - Toggle para deficiência de cada enzima (CPS I, OTC, ASS, ASL, arginase)
   - Outputs: níveis de amónia, intermediários acumulados, ureia produzida
   - Indicador de neurotoxicidade

6. **SimuladorCascataAcidoAraquidonico** (`acido-araquidonico`)
   - Diagrama: fosfolípido de membrana → AA → COX/LOX → prostaglandinas/tromboxanos/leucotrienos
   - Botões farmacológicos: AINEs (ibuprofeno, aspirina), corticosteróides, inibidores LOX
   - Outputs: níveis de PGE2, TXA2, LTB4
   - Casos: inflamação aguda, asma, prevenção cardiovascular

7. **SimuladorLipoproteinas** (`lipoproteinas`)
   - Vias exógena (quilomícrons) e endógena (VLDL → IDL → LDL) + transporte reverso (HDL)
   - Sliders: ingestão lipídica, atividade de LPL, expressão de receptores LDL
   - Botões: estatinas, resinas, ezetimiba, inibidores PCSK9
   - Outputs: níveis de LDL-c, HDL-c, triglicerídeos

### Lote 3 (3 simuladores — Bioquímica celular e genética)

8. **SimuladorPentosesFosfato** (`pentoses-fosfato`)
   - Eritrócito: G6PD → NADPH → glutationa reduzida → proteção contra ROS
   - Toggle: célula normal vs deficiência de G6PD
   - Botões: introduzir agentes oxidantes (primaquina, favas, dapsona)
   - Outputs: níveis de NADPH, GSH/GSSG, integridade da membrana
   - Indicador visual de hemólise

9. **SimuladorTitulacaoAminoacidos** (`titulacao-aminoacidos`)
   - Selector de aminoácido (glicina, ácido glutâmico, lisina, histidina)
   - Slider de volume de NaOH/HCl adicionado
   - Curva de titulação em tempo real com indicação de pKa e pI
   - Cálculo dinâmico de carga líquida em função do pH

10. **SimuladorOperonLac** (`operon-lac`)
    - Representação do DNA: promotor, operador, genes estruturais (lacZ, lacY, lacA)
    - Sliders: glicose e lactose no meio
    - Lógica: glicose alta → cAMP baixo → CAP não liga; lactose presente → alolactose → repressor inativo
    - Output: nível de transcrição de β-galactosidase
    - Gráfico temporal da expressão génica

## Alterações em arquivos existentes

- **`App.tsx`**: 20 novas rotas (10 padrão + 10 sala virtual)
- **`Simuladores.tsx`**: 10 novas entradas em `NATIVE_SIMULATORS` com categoria "Bioquímica"
- **`useSimulatorCases.ts`**: 10 novos slugs em `SIMULATOR_SLUGS`

## Detalhes Técnicos

- Cada simulador ~400-700 linhas, padrão idêntico ao `SimuladorSNA.tsx`
- Modelos matemáticos no front-end com `useEffect`/`useMemo`
- Gráficos Recharts (`LineChart`, `AreaChart`, `BarChart`)
- Ícones Lucide: `Flame`, `Droplets`, `FlaskConical`, `Dna`, `Pill`, `Heart`, `Shield`, `Beaker`, `TestTube`, `Microscope`
- 3 casos built-in por simulador com dificuldades variadas

