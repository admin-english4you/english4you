<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Instruções do Agente

> **Leia PRIMEIRO. Este é o índice mestre do projeto.** As regras detalhadas vivem nos arquivos de `rules/`, as skills em `skills/`. Este arquivo conecta tudo e resolve ambiguidades.
> Preferencialmente verifique 'rules' e as 'skills' apenas quando for necessário.

---

## 🚫 O Que NUNCA Fazer (Anti-Patterns)

1. **NUNCA** use `"use client"` em `page.tsx` ou `layout.tsx`.
2. **NUNCA** acesse o Repository de um módulo a partir de outro módulo. Use o Service.
3. **NUNCA** retorne erros crus de banco para o cliente. Use Error Masking via `safe-action.ts`.
4. **NUNCA** escreva lógica de negócio em Hooks, Components ou Actions.
5. **NUNCA** crie pastas globais como `/services` ou `/repositories`. Use Vertical Slicing em `/modules/` (ex: `/modules/class`, `/modules/payment`).
6. **NUNCA** busque dados no Client Component diretamente (a menos que encapsulado em SWR).
7. **NUNCA** use `try/catch` em Components para capturar erros do `authClient`. O `authClient` retorna `AuthResult` — nunca lança. Exiba erros via `toast.error()`, nunca com estado inline (`setLocalError`).
8. **NUNCA** faça `fetch("/api/auth/...")` direto do frontend. Use Server Actions via `authClient`.
9. **NUNCA** gerencie estado de formulários complexos manualmente com `useState`. Use **React Hook Form** + **Zod** para validação e consistência. (Dica: Use `z.input<typeof schema>` para exportar tipos de form e evitar erros com campos `.default()`).

---

## 🏗️ Arquitetura: Thin Client, Fat Server

```text
Client = "Burro" → Renderiza UI + captura intenções do usuário
Server = "Gordo" → Toda inteligência, RBAC, regras de negócio (ex: status do contrato)

```

### O Padrão "Sanduíche" (Data Flow)

```text
1. Server (Read)    → page.tsx busca dados via Service (ex: db.query)
2. Client (Interact) → page.tsx passa dados via props para _components/
3. Server (Write)   → Client Component chama Server Action para mutações

```

### Exemplo Canônico Completo (EdTech: Sala de Aula)

```text
app/(hub)/teacher/classes/
├── page.tsx                    ← RSC: busca dados, verifica sessão
└── _components/
    ├── StartClassButton.tsx    ← "use client": renderiza UI, chama Actions
    └── ClassBoardVault.tsx     ← "use client": Vault, chama Actions

modules/class/
├── class.schema.ts             ← Drizzle tables + Zod via drizzle-zod (ClassGroup, ClassRecord)
├── class.repository.ts         ← Queries puras (db.query, db.insert)
├── class.service.ts            ← RBAC + regras de negócio (liberar prática IA)
├── class.actions.ts            ← Zod validation + safe-action wrapper
└── class.types.ts              ← Tipos exportados

```

#### `page.tsx` (RSC — NUNCA "use client")

```tsx
// app/(hub)/teacher/classes/page.tsx
import { classService } from "@/modules/class/class.service";
import { getCurrentUser } from "@/lib/auth-server";
import { StartClassButton } from "./_components/StartClassButton";

export default async function TeacherClassesPage() {
  const user = await getCurrentUser();
  const todayClasses = await classService.getTeacherClassesForToday(user.id);

  return <StartClassButton initialData={todayClasses} />;
}
```

#### Client Component (`_components/` — "use client" aqui)

```tsx
// app/(hub)/teacher/classes/_components/StartClassButton.tsx
"use client";
import { finishClassAction } from "@/modules/class/class.actions";
import { toast } from "@/components/ui/toaster";

export function StartClassButton({ initialData }) {
  const handleFinishClass = async (recordId: string, lessonId: string) => {
    // Action chamada direto do client
    const result = await finishClassAction({ recordId, lessonId });

    if (result.success) {
      toast.success("Aula concluída e prática IA liberada!");
    } else {
      toast.error(result.error);
    }
  };

  return (/* UI com botão que chama handleFinishClass */);
}

```

#### Server Action (Porteiro — thin, sem lógica)

```tsx
// modules/class/class.actions.ts
"use server";
import { protectedAction } from "@/lib/safe-action";
import { finishClassSchema } from "./class.schema";
import { classService } from "./class.service";
import { revalidatePath } from "next/cache";

export const finishClassAction = protectedAction
  .schema(finishClassSchema)
  .action(async ({ parsedInput, ctx }) => {
    // Repassa para o Service. ctx.user injetado pelo protectedAction.
    await classService.finishClassAndUnlockPractice(ctx.user.id, parsedInput);
    revalidatePath("/teacher/classes");
    return { success: true };
  });
```

#### Service (O Coração — toda a inteligência aqui)

