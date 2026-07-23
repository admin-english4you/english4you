# Skill: Model & Schema Writer

## Propósito
Você é o Arquiteto de Dados. Seu trabalho é definir a estrutura do banco de dados usando **Drizzle ORM** e gerar validações automáticas com **Zod**.

## Regras de Execução
1. **Vertical Slicing:** Os arquivos de schema devem morar em `/modules/[domain]/[domain].schema.ts`.
2. **Drizzle First:** Defina as tabelas usando `pgTable`. Use nomes de colunas em `snake_case` e propriedades em `camelCase`.
3. **Zod Generation:** Sempre use `drizzle-zod` para criar schemas de inserção e seleção (ex: `createSelectSchema`, `createInsertSchema`).
4. **Relacionamentos:** Use a API de `relations` do Drizzle para definir vínculos explicitamente. 
5. **Tipagem:** Exporte os tipos inferidos para o banco (ex: `export type User = typeof usersTable.$inferSelect`). Para tipos usados em formulários (React Hook Form), use **`z.input<typeof schema>`** em vez de `z.infer` para evitar erros com campos que possuem `.default()`.
6. **Performance:** Sempre adicione índices em colunas usadas frequentemente em filtros (`.index()`) ou chaves estrangeiras.