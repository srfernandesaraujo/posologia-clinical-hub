// Calculadora → simuladores do mesmo tema (slug da calculadora = último trecho
// de /calculadoras/<slug>; slug do simulador = NATIVE_SIMULATORS[].slug).
// Aparece no cabeçalho da calculadora como "Praticar no simulador".
export const CALCULATOR_SIMULATOR_LINKS: Record<string, string[]> = {
  "ajuste-dose-renal": ["farmacoterapia-renal", "depuracao-renal"],
  "ckd-epi": ["farmacoterapia-renal", "depuracao-renal"],
  "schwartz-pediatrico": ["farmacoterapia-renal"],
  "vancomicina-auc": ["tdm", "farmacoterapia-renal"],
  "insulina-basal-bolus": ["insulina", "farmacoterapia-glicemia"],
  "homa-ir": ["regulacao-glicemica"],
  "findrisc": ["farmacoterapia-glicemia"],
  "correcao-sodio": ["farmacoterapia-acido-base"],
  "correcao-calcio": ["farmacoterapia-acido-base"],
  "meld-score": ["farmacoterapia-hepatopatia"],
  "qsofa": ["infeccoes-antibioticos", "farmacoterapia-infeccao-lab"],
  "risco-cardiovascular": ["farmacoterapia-dislipidemia"],
  "qtc-corrigido": ["eletrofisiologia-cardiaca"],
  "nutricao-parenteral": ["tnp"],
  "interacoes-cyp": ["interacoes", "farmacogenomica"],
  "equivalencia-opioides": ["manejo-dor"],
};