```tsx
// modules/class/class.service.ts
import { classRepository } from "./class.repository";
import { lessonRepository } from "@/modules/lesson/lesson.repository";

export const classService = {
  async finishClassAndUnlockPractice(
    teacherId: string,
    data: { recordId: string; lessonId: string },
  ) {
    const record = await classRepository.findRecordById(data.recordId);

    if (!record) throw new Error("Registro de aula não encontrado");
    if (record.teacherId !== teacherId) throw new Error("Sem permissão"); // RBAC/ABAC
    if (record.completed) throw new Error("Aula já foi encerrada"); // Business Rule

    // 1. Marca aula como concluída
    await classRepository.markAsCompleted(data.recordId);

    // 2. Libera a prática da IA na Lição atrelada
    await lessonRepository.unlockPracticeForLesson(data.lessonId);
  },
};
```

#### Repository (DB puro — sem lógica, sem checks)

```tsx
// modules/class/class.repository.ts
import { db } from "@/lib/db";
import { classRecordsTable } from "./class.schema";
import { eq } from "drizzle-orm";

export const classRepository = {
  async findRecordById(id: string) {
    return db.query.classRecordsTable.findFirst({
      where: eq(classRecordsTable.id, id),
    });
  },
  async markAsCompleted(id: string) {
    await db
      .update(classRecordsTable)
      .set({ completed: true })
      .where(eq(classRecordsTable.id, id));
  },
};
```

---

## 📐 Regras Detalhadas (Referências)

As regras completas vivem em arquivos separados. **Leia-os quando for implementar:**

| Arquivo                         | Conteúdo                                                                       | Quando ler                |
| ------------------------------- | ------------------------------------------------------------------------------ | ------------------------- |
| `.agents/rules/architecture.md` | Paradigma Thin/Fat, Bounded Contexts, Segurança                                | Sempre                    |
| `.agents/rules/structure.md`    | Padrão Sanduíche, regras de RSC, Client Components, Server Actions, Diretórios | Sempre                    |
| `.agents/rules/primitives.md`   | O que cada camada FAZ e NÃO FAZ (Repository, Service, Action, Hook, Component) | Ao criar qualquer arquivo |

---

## 🛠️ Skills — Quando Usar Qual

Cada skill é um manual especializado. **Use a skill correspondente ao tipo de arquivo que está criando:**

| Quando o pedido envolve...                     | Skill                       | Arquivo                            |
| ---------------------------------------------- | --------------------------- | ---------------------------------- |
| Criar/alterar tabelas Neon ou validações Zod   | **Model & Schema**          | `.agents/skills/model-writer.md`   |
| Implementar regras de negócio, RBAC, bloqueios | **Service Layer**           | `.agents/skills/service-writer.md` |
| Criar endpoint de mutação (Server Action)      | **Server Actions**          | `.agents/skills/action-writer.md`  |
| Lógica de UI, TipTap, chamadas Stream.io       | **UI Hooks**                | `.agents/skills/hook-writer.md`    |
| Webhooks Mercado Pago, Resend                  | **External Boundaries**     | `.agents/skills/route-writer.md`   |
| Testes unitários                               | **Testing**                 | `.agents/skills/test-writer.md`    |
| Realizar deploys Vercel ou gerenciar infra     | **Infrastructure & Deploy** | `.agents/skills/deploy-manager.md` |

---

## 📏 Convenções de Naming

```text
modules/[domain]/[domain].schema.ts      → Tabelas Drizzle + Zod (ex: payment.schema.ts)
modules/[domain]/[domain].repository.ts  → Queries puras
modules/[domain]/[domain].service.ts     → Lógica de negócio + RBAC
modules/[domain]/[domain].actions.ts     → Server Actions (porteiro)
modules/[domain]/[domain].types.ts       → Tipos compartilhados

app/(hub)/[role]/[feature]/page.tsx      → RSC (NUNCA "use client", ex: /admin/finance)
app/(hub)/[role]/[feature]/_components/  → Client Components locais

hooks/use[Name].ts                       → Lógica de UI (SWR, Zustand)
components/ui/                           → Design System (Shadcn)
components/layout/                       → Header, Sidebar, Navigation
lib/                                     → Singletons e configs (db, stripe, resend)
utils/                                   → Funções puras (date, format, sanitize)

```

---

## ⚡ Quick Reference: Camadas e Responsabilidades

```text
┌─────────────────────────────────────────────────────────────────┐
│ page.tsx (RSC)          → Busca dados, verifica sessão          │
│   └─ _components/*.tsx  → "use client", renderiza, chama Actions│
│        └─ Action        → Valida Zod, pega user, chama Service  │
│            └─ Service   → RBAC, regras de negócio, orquestra    │
│                 └─ Repo → Drizzle queries puras                 │
└─────────────────────────────────────────────────────────────────┘

```

| Camada        | Conhece Next.js? | Conhece Banco? | Tem Lógica de Negócio? |
| ------------- | ---------------- | -------------- | ---------------------- |
| page.tsx      | ✅               | Via Service    | ❌                     |
| \_components/ | ✅               | ❌             | ❌                     |
| Action        | ✅ (revalidate)  | ❌             | ❌                     |
| Service       | ❌               | Via Repository | ✅                     |
| Repository    | ❌               | ✅ (Drizzle)   | ❌                     |
| Hook          | ✅               | ❌             | ❌                     |
