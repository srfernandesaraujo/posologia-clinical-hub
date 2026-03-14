

## Avaliação de Preços e Atualização dos Cards de Planos

### Inventário Atual da Plataforma

| Pilar | Quantidade |
|-------|-----------|
| Calculadoras Clínicas nativas | 22 |
| Simuladores nativos | 88 (12 categorias) |
| Jogos Clínicos | 21 nativos + jogos criados por IA |
| Laboratório Virtual | 11 bancadas |
| MedView 3D | 6 áreas com modelos Sketchfab |
| Salas Virtuais | Ilimitadas (Premium) |
| Marketplace | Compra/venda de ferramentas |
| Formação Docente | 7 simuladores dedicados |

### Análise de Preço

O preço atual de **R$ 29,90/mês** está subvalorizado considerando:
- 88 simuladores interativos com IA
- 21+ jogos clínicos gamificados
- 11 bancadas de laboratório virtual
- 6 áreas de visualização 3D
- Plataformas educacionais comparáveis no Brasil cobram R$ 49–99/mês por conteúdo similar

**Recomendação**: Manter R$ 29,90/mês como preço de entrada competitivo — é um preço agressivo que favorece aquisição de usuários. Se quiser aumentar, R$ 39,90 ou R$ 49,90 seriam justificáveis. A decisão de preço fica com você.

### Atualização dos Cards — O que muda

O array `features` e `featureLabels` em `Planos.tsx` está desatualizado. Vou atualizar para refletir todas as funcionalidades reais:

**Plano Gratuito** (o que inclui):
- 3 calculadoras clínicas/dia
- Acesso à vitrine e documentação

**Plano Premium** (o que inclui):
- 22+ Calculadoras Clínicas ilimitadas
- 88+ Simuladores interativos (12 categorias)
- 21+ Jogos Clínicos gamificados
- 11 Bancadas de Laboratório Virtual
- MedView 3D (6 especialidades)
- Salas Virtuais ilimitadas
- Relatórios em PDF
- Marketplace (compra de ferramentas)
- Suporte prioritário

Também atualizar o `UpgradeModal.tsx` com os mesmos benefícios.

### Arquivos a editar
- `src/pages/Planos.tsx` — atualizar lista de features com contagens reais
- `src/components/UpgradeModal.tsx` — sincronizar benefícios Premium

