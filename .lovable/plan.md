

## Plano: Simulador de Dispensação — Portaria 344/98

### Resumo
Criar um simulador imersivo de dispensação de medicamentos controlados (Portaria 344/98) na categoria "Farmácia Clínica". O estudante atuará como farmacêutico no balcão de uma farmácia, recebendo prescrições (Notificação A amarela, B azul e Receita de Controle Especial branca) e deverá validar todos os campos legais, identificar erros, orientar o paciente e decidir se dispensa ou não o medicamento.

### Competências Avaliadas
- **Conhecimento**: Listas A1/A2/A3 (entorpecentes), B1/B2 (psicotrópicos), C1 (controle especial); validade das notificações (30 dias); quantidades máximas (A: 5 ampolas ou 30 dias; B: 5 ampolas ou 60 dias; C1: 5 ampolas ou 60 dias, max 3 substâncias por receita); retenção de vias; regras de emergência
- **Habilidades**: Conferência de campos obrigatórios (emitente, paciente, medicamento, data, assinatura, comprador, fornecedor); verificação de validade e UF; cálculo de quantidade vs tratamento; identificação de associações proibidas (Art. 47/48)
- **Atitudes**: Acolhimento ao paciente; comunicação empática ao recusar; orientação sobre uso/armazenamento; sigilo; postura ética

### Estrutura do Simulador

O simulador segue o padrão existente (built-in cases + AI cases + virtual rooms). Cada caso apresenta:

**Cenário**: Paciente chega ao balcão com uma prescrição. O estudante vê a prescrição renderizada visualmente (SVG/HTML estilizado nas cores corretas: amarela, azul ou branca) com campos preenchidos — alguns corretos, outros com erros propositais.

**Fluxo em 5 etapas por caso**:
1. **Acolhimento** — Diálogo inicial: o "paciente" apresenta-se; aluno escolhe abordagem (atitude)
2. **Análise da Prescrição** — Visualização do documento; aluno marca via checklist quais campos estão corretos/incorretos/ausentes
3. **Verificação Legal** — Perguntas sobre validade, lista/tipo de notificação exigida, quantidade máxima permitida, retenção de vias
4. **Decisão** — Dispensar, recusar ou dispensar parcialmente; com justificativa
5. **Orientação ao Paciente** — Checklist de orientações (uso, armazenamento, não compartilhar, efeitos adversos, retorno)

**Pontuação**: Acurácia na identificação de erros + acerto na decisão legal + qualidade da orientação

### Casos Nativos (3 built-in)

1. **Notificação A (Amarela)** — Morfina 10mg comprimidos. Erros: data vencida (>30 dias), campo do comprador incompleto, quantidade acima do permitido (40 dias de tratamento)
2. **Notificação B (Azul)** — Clonazepam 2mg gotas. Erros: notificação de outra UF sem receita com justificativa, prescrição por dentista para uso não-odontológico
3. **Receita Controle Especial (Branca)** — Pregabalina 75mg + Clonidina 0,15mg + Tramadol 50mg + Carbamazepina 200mg. Erro: 4 substâncias C1 (máximo 3 por receita), falta da 2ª via

### Prescrições Visuais (SVG/HTML)
Componentes React que replicam visualmente os 3 formulários com as cores e campos das imagens enviadas:
- `PrescricaoAmarelaA` — fundo amarelo, campos de UF/Número, Emitente, Paciente, Medicamento, Posologia, Data, Assinatura, Comprador, Fornecedor
- `PrescricaoAzulB` — fundo azul, mesma estrutura
- `ReceitaControleEspecial` — fundo branco, layout 2 vias (1ª Farmácia, 2ª Paciente)

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/pages/simuladores/farmacologia/SimuladorDispensacao344.tsx` | **Criar** — componente principal (~500 linhas) |
| `src/components/simulators/prescricoes/PrescricaoAmarelaA.tsx` | **Criar** — render visual da Notificação A |
| `src/components/simulators/prescricoes/PrescricaoAzulB.tsx` | **Criar** — render visual da Notificação B |
| `src/components/simulators/prescricoes/ReceitaControleEspecial.tsx` | **Criar** — render visual da Receita C |
| `src/pages/Simuladores.tsx` | **Editar** — adicionar entrada na lista NATIVE_SIMULATORS |
| `src/App.tsx` | **Editar** — adicionar rota `/simuladores/dispensacao-344` e rota de sala virtual |

### Detalhes Técnicos
- Categoria no catálogo: **"Farmácia Clínica"** (junto com SOAP, MAI, PRM)
- Slug: `dispensacao-344`
- Integração com `useSimulatorCases`, `useVirtualRoomCase`, `ExamBanner`, `ExamFeedbackOverlay` e `SimulatorHowToUse` (padrão existente)
- Cada prescrição visual recebe props com os dados do caso (podendo exibir campos corretos ou com erros)
- Feedback formativo ao final com referências aos artigos da Portaria 344 relevantes

