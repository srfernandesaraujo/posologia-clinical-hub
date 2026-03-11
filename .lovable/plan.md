

# Simuladores Educacionais para Treinamento de Professores

## Contexto

A plataforma já possui um ecossistema robusto de simuladores para alunos (farmácia clínica, fisiologia, bioquímica, farmacologia, etc.) e infraestrutura de Salas Virtuais para professores. O que falta é treinar o professor enquanto educador — como ensinar, avaliar, dar feedback e conduzir aulas de forma eficaz. Isso é um diferencial de mercado enorme porque praticamente nenhuma edtech de saúde foca no docente como aprendiz.

---

## Simuladores Propostos

### 1. Simulador de Feedback Formativo (Pendleton / R2C2 / ALOBA)
- **O que treina**: A habilidade de dar feedback construtivo a alunos após avaliações clínicas
- **Mecânica**: O professor recebe um cenário (aluno X fez Y no simulador com score Z e erros específicos). Deve estruturar seu feedback seguindo um modelo validado (Pendleton, R2C2 ou ALOBA). A cada etapa do modelo, escolhe entre opções de frases — algumas empáticas e produtivas, outras punitivas ou vagas. O sistema pontua a qualidade do feedback
- **Impacto**: Professores frequentemente dão feedback ineficaz (genérico, punitivo ou omisso). Este simulador treina a competência mais crítica do docente clínico
- **Conexão com o sistema**: Usa dados reais da estrutura de Salas Virtuais como cenários

### 2. Simulador de Elaboração de Questões (Taxonomia de Bloom)
- **O que treina**: Criar questões de avaliação em diferentes níveis cognitivos
- **Mecânica**: O professor recebe um objetivo de aprendizagem e deve elaborar questões que atendam a um nível específico de Bloom (Lembrar → Compreender → Aplicar → Analisar → Avaliar → Criar). O sistema apresenta questões-exemplo e o professor deve classificá-las ou reescrevê-las para subir de nível taxonômico. Inclui análise automática de verbos-chave
- **Impacto**: A maioria dos docentes cria questões apenas nos níveis "Lembrar" e "Compreender". Este simulador força a prática de níveis superiores
- **Diferencial**: Nenhum sistema no mercado oferece treinamento prático de elaboração de questões com feedback imediato

### 3. Simulador de Condução de Caso Clínico (Team-Based Learning / PBL)
- **O que treina**: A habilidade de facilitar discussões em grupo sem dar a resposta diretamente
- **Mecânica**: O professor é colocado como facilitador de um caso PBL/TBL com "alunos virtuais" que fazem perguntas, dão respostas erradas ou ficam em silêncio. O professor deve escolher entre intervenções: fazer perguntas socráticas, redirecionar, provocar debate entre pares, ou intervir diretamente. O sistema avalia se o professor está sendo facilitador (bom) ou palestrante disfarçado (ruim)
- **Impacto**: PBL/TBL é amplamente adotado mas mal executado — professores não sabem facilitar sem "dar aula"
- **Diferencial**: Simula a dinâmica de grupo com personas de alunos com diferentes perfis (tímido, dominante, errado-mas-confiante)

### 4. Simulador de Planejamento de Aula por Competências (DCNs)
- **O que treina**: Construir planos de aula alinhados às Diretrizes Curriculares Nacionais
- **Mecânica**: O professor seleciona uma competência das DCNs de Farmácia (ou área correlata), define objetivo de aprendizagem, escolhe metodologias ativas (sala invertida, TBL, simulação, estudo de caso) e métodos avaliativos. O sistema verifica o alinhamento construtivo (Biggs): objetivo ↔ metodologia ↔ avaliação. Pontua coerência e sugere ajustes
- **Impacto**: Obrigatório para credenciamento MEC mas raramente treinado de forma prática
- **Diferencial**: Automatiza a verificação de alinhamento construtivo — algo que coordenadores de curso fazem manualmente

