

## Correção do erro de build em BancadaControleQualidade.tsx

Falta declarar o estado `customAnalyte` e o array derivado `allAnalytes`. Basta adicionar duas linhas após a linha 73:

1. **Linha ~73** (após `const [analyte, setAnalyte]`): Adicionar `const [customAnalyte, setCustomAnalyte] = useState<typeof ANALYTES[0] | null>(null);`
2. **Linha ~84** (antes de `selectedAnalyte`): Adicionar `const allAnalytes = useMemo(() => [...ANALYTES, ...(customAnalyte ? [customAnalyte] : [])], [customAnalyte]);`
3. **Linha 84**: Alterar `ANALYTES.find` para `allAnalytes.find`

