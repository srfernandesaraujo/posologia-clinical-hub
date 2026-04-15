

## Plano: Desafios por Caso no Simulador Manejo da Dor

### Problema Atual
O simulador Manejo da Dor tem um unico conjunto de 10 desafios genéricos (`getManejoDorChallenges()`) usado para todos os 5 casos. Os 5 grupos em sala de aula farao casos diferentes, mas enfrentarao os mesmos desafios — que nao se relacionam com o caso clinico especifico.

### Solucao
Transformar `getManejoDorChallenges()` para aceitar o indice do caso ativo e retornar desafios especificos para aquele caso. Cada conjunto tera ~6 desafios com a dinamica: **ajuste algo no simulador → responda uma MCQ interpretativa sobre as consequencias desse ajuste**.

### Dinamica dos Desafios (padrao para todos os 5 casos)
1. **Adjust** — pede ao aluno que selecione um farmaco, dose ou adjuvante
2. **MCQ interpretativa** — pergunta sobre as consequencias clinicas/farmacologicas daquele ajuste (ex: "Ao selecionar tramadol neste paciente, qual efeito adverso exige monitoramento prioritario?")
3. **Adjust** — outro ajuste (ex: adicionar adjuvante, mudar dose)
4. **MCQ interpretativa** — consequencias do segundo ajuste
5. **Adjust** — ajuste final (ex: gastroprotecao, intervalo)
6. **MCQ interpretativa** — pergunta de desfecho/seguranca

### Desafios por Caso

**Caso 1 — Dor Aguda Pos-Operatoria**
- Adjust: Selecione Tramadol como analgesico
- MCQ: Qual EA do tramadol requer vigilancia neste pos-operatorio? (convulsao em dose alta / sindrome serotoninergica)
- Adjust: Ajuste dose para 100mg
- MCQ: Se o EVA nao melhorar com tramadol 100mg 6/6h, qual escalonamento segue a escada OMS?
- Adjust: Mantenha o intervalo em 6h
- MCQ: Porque a analgesia multimodal e superior a monoterapia neste caso?

**Caso 2 — Dor Neuropatica (Lombalgia/Radiculopatia)**
- Adjust: Selecione Duloxetina como adjuvante
- MCQ: Qual mecanismo explica a eficacia da duloxetina na dor neuropatica?
- Adjust: Mantenha Paracetamol como analgesico base
- MCQ: O paciente usa paracetamol 4g/dia ha 3 meses. Qual o principal risco?
- Adjust: Ative gastroprotecao (paciente obeso, hipertenso)
- MCQ: Por que AINEs sao inadequados como monoterapia neste tipo de dor?

**Caso 3 — Fibromialgia**
- Adjust: Selecione Pregabalina como adjuvante
- MCQ: Por que opioides sao contraindicados na fibromialgia?
- Adjust: Selecione Dipirona (nao-opioide)
- MCQ: Qual o mecanismo da pregabalina na sensibilizacao central?
- Adjust: Mantenha dose baixa do analgesico
- MCQ: Qual medida nao-farmacologica tem nivel de evidencia equivalente aos farmacos na fibromialgia?

**Caso 4 — Dor Oncologica (Escalonamento)**
- Adjust: Selecione Morfina como analgesico
- MCQ: Ao escalonar para morfina, qual EA obrigatorio requer profilaxia desde o D1?
- Adjust: Adicione Gabapentina 300mg
- MCQ: Qual componente da dor desta paciente justifica a gabapentina?
- Adjust: Ajuste intervalo para 4h
- MCQ: O principio "by the clock" da OMS significa administrar em horarios fixos porque...?

**Caso 5 — Rotacao de Opioides**
- Adjust: Selecione Fentanil TD
- MCQ: Na conversao morfina VO 180mg/dia → fentanil TD, por que se reduz 25-50% da dose equianalgesica?
- Adjust: Mantenha Gabapentina como adjuvante
- MCQ: A metadona tem vantagem na rotacao por qual mecanismo adicional alem do agonismo mu?
- Adjust: Ajuste dose adequada
- MCQ: Quais sinais indicaram necessidade de rotacao nesta paciente (mioclonias, nauseas)?

### Atualizacao do System Prompt (casos IA)
O prompt `sim-manejo-dor` sera atualizado para instruir a IA a gerar tambem um campo `challenges` dentro de `case_data`, contendo 6 desafios no mesmo padrao (adjust→MCQ interpretativa alternados). O simulador passara a usar esses desafios do caso IA quando disponiveis.

### Arquivos a Editar

| Arquivo | Mudanca |
|---------|---------|
| `src/data/simulatorChallenges.ts` | Refatorar `getManejoDorChallenges(caseIndex?: number)` para retornar desafios especificos por caso (5 conjuntos de ~6 desafios cada). Manter fallback generico para caseIndex indefinido. |
| `src/pages/simuladores/SimuladorManejoDor.tsx` | Passar o indice do caso ativo para `getManejoDorChallenges(activeCaseIndex)` e extrair desafios do caso IA quando disponiveis. |
| `src/data/nativeSystemPrompts.ts` | Atualizar prompt `sim-manejo-dor` para incluir geracao de `challenges[]` no `case_data` dos casos IA. |

### Padrao Tecnico
- A funcao `getManejoDorChallenges(caseIndex)` retorna `ChallengeSet` com 6 desafios especificos. Se `caseIndex` for `undefined`, retorna o set genérico atual (retrocompativel).
- Os validators de adjust usam o mesmo padrao existente (checam `simulatorState`).
- As MCQs interpretativas referenciam diretamente o contexto do caso e as consequencias dos ajustes.

