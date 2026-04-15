

## Plano: Reformulação dos Desafios — Simulador Tratamento da Asma

### Resumo

Criar 30 desafios (5 casos × 6 cada) seguindo o padrão do Manejo da Dor. Cada desafio exige ajuste de parâmetros no simulador + interpretação de gráficos antes de responder. Também corrigir a engine para suportar os cenários pedagógicos.

---

### Problemas preventivos (lições do Manejo da Dor)

| Problema | Correção |
|----------|----------|
| Sem `activeCaseIndex` — desafios não variam por caso | Adicionar tracking e `getTratamentoAsmaChallenges(caseIndex)` |
| SABA isolado não degrada VEF1 ao longo das semanas (desafio 1) | Se só SABA sem CI: VEF1 cai ~1%/semana (inflamação progressiva) e crises sobem |
| LABA monoterapia não mostra piora tardia (desafio 3) | Se LABA sem CI: melhora semanas 1-4, depois crises dobram semanas 6-12 (black box) |
| Dispositivo não afeta barras de EA local (desafio 2) | pMDI sem espaçador: multiplicar candidíase/disfonia ×2.5; com espaçador ×0.4 |
| DRGE não afeta sintomas noturnos visivelmente (desafio 5) | DRGE: sintomasNoturnos += 3; crisisReduction *= 0.6 (não apenas 0.85) |
| Taquifilaxia/abuso de SABA não modelado (desafio 6) | Se SABA dose ≥600mcg: vef1Improvement *= 0.3 (dessensibilização), taquicardia/tremor ×2 |
| Prednisona oral vs CI: diferença de EA insuficiente (desafio 4) | Prednisona oral: supressaoAdrenal e osteoporose muito mais altas que CI |
| Slider step inadequado para doses pequenas (ex: Tiotrópio 2.5-5) | Step adaptativo |
| Feedback com termos internos | Sem variáveis internas nos textos |
| simulatorState incompleto para challenges | Passar specialGroups, sideEffectData, device, crisisData, lungData |

---

### Mudanças na Engine (SimuladorTratamentoAsma.tsx)

1. **SABA isolado degrada**: se nenhum CI presente, VEF1 cai ~1%/semana e crises sobem progressivamente
2. **LABA monoterapia piora tardia**: sem CI, melhora semanas 1-4, crises disparam semana 6+
3. **Dispositivo afeta EA locais**: pMDI sem espaçador → candidíase/disfonia ×2.5; com espaçador → ×0.4
4. **DRGE mais impactante**: crisisReduction *= 0.6, sintomasNoturnos += 3
5. **Taquifilaxia SABA**: dose ≥600mcg → eficácia broncodilatadora cai, EA cardíacos sobem
6. **activeCaseIndex tracking** + simulatorState completo
7. **Slider step adaptativo**

---

### Estrutura dos 30 Desafios

**Caso 1: Pedro, 22a — Asma Intermitente (Step 1)**
1. Fim do SABA isolado: SABA só → VEF1 cai e crises sobem; trocar para MART → estabiliza
2. Dispositivo e EA local: pMDI sem espaçador → candidíase/disfonia altas; com espaçador → caem
3. LABA monoterapia (black box): LABA sem CI → melhora inicial, piora tardia perigosa
4. Iatrogenia: CI alta dose vs Prednisona oral → barras supressão adrenal/osteoporose disparam
5. DRGE e falha aparente: terapia otimizada + DRGE → sintomas noturnos persistem
6. Taquifilaxia SABA: dose abusiva → VEF1 não melhora, taquicardia/tremor sobem

**Caso 2: Marina, 35a — Persistente Moderada (Step 3)**
1. Escalonamento Step 2→3: CI dose baixa insuficiente → adicionar LABA → VEF1 sobe e crises caem
2. MART vs CI+SABA: formoterol como resgate → exacerbações menores que SABA isolado
3. Verificação pré-escalonamento: conceitual — técnica, adesão, gatilhos antes de subir step
4. Montelucaste add-on: LTRA adiciona pouco VEF1 mas ajuda em asma por exercício
5. Obesidade: ativar obesidade → eficácia reduzida (VEF1 melhora menos, crises persistem)
6. Dose-resposta CI: budesonida 200→400→800 → curva plateau de eficácia com EA crescentes

**Caso 3: Roberto, 48a — Grave Step 5**
1. Fenotipagem: IgE alta + eosinófilos → omalizumabe; por que não mepolizumabe?
2. Tiotrópio add-on: LAMA adiciona VEF1 modesto no Step 4-5
3. Desmame de prednisona: reduzir dose → barras supressão adrenal e osteoporose caem
4. CI dose alta vs oral: comparar barras EA — via inalatória muito menos EA sistêmico
5. Biológico reduz exacerbações: omalizumabe → crises caem significativamente
6. Idoso: ativar idoso → osteoporose ×2 e supressão adrenal ×1.5

**Caso 4: Amanda, 30a — Gestante Step 2**
1. Budesonida preferida: selecionar budesonida → warning ✅; trocar para mometasona → sem preferência
2. Segurança: selecionar prednisona oral na gestante → warning ⚠️; manter CI inalatório → seguro
3. SABA resgate na gestação: salbutamol é seguro; comparar barras EA
4. Montelucaste na gestação: pode manter se já em uso
5. Risco de não tratar: sem CI → VEF1 cai → risco fetal maior que risco do CI
6. Formoterol + budesonida: LABA seguro na gestação, MART viável

**Caso 5: Lucas, 16a — Crise Aguda**
1. Classificação da crise: PFE 35%, SpO2 89% → grave; quais parâmetros definem gravidade?
2. SABA nebulizado contínuo: dose alta de salbutamol → VEF1 sobe rapidamente na crise
3. Corticoide sistêmico precoce: prednisona na 1ª hora → reduz internação 25%
4. Contraindicação de sedação: conceitual — NUNCA sedar na crise asmática
5. MgSO4 EV: quando indicar (sem resposta ao SABA+ipratrópio+corticoide)
6. Alta da crise: conceitual — CI dose alta + plano de ação escrito

---

### Arquivos modificados

| Arquivo | Mudanças |
|---------|----------|
| `src/data/simulatorChallenges.ts` | Reescrever `getTratamentoAsmaChallenges(caseIndex?)` com 5 caseSets × 6 desafios MCQ |
| `src/pages/simuladores/SimuladorTratamentoAsma.tsx` | (1) SABA degrada sem CI, (2) LABA monoterapia piora tardia, (3) Dispositivo afeta EA locais, (4) DRGE mais impactante, (5) Taquifilaxia SABA, (6) activeCaseIndex tracking, (7) simulatorState completo, (8) Slider step adaptativo |

