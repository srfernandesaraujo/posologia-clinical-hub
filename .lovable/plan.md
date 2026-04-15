

## Plano: Correcoes do Simulador Manejo da Dor

### Problemas Identificados

| # | Problema | Causa |
|---|----------|-------|
| 1 | Morfina pula de 5→55mg (step=50) | Slider step = 50 para doseMax > 100 |
| 2 | Desafio pede mudar via VO→EV mas nao existe seletor de via | Funcionalidade ausente |
| 3 | Desafio 4: efeito teto da Dipirona pouco evidente nos graficos | O cap de 0.55 na potencia com ceilingEffect nao e visivel o suficiente na curva EVA |
| 4 | Desafio 5: EVA nunca fica abaixo de 3 com Morfina 200mg/4h | A formula `reduction * 0.85` limita a reducao maxima; com Morfina dose maxima, a reducao maxima e ~68% do EVA inicial (EVA 8→~2.5 teoricamente, mas o cap em cp/80 limita) |
| 5 | Feedback do desafio 5 menciona flutuacoes de nausea/sedacao em 3-5 dias, mas o grafico de EA e estatico (barras fixas, nao temporais) | Grafico nao mostra evolucao temporal |
| 6 | Desafio 6 (Caso 1): pede reduzir intervalo do Tramadol para 4h, mas intervalMin=6 | Limite do slider |
| 7 | Usuario quer toggles de insuficiencia renal e hepatica | Funcionalidade ausente |

### Solucao

**Arquivo: `src/pages/simuladores/SimuladorManejoDor.tsx`**

1. **Corrigir step do slider de dose**: Substituir logica de step para usar incrementos proporcionais ao range (ex: step=5 para Morfina, step=10 para Dipirona, etc.). Regra: `Math.max(1, Math.round((doseMax - doseMin) / 40))` para ~40 posicoes no slider.

2. **Adicionar seletor de Via de Administracao**: Novo `Select` com as rotas disponiveis do farmaco selecionado (`drug.routes`). A via afeta o `computeSimulation`:
   - EV: bioavailability=1.0, tmax=0.1 (pico quase instantaneo)
   - SC: bioavailability=0.9, tmax reduzido pela metade
   - TD: sem alteracao (ja modelado no Fentanil)
   - VO: valores padrao do farmaco

3. **Adicionar toggles de Insuficiencia Renal e Hepatica**: Dois switches no painel de prescricao:
   - **Insuficiencia Renal (ClCr < 30)**: multiplica halfLife por 2.5 (eliminacao mais lenta → acumulo), aumenta nefrotoxicidade (+30%), aumenta risco de depressao respiratoria
   - **Insuficiencia Hepatica (Child-Pugh C)**: multiplica halfLife por 2.0 para farmacos com metabolismo hepatico, aumenta hepatotoxicidade (+40%), aumenta biodisponibilidade VO (menos first-pass)
   - Ambos afetam curva Cp visivelmente (vales mais altos, acumulo progressivo) e barras de EA

4. **Corrigir formula EVA para permitir valores < 3**: Ajustar o fator de reducao de `0.85` para `0.95` e o cap de `cp/80` para `cp/60`, permitindo que opioides fortes em dose alta atinjam EVA < 3 na dor oncologica.

5. **Ampliar intervalo minimo do Tramadol**: Reduzir `intervalMin` de 6 para 4h na definicao do farmaco (tramadol pode ser prescrito 4/4h em algumas referencias).

6. **Tornar efeito teto mais visivel**: Aumentar a penalidade do ceiling effect — quando `ceilingEffect: true` e dose > 60% da maxima, a potencia para de subir. Isso criara um plato mais claro na EVA.

7. **Ajustar feedback dos desafios**: No desafio 5 do caso 1, remover referencia a "flutuacoes de 3-5 dias" no grafico (ja que EA e estatico). Ajustar para: "O aluno deve notar que a barra de constipacao e a mais alta e, diferente das demais, nao desenvolve tolerancia clinicamente."

**Arquivo: `src/data/simulatorChallenges.ts`**

8. **Revisar desafios de todos os 5 casos** para compatibilidade com as novas funcionalidades:
   - Caso 1, Desafio 3: agora possivel (via EV adicionada)
   - Caso 1, Desafio 5: agora possivel (EVA < 3 alcancavel)
   - Caso 1, Desafio 6: agora possivel (intervalo 4h para Tramadol)
   - Ajustar textos de feedback que mencionam dados temporais de EA
   - Adicionar desafios que usem os toggles de insuficiencia renal/hepatica (especialmente nos casos 1, 2 e 5)
   - Revisar casos 2-5 para divergencias similares com o simulador

### Verificacao Cruzada dos Casos 2-5

- **Caso 2**: Pede Ibuprofeno dose alta (2400mg) — step=50, funciona (200→2400). Pede comparar adjuvantes — OK. Nenhum problema de compatibilidade.
- **Caso 3**: Pede Morfina 60mg na fibromialgia — com novo step, sera possivel ajustar finamente. OK.
- **Caso 4**: Pede Morfina 60mg e 4h — intervalMin da Morfina ja e 4. Pede titulacao 15/30/60/100mg — com novo step sera possivel. OK.
- **Caso 5**: Pede Fentanil TD e Metadona — ambos disponiveis. Pede comparar curvas Cp — OK. Nenhum problema.

### Resumo de Arquivos

| Arquivo | Mudancas |
|---------|----------|
| `src/pages/simuladores/SimuladorManejoDor.tsx` | (1) Fix slider step, (2) Seletor de via, (3) Toggles IR/IH, (4) Fix formula EVA, (5) Ampliar intervalMin Tramadol, (6) Efeito teto mais evidente, (7) Passar route+insufficiencies ao simulatorState |
| `src/data/simulatorChallenges.ts` | Ajustar textos de feedback dos desafios incompativeis, atualizar desafio 6 do caso 1 para usar toggle de IR |

