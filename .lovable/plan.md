

## Análise: Alternativas ao Sketchfab para Modelos 3D Médicos

### Situação Atual

O MedView 3D usa a **Sketchfab API** para buscar e renderizar modelos 3D. O problema: os modelos são genéricos (upload da comunidade), nem sempre têm qualidade/especificidade clínica, e a busca frequentemente retorna resultados irrelevantes ou nenhum resultado.

### Alternativas Disponíveis

| Plataforma | Prós | Contras | Custo |
|-----------|------|---------|-------|
| **BioDigital Human** | Modelos anatômicos profissionais, labels médicos, API robusta, usado por universidades | API cara (~$500+/mês enterprise), sem plano gratuito viável | Alto |
| **Zygote Body** | Anatomia completa do corpo humano, qualidade médica | API limitada, menos flexível para embed | Médio |
| **3D4Medical (Elsevier)** | Referência em educação médica | Sem API pública para embed web | N/A |
| **NIH 3D Print Exchange** | Gratuito, modelos científicos reais | Poucos modelos, sem viewer API | Grátis |
| **Three.js + modelos próprios (GLB/GLTF)** | Controle total, sem dependência externa, qualidade garantida | Precisa criar/comprar modelos, mais trabalho inicial | Variável |
| **Turbosquid/CGTrader** | Milhares de modelos médicos de alta qualidade para compra | Compra unitária, sem API de busca dinâmica | $10-200/modelo |

### Recomendação: Estratégia Híbrida

A melhor abordagem custo-benefício seria uma **estratégia híbrida**:

1. **Modelos curados pré-selecionados** — Para cada procedimento (as 6 áreas atuais), selecionar manualmente 3-5 modelos Sketchfab de alta qualidade e salvar seus UIDs no código. Assim o usuário já vê um modelo bom ao entrar, sem precisar buscar.

2. **Manter busca Sketchfab como secundária** — O botão "Buscar" continua disponível para explorar mais modelos.

3. **Futuramente: BioDigital Human** — Se o produto escalar e justificar o investimento, migrar para BioDigital que é o padrão ouro em anatomia 3D interativa para educação.

### Implementação da Estratégia 1 (curação)

Criar um mapa de modelos curados por procedimento em cada página do MedView 3D:

```text
// Exemplo de estrutura
const CURATED_MODELS = {
  "implante-dentario": {
    modelId: "abc123...",  // UID Sketchfab verificado
    name: "Mandíbula com implante"
  },
  "stent-coronario": {
    modelId: "def456...",
    name: "Artéria coronária com stent"
  }
}
```

Cada etapa do procedimento teria um modelo padrão pré-validado que carrega automaticamente, eliminando o problema de "tela de erro" e garantindo qualidade consistente.

### Ação necessária de sua parte

Para implementar a curação, seria necessário:
- Navegar no Sketchfab e selecionar manualmente os melhores modelos para cada procedimento
- Ou: autorizar que eu faça buscas automáticas e salve os melhores resultados como defaults

Quer que eu implemente a estratégia de modelos curados pré-selecionados?

