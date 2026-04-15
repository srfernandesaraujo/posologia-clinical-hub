

## Plano: Reformulação dos Desafios — Simulador Infecções e Antibioticoterapia

### Resumo

Criar 30 desafios (5 casos × 6 cada), seguindo o padrão do Manejo da Dor: cada desafio exige que o aluno ajuste parâmetros no simulador, interprete gráficos/painéis e só então responda. Também corrigir problemas preventivos na engine para que os gráficos reflitam corretamente o que os desafios pedem.

---

### Problemas preventivos (lições do Manejo da Dor)

| Problema | Correção preventiva |
|----------|---------------------|
| Carga bacteriana usa fórmula monotônica (nunca sobe de volta) — impossível mostrar recrescimento com intervalo longo | Refazer cálculo de bacterialLoad para ser dinâmico por hora: se Cp < MIC, bactéria cresce; se Cp > MIC, bactéria morre |
| Nitrofurantoína com DRC: curva sítio-alvo (urina) não cai visivelmente | Multiplicar `siteConcentration` por fator DRC (ex: 0.2) quando `!drug.safeDRC && specialGroups.drc` |
| Fosfomicina dose única: engine aplica múltiplas doses (interval=24h gera 7 doses em 168h) | Detectar Fosfomicina (dose única) e limitar a 1 dose apenas |
| Vancomicina oral (bio=0): curva plasma zerada OK, mas cpSite deveria ser alta (intestinal) independente de plasma | cpSite para bio=0 deve ser calculado diretamente pela concentração intestinal, não derivado de cpPlasma |
| Gestante toggle não mostra teratogenicidade visualmente além do warning | Adicionar barra "Teratogenicidade" ao sideEffectData quando gestante + fármaco inseguro |
| Slider step inadequado para faixas pequenas (ex: Nitrofurantoína 50-100mg) | Step adaptativo: `doseMax - doseMin <= 100 ? 10 : doseMax <= 500 ? 25 : 50` |
| Feedback com termos internos | Sem variáveis internas nos textos dos desafios |
| Não há `activeCaseIndex` tracking | Adicionar estado para saber qual caso está ativo e passar ao `getInfeccoesAntibioticosChallenges(caseIndex)` |

---

### Mudanças na Engine (SimuladorInfeccoesAntibioticos.tsx)

1. **Carga bacteriana dinâmica por hora**: se Cp no sítio < MIC, bactéria recrescerá (taxa ~0.3 log/h), mostrando falha com intervalos longos (Desafio 4 - Cefalexina 24h). Se Cp > MIC, bactéria reduz proporcionalmente
2. **Vancomicina oral (bio=0)**: calcular cpSite diretamente pela dose/volume intestinal em vez de derivar de cpPlasma (que é 0)
3. **Fosfomicina dose única**: limitar nDoses=1 para fármacos com `doseMin === doseMax` e `intervalMax === 24`
4. **DRC penaliza concentração urinária**: se DRC ativado e drug.safeDRC=false, `urinaryConcentration *= 0.2` — carga bacteriana não cai
5. **Barra de Teratogenicidade**: quando gestante + !safePregnancy, adicionar barra extra com risco alto
6. **Slider step adaptativo**
7. **activeCaseIndex tracking**: adicionar useMemo para determinar índice do caso ativo
8. **simulatorState completo**: passar specialGroups, sideEffectData, cpSite, bacterialLoad, etc

---

### Estrutura dos 30 Desafios (simulatorChallenges.ts)

**Caso 1: Cistite — Vanessa, 20a** (ITU não-complicada)
1. Compartimento alvo: Nitrofurantoína — curva Sítio-alvo alta mas Plasma zerada; por que falha na pielonefrite?
2. Preço do "canhão": trocar para Ciprofloxacino — barras de EA (Tendinite, Disbiose, QT) acendem; conceito de dano colateral
3. Interação fármaco-doença (DRC): ativar DRC + Nitrofurantoína — concentração no sítio cai, carga bacteriana não reduz
4. PK/PD tempo-dependente: Cefalexina com intervalo 24h — carga bacteriana recrescerá entre doses
5. Dose única sustentada: Fosfomicina — pico alto que decai lentamente, mantém acima da MIC por 48-72h
6. Teratogenicidade: ativar gestante + SMX-TMP — alerta vermelho + barra teratogenicidade

