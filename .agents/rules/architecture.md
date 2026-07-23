---
trigger: always_on
---

# ARCHITECTURE & MENTAL MODEL (FLUENCYLAB)

## 1. O Paradigma: Thin Client, Fat Server
- **Client (Frontend):** É "burro". Ele não calcula nada, não valida regras de negócio e não conhece o banco de dados. Sua única função é renderizar UI e capturar intenções do usuário (cliques, forms).
- **Server (Backend):** É "gordo". Toda a inteligência, controle de acesso (RBAC) e segurança vivem nas Server Actions e Services.

## 2. Bounded Contexts (Limites de Domínio)
- O projeto usa Pragmatic DDD. Um módulo (ex: `finance`) NÃO PODE acessar o banco de dados diretamente de outro módulo (ex: `user`). 
- Se `finance` precisa de dados do `user`, ele deve chamar o `userService`, nunca o `userRepository`.

## 3. Segurança e Fronteira
- NUNCA confie no input do cliente. Toda Server Action e API DEVE começar com um parsing estrito usando Zod.
- O RBAC (Role-Based Access Control) e a Autorização acontecem ESTRITAMENTE na camada de Service, nunca na UI.
- Padrão de Error Masking: O cliente nunca recebe erros crus (ex: falhas de SQL ou de banco de dados). Ele recebe mensagens sanitizadas via `{ success: false, error: string }`. Use const actionClient = createSafeActionClient