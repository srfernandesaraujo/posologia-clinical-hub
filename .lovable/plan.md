

## Corrigir texto da Justificativa invisível no Simulador TDM

### Problema
No Simulador TDM, ao clicar em "Aplicar Novo Esquema" e expandir a "Justificativa", o texto fica branco sobre fundo claro (laranja/verde), tornando-o ilegível. Isso acontece porque a classe `text-foreground` usa a cor do tema escuro (branca), mas o fundo do card de feedback é claro (`bg-orange-50`).

### Solução
Trocar a classe de cor do texto da justificativa de `text-foreground` para cores que combinem com o fundo do feedback, seguindo o mesmo padrão já usado nos outros textos do card (ex: `text-orange-700 dark:text-orange-300` / `text-green-700 dark:text-green-300`).

### Detalhes Técnicos

**Arquivo:** `src/pages/simuladores/SimuladorTDM.tsx` (linha 216)

Alterar:
```tsx
<p className="text-xs mt-2 text-foreground">
```
Para:
```tsx
<p className={`text-xs mt-2 ${isCorrect ? "text-green-800 dark:text-green-200" : "text-orange-800 dark:text-orange-200"}`}>
```

Isso garante contraste adequado tanto no modo claro quanto no escuro, e segue o mesmo padrão de cores já utilizado nos outros elementos do card de feedback.