**Caso 2: Pielonefrite ESBL — Marcos, 35a**
1. Falha do empírico: Ciprofloxacino em ESBL — carga bacteriana estagna (resistência); conceito de escalonamento
2. Escalonamento para Ceftriaxona EV: via EV + t½ longa = Cp sustentada acima da MIC
3. Betalactâmico tempo-dependente: Ceftriaxona 24h vs Cefalexina 6h — por que a ceftriaxona funciona com intervalo longo?
4. Espectro vs dano colateral: Ceftriaxona (amplo espectro) — disbiose alta; comparar com Cefalexina (espectro estreito)
5. Step-down: conceito de trocar EV→VO quando afebril por 48h (interpretação dos sinais vitais)
6. Nefrotoxicidade: dose alta + DRC ativada — risco nefro sobe

**Caso 3: ITU na Gestação — Ana Luísa, 28a** (Gestante 24 sem)
1. Antibiótico seguro: Cefalexina na gestante — sem warning; trocar para SMX-TMP → alerta teratogênico
2. Fluoroquinolona na gestante: Ciprofloxacino — warning de artropatia fetal + barras EA altas
3. Nitrofurantoína: segura até 36 sem — comparar barras de EA com Cefalexina (perfis diferentes)
4. Bacteriúria assintomática: por que tratar se assintomática? (carga inicial baixa → observar que sem tratamento progrediria)
5. t½ e regime posológico: Cefalexina t½=1h 6/6h vs Amoxicilina t½=1h 8/8h — coberturas diferentes
6. Ajuste de dose: Amoxicilina 250mg vs 1000mg — curva Cp proporcional, efeito na erradicação

**Caso 4: Diarreia Aquosa vs Disenteria — João, 45a**
1. SRO sem antibiótico: diarreia aquosa — SRO + hidratação; carga bacteriana não cai mas paciente melhora (sinais vitais)
2. Antibiótico desnecessário: prescrever Ciprofloxacino na diarreia aquosa — carga bacteriana cai mas barras EA sobem sem necessidade
3. Concentração intestinal: comparar Azitromicina (intestinal alta) vs Nitrofurantoína (intestinal baixa) — sítio-alvo
4. Espectro e t½: Azitromicina t½=68h dose única diária vs Metronidazol t½=8h 8/8h — curvas Cp diferentes
5. Evolução para disenteria: trocar para infecção invasiva → agora antibiótico indicado; qual tem melhor perfil?
6. Fotossensibilidade: Doxiciclina — barra Fotosens. alta; Azitromicina — barra QT alta; trade-offs

**Caso 5: C. difficile — Fernando, 72a** (Idoso, internado)
1. Vancomicina oral vs EV: Vancomicina oral bio=0 → concentração intestinal altíssima, plasma zero; por que oral?
2. Metronidazol vs Vancomicina oral: Metronidazol é absorvido (Cp plasma sobe) → menos concentração intestinal
3. Idoso + Fluoroquinolona: ativar idoso → tendinite dobra; por que FQ é fator de risco para C. difficile
4. Suspender clindamicina (conceitual): remover o antibiótico causador é parte do tratamento
5. Dose de Vancomicina: 125mg vs 500mg — ambos eficazes mas perfis de EA diferentes
6. Disbiose iatrogênica: Ceftriaxona (espectro amplo) → disbiose alta; conexão com risco de C. difficile

---

### Arquivos modificados

| Arquivo | Mudanças |
|---------|----------|
| `src/data/simulatorChallenges.ts` | Reescrever `getInfeccoesAntibioticosChallenges(caseIndex)` com 5 caseSets × 6 desafios MCQ |
| `src/pages/simuladores/SimuladorInfeccoesAntibioticos.tsx` | (1) Carga bacteriana dinâmica (recrescimento se Cp < MIC), (2) Vancomicina oral cpSite direto, (3) Fosfomicina dose única, (4) DRC penaliza urinária, (5) Barra teratogenicidade, (6) Slider step adaptativo, (7) activeCaseIndex tracking, (8) simulatorState completo |

