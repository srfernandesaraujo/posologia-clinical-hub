

## Corrigir erro "Erro ao criar sala" nas Salas Virtuais

### Problema
Todas as politicas RLS da tabela `virtual_rooms` (e tambem `room_participants` e `room_submissions`) estao marcadas como **RESTRICTIVE**. No PostgreSQL, o acesso requer que pelo menos uma politica **PERMISSIVE** seja aprovada. Politicas RESTRICTIVE sozinhas nunca concedem acesso -- elas apenas restringem. Resultado: todo INSERT/UPDATE/DELETE falha silenciosamente.

### Causa Raiz
Mesmo problema ja corrigido para `profiles` e `user_roles`: as politicas foram criadas com tipo RESTRICTIVE em vez de PERMISSIVE.

### Solucao
Executar uma migracao SQL que recria as politicas das 3 tabelas relacionadas a salas virtuais como **PERMISSIVE**:

**Tabelas afetadas:**
- `virtual_rooms` (4 politicas)
- `room_participants` (4 politicas)
- `room_submissions` (4 politicas)

### Detalhes Tecnicos

A migracao vai:

1. **`virtual_rooms`** -- Recriar como PERMISSIVE:
   - Admins can manage all rooms (ALL)
   - Professors can manage their own rooms (ALL)
   - Anyone can view active rooms by PIN (SELECT)

2. **`room_participants`** -- Recriar como PERMISSIVE:
   - Admins can view all participants (SELECT)
   - Professors can view participants in their rooms (SELECT)
   - Public can view participants (SELECT)
   - Anyone can join a room (INSERT)

3. **`room_submissions`** -- Recriar como PERMISSIVE:
   - Admins can view all submissions (SELECT)
   - Professors can view submissions in their rooms (SELECT)
   - Public can view submissions (SELECT)
   - Anyone can submit results to active rooms (INSERT)

Nenhuma alteracao de codigo frontend e necessaria -- o erro vem inteiramente do banco de dados rejeitando a operacao.