### 5. Simulador de Gestão de Sala de Aula (Incidentes Críticos)
- **O que treina**: Responder a situações difíceis em tempo real durante uma aula
- **Mecânica**: O professor está "dando aula" e recebe incidentes aleatórios: aluno questiona a competência do professor, dois alunos discutem, aluno apresenta sinais de crise emocional, aluno cola na prova, turma inteira não fez a leitura prévia. O professor escolhe entre 3-4 respostas possíveis. O sistema avalia assertividade, empatia e manutenção do ambiente de aprendizagem
- **Impacto**: Professores iniciantes frequentemente não sabem lidar com conflitos em sala
- **Diferencial**: Gamificação de soft skills docentes — inexistente no mercado

### 6. Simulador de Avaliação por Rubrica (OSCE / Mini-CEX)
- **O que treina**: Avaliar desempenho clínico de alunos de forma objetiva e padronizada
- **Mecânica**: O professor assiste a um "vídeo descritivo" (narrativa textual com dados) de um aluno realizando uma estação OSCE (ex: dispensação, anamnese farmacêutica). Deve preencher uma rubrica com critérios pré-definidos (comunicação, raciocínio clínico, técnica). O sistema compara a avaliação do professor com um gabarito de especialistas e calcula o índice de concordância (kappa)
- **Impacto**: A variabilidade entre avaliadores é o maior problema do OSCE. Treinar calibração é essencial
- **Diferencial**: Substitui workshops presenciais caros de calibração de avaliadores

### 7. Simulador de Preceptoria Clínica (One-Minute Preceptor)
- **O que treina**: O modelo de ensino clínico rápido em ambiente de estágio/residência
- **Mecânica**: O professor está em um cenário de preceptoria: o aluno/residente apresenta um caso em 2 minutos. O professor deve seguir os 5 passos do One-Minute Preceptor: (1) comprometer-se com uma hipótese, (2) sondar evidências, (3) ensinar regras gerais, (4) reforçar acertos, (5) corrigir erros. A cada passo, escolhe entre abordagens e o sistema avalia aderência ao modelo
- **Impacto**: Preceptores clínicos raramente recebem treinamento pedagógico formal
- **Diferencial**: Único simulador de preceptoria clínica no mercado brasileiro

---

## Arquitetura Técnica

- **Categoria**: "Formação Docente" no catálogo de simuladores, com ícone dedicado (GraduationCap)
- **Padrão**: Mesma arquitetura dos simuladores existentes — steps/panels, pontuação, integração com Salas Virtuais e modo exame
- **Dados**: Todos os cenários são estáticos no frontend (arrays de incidentes, rubricas, modelos de feedback) — sem necessidade de IA ou backend adicional
- **Integração**: Professores com role `professor` ou `admin` veem a categoria destacada. Alunos de licenciatura ou pós-graduação também podem acessar

---

## Prioridade de Implementação Sugerida

1. **Feedback Formativo** — conecta diretamente ao Agente de Feedback já existente
2. **Elaboração de Questões (Bloom)** — alta demanda, baixa complexidade
3. **Preceptoria Clínica (OMP)** — diferencial único
4. **Avaliação por Rubrica (OSCE)** — complementa Salas Virtuais
5. **Condução de Caso (PBL/TBL)** — mais complexo, maior impacto
6. **Planejamento de Aula (DCNs)** — valor institucional
7. **Gestão de Sala (Incidentes)** — gamificação de soft skills

---

## Diferencial de Mercado

Nenhuma plataforma edtech de saúde no Brasil (ou globalmente) oferece simuladores dedicados ao treinamento pedagógico do professor. Plataformas como Lecturio, Osmosis, Geeky Medics e Sanar focam exclusivamente no aluno. Ter uma vertical de "Formação Docente" posiciona o sistema como solução institucional completa — não apenas para alunos, mas para o desenvolvimento docente exigido pelo MEC (Resolução CNE/CES nº 7/2018).

