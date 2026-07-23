---
trigger: always_on
---

### Regras Definitivas para Primitivas de Código

**⚙️ Repositories (`[domain].repository.ts`)**
- **Regra:** Comunicação Pura com o Banco.
- **O que faz:** Somente Drizzle (`db.query`, `db.insert`, `db.update`).
- **O que NÃO faz:** Não verifica quem está logado, não tem regra de negócio, não valida Zod. Recebe dados puros e retorna dados puros.

**🧠 Services (`[domain].service.ts`)**
- **Regra:** O Coração do Negócio.
- **O que faz:** Orquestra Repositories, aplica algoritmos (ex: cálculo de SRS), verifica o RBAC (ex: `if (userRole !== 'admin') throw Error`).
- **O que NÃO faz:** Não conhece Next.js, não sabe o que é um Request/Response ou um Cookie, não valida o formato de formulários (Zod).

**🚪 Server Actions (`[domain].actions.ts`)**
- **Regra:** O Porteiro de Entrada do Client.
- **O que faz:** Valida o payload estritamente com Zod. Pega o usuário logado via sessão do servidor (ex: `getCurrentUser()`). Repassa os dados validados para o `Service`. Captura erros (`try/catch`) e mascara falhas, retornando `{ success: true }` ou `{ success: false, error: string }`. E revalida o cache do Next.js (`revalidatePath`).
- **O que NÃO faz:** Não contém regras de negócio complexas e nunca escreve queries do Drizzle.
- **Error Masking:** SEMPRE use `actionClient` ou `protectedAction` de `@/lib/safe-action`. Isso garante que erros internos do servidor (SQL, DB, etc.) sejam mascarados automaticamente antes de chegar ao cliente.

**🔌 APIs (`/app/api/...`)**
- **Regra:** Comunicação com o Mundo Externo.
- **O que faz:** Recebe Webhooks (Mercado Pago, Resend, StreamIO), valida HMAC/Assinaturas, responde aos Cron Jobs do GitHub Actions. Retorna JSON padrão (`NextResponse.json`).
- **O que NÃO faz:** Não são usadas pelo Frontend React. O frontend usa Server Actions, não fetch para rotas internas.

**🔐 Auth Client (`lib/auth-client.ts`)**
- **Regra:** Abstração de Autenticação do Cliente.
- **O que faz:** Coordena chamadas ao Firebase SDK (client-side) e Server Actions. SEMPRE retorna `AuthResult` (`{ success: true, data? } | { success: false, error: string }`). Nunca lança exceções — captura internamente.
- **O que NÃO faz:** Não expõe erros crus do Firebase ao Component. Erros "esperados" (ex: popup fechado pelo usuário) são silenciados retornando `{ success: false, error: "" }`.
- **Padrão de uso no Component:**
  ```tsx
  const result = await authClient.signIn(email, password);
  if (!result.success) {
    if (result.error) toast.error(t(result.error)); // toast, nunca estado inline
    return;
  }
  ```

**🪝 Hooks (`use*.ts`)**
- **Regra:** Gerenciamento de Estado de UI e Fetching.
- **O que faz:** Usa `SWR` para buscar dados (read) e cache. Usa `Zustand` ou `useState` para controlar se uma sidebar está aberta ou um botão está em *loading*. 
- **O que NÃO faz:** Zero lógica de negócio (não calcula se o usuário tem saldo para agendar aula).

**🧩 Components (`.tsx`)**
- **Regra:** Renderização Pura e Estúpida ("Dumb Components").
- **O que faz:** Recebe dados via `props` do servidor. Renderiza Tailwind e Shadcn. Aciona eventos via `onClick` que chamam as Server Actions ou Hooks.
- **O que NÃO faz:** Não busca dados sozinhos (a menos que seja um Client Component encapsulando SWR), não gerencia segredos e **NÃO TEM `try/catch` para erros de autenticação** — isso é responsabilidade do `authClient`.
- **Erros:** SEMPRE use `toast.error()` (Toast). **NUNCA** use estado de erro inline (`setLocalError`) para erros de autenticação.
