

## Plano: Reformulacao dos Desafios — Simulador Inflamacao e AINEs

### Resumo

Criar 30 desafios (5 casos × 6 cada), seguindo o padrao do Manejo da Dor: cada desafio exige que o aluno ajuste parametros no simulador, interprete graficos/paineis e so entao responda. Tambem corrigir problemas da engine para que os graficos reflitam corretamente o que os desafios pedem.

---

### Problemas preventivos (licoes do Manejo da Dor)

| Problema | Correcao preventiva |
|----------|---------------------|
| Slider step grande demais impedindo doses especificas | Step adaptativo: `doseMax <= 20 ? 0.5 : doseMax <= 100 ? 2.5 : doseMax <= 500 ? 25 : 50` |
| EVA nao reflete dissociacao analgesia vs anti-inflamacao em dose baixa | Separar limiares: limiar analgesico (cpRatio ~0.3) vs limiar anti-inflamatorio (cpRatio ~0.7) |
| PA nao sobe visivelmente com AINE + HAS ao longo das 72h | PA deve ser dinamica por hora (nao so valor final) — ou pelo menos mostrar elevacao proporcional clara |
| TFG nao cai de forma dramatica com DRC + AINE dose maxima | Ampliar coeficiente: `doseRatio * 35` em vez de 20 |
| Ibuprofeno 200mg deve mostrar analgesia mas pouca anti-inflamacao | Implementar limiar dose-dependente para efeito anti-inflamatorio |
| Feedback com termos internos (typeMultiplier, etc) | Sem variaveis internas nos textos |
| Desafio pede funcionalidade inexistente no simulador | Cada desafio usa apenas controles existentes: fármaco, dose, intervalo, gastroprotecao, comorbidades |

---

### Mudancas na Engine (SimuladorInflamacaoAINEs.tsx)

1. **Dissociacao analgesica/anti-inflamatoria dose-dependente**: doses baixas de AINEs reduzem EVA mas NAO a linha de inflamacao; doses altas reduzem ambos
2. **Slider step refinado**: evitar saltos grandes
3. **TFG mais responsiva**: coeficiente maior para AINEs + DRC
4. **PA progressiva com HAS**: mostrar elevacao mais pronunciada (ex: 130→145)
5. **Tracking de activeCaseIndex**: adicionar estado para saber qual caso esta ativo e passar ao `getInflamacaoAINEsChallenges(caseIndex)`
6. **SimulatorState completo**: passar todos os campos necessarios (comorbidities, inflammation, sideEffectData, etc)

---

### Estrutura dos 30 Desafios (simulatorChallenges.ts)

**Caso 1: OA de Joelho** (Roberto, 60a, HAS + Ulcera)
1. Paradoxo dose-dependente: Ibuprofeno 200mg — EVA cai mas inflamacao fica alta; aumentar para 600mg e ver inflamacao cair
2. Gangorra COX: trocar AINE nao-seletivo por Celecoxibe — risco GI cai, risco CV sobe
3. Nefrotoxicidade + DRC: ativar DRC, AINE dose max — TFG cai
4. Ilusao da gastroprotecao: IBP zera GI mas nao altera CV/Renal
5. Interacao AINE + HAS: ativar HAS, observar PA subir
6. Farmacocinetica montanha-russa: Ibuprofeno t½=2h com intervalo 24h — Cp zera, EVA rebote

**Caso 2: OA Idosa Polimedicada** (Sonia, 67a, HAS + Osteopenia + DRGE)
1. Via topica vs sistemica: comparar Diclofenaco gel vs VO — riscos GI/CV/Renal desproporcional
2. Ibuprofeno dose alta em idosa com HAS: PA e TFG
3. Naproxeno t½=14h: intervalo 12h — Cp estavel vs Ibuprofeno t½=2h
4. Comorbidade osteopenia + corticoide: risco osseo sobe
5. Meloxicam COX-2 preferencial: risco intermediario CV vs COX-2 puro
6. Polifarmacia: interacao AINE + anti-hipertensivo

**Caso 3: AR — Bridge Therapy** (Tereza, 42a)
1. AINE sozinho na AR: conditionMultiplier=0.5, EVA mal desce
2. Prednisona como ponte: EVA e inflamacao caem significativamente
3. Dose de prednisona >7.5mg: barras endocrino/osseo/imune sobem
4. Cronoterapia: contexto sobre administrar a noite
5. Corticoide vs AINE na cascata do AA: bloqueio mais proximal
6. Dexametasona vs Prednisona: potencia e t½ diferentes

**Caso 4: EA do Corticoide** (Wilson, 55a, AR cronica)
1. Dose-dependentes vs tempo-dependentes: quais barras sobem com dose alta
2. Prednisona 10mg + diabetes: glicemia sobe
3. Reducao para 5mg: barras de EA caem
4. Osteopenia + corticoide cronico: risco osseo
5. Hidrocortisona vs Dexametasona: potencia e perfil de EA
6. Metilprednisolona intra-articular: via local

**Caso 5: Desmame de Corticoide** (Wilson continuacao)
1. Prednisona 10mg→5mg: observar mudancas nos sinais vitais
2. Abstinencia vs reativacao: conceitual com contexto simulado
3. Dose fisiologica (5mg = 20mg cortisol): limiar
4. Velocidade do desmame: risco de crise adrenal
5. Estresse agudo: necessidade de dose de estresse (hidrocortisona EV)
6. Substituicao por hidrocortisona: t½ curta simula fisiologico

---

### Arquivos modificados

| Arquivo | Mudancas |
|---------|----------|
| `src/data/simulatorChallenges.ts` | Reescrever `getInflamacaoAINEsChallenges(caseIndex)` com 5 caseSets × 6 desafios MCQ |
| `src/pages/simuladores/SimuladorInflamacaoAINEs.tsx` | (1) Fix slider step, (2) Dissociacao analgesica/anti-inflamatoria, (3) TFG mais responsiva, (4) PA mais responsiva com HAS, (5) activeCaseIndex tracking, (6) simulatorState completo |

