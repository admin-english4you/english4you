<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# FLUENCYLAB — Agent Instructions

> **Leia PRIMEIRO. Este é o índice mestre do projeto.** As regras detalhadas vivem nos arquivos de `rules/`, as skills em `skills/`. Este arquivo conecta tudo e resolve ambiguidades.
> Preferencialmente verifique 'rules' e as 'skills' apenas quando for necessário.

---

## 🚫 O Que NUNCA Fazer (Anti-Patterns)

1. **NUNCA** use `"use client"` em `page.tsx` ou `layout.tsx`.
2. **NUNCA** acesse o Repository de um módulo a partir de outro módulo. Use o Service.
3. **NUNCA** retorne erros crus de banco para o cliente. Use Error Masking via `safe-action.ts`.
4. **NUNCA** escreva lógica de negócio em Hooks, Components ou Actions.
7. **NUNCA** crie pastas globais como `/services` ou `/repositories`. Use Vertical Slicing em `/modules/`.
8. **NUNCA** busque dados no Client Component diretamente (a menos que encapsulado em SWR).
9. **NUNCA** use `try/catch` em Components para capturar erros do `authClient`. O `authClient` retorna `AuthResult` — nunca lança. Exiba erros via `toast.error()`, nunca com estado inline (`setLocalError`).
10. **NUNCA** faça `fetch("/api/auth/...")` direto do frontend. Use Server Actions via `authClient`.
11. **NUNCA** gerencie estado de formulários complexos manualmente com `useState`. Use **React Hook Form** + **Zod** para validação e consistência. (Dica: Use `z.input<typeof schema>` para exportar tipos de form e evitar erros com campos `.default()`).

---

## 🏗️ Arquitetura: Thin Client, Fat Server

```
Client = "Burro" → Renderiza UI + captura intenções do usuário
Server = "Gordo" → Toda inteligência, RBAC, segurança, regras de negócio
```

### O Padrão "Sanduíche" (Data Flow)

```
1. Server (Read)    → page.tsx busca dados via Service
2. Client (Interact) → page.tsx passa dados via props para _components/
3. Server (Write)   → Client Component chama Server Action para mutações
```

### Exemplo Canônico Completo

```
app/(hub)/student/my-classes/
├── page.tsx                    ← RSC: busca dados, verifica sessão
└── _components/
    ├── NextClassCard.tsx       ← "use client": renderiza UI, chama Actions
    └── CancelClassVault.tsx   ← "use client": Vault, chama Actions

modules/class/
├── class.schema.ts             ← Drizzle tables + Zod via drizzle-zod
├── class.repository.ts         ← Queries puras (db.query, db.insert)
├── class.service.ts            ← RBAC + regras de negócio
├── class.actions.ts            ← Zod validation + safe-action wrapper
└── class.types.ts              ← Tipos exportados
```

#### page.tsx (RSC — NUNCA "use client")
```tsx
// app/(hub)/student/my-classes/page.tsx
import { classService } from "@/modules/class/class.service";
import { getCurrentUser } from "@/lib/auth-server";
import { NextClassCard } from "./_components/NextClassCard";

export default async function MyClassesPage() {
  const user = await getCurrentUser();
  const classes = await classService.getStudentClasses(user.id);
  return <NextClassCard initialData={classes} />;
}
```

#### Client Component (_components/ — "use client" aqui)
```tsx
// app/(hub)/student/my-classes/_components/NextClassCard.tsx
"use client";
import { cancelClassAction } from "@/modules/class/class.actions";
import { toast } from "@/components/ui/toaster";

export function NextClassCard({ initialData }) {
  const handleCancel = async (classId: string) => {
    const result = await cancelClassAction({ classId });
    if (result.success) notify.success("Aula cancelada!");
    else toast.error(result.error);
  };
  return (/* UI com botão que chama handleCancel */);
}
```

#### Server Action (Porteiro — thin, sem lógica)
```tsx
// modules/class/class.actions.ts
"use server";
import { protectedAction } from "@/lib/safe-action";
import { cancelClassSchema } from "./class.schema";
import { classService } from "./class.service";

export const cancelClassAction = protectedAction
  .schema(cancelClassSchema)
  .action(async ({ parsedInput, ctx }) => {
    await classService.cancelClass(ctx.user.id, parsedInput.classId);
    revalidatePath("/student/my-classes");
    return { success: true };
  });
```

#### Service (O Coração — toda a inteligência aqui)
```tsx
// modules/class/class.service.ts
import { classRepository } from "./class.repository";

export const classService = {
  async cancelClass(userId: string, classId: string) {
    const cls = await classRepository.findById(classId);
    if (!cls) throw new Error("Aula não encontrada");
    if (cls.studentId !== userId) throw new Error("Sem permissão"); // ABAC
    if (cls.startsAt < new Date()) throw new Error("Aula já começou"); // Business rule
    await classRepository.updateStatus(classId, "cancelled");
  },
};
```

#### Repository (DB puro — sem lógica, sem checks)
```tsx
// modules/class/class.repository.ts
import { db } from "@/lib/db";
import { classesTable } from "./class.schema";
import { eq } from "drizzle-orm";

export const classRepository = {
  async findById(id: string) {
    return db.query.classesTable.findFirst({ where: eq(classesTable.id, id) });
  },
  async updateStatus(id: string, status: string) {
    await db.update(classesTable).set({ status }).where(eq(classesTable.id, id));
  },
};
```

---

## 📐 Regras Detalhadas (Referências)

As regras completas vivem em arquivos separados. **Leia-os quando for implementar:**

| Arquivo | Conteúdo | Quando ler |
|---|---|---|
| `.agents/rules/architecture.md` | Paradigma Thin/Fat, Bounded Contexts, Segurança | Sempre |
| `.agents/rules/structure.md` | Padrão Sanduíche, regras de RSC, Client Components, Server Actions, Diretórios | Sempre |
| `.agents/rules/primitives.md` | O que cada camada FAZ e NÃO FAZ (Repository, Service, Action, Hook, Component) | Ao criar qualquer arquivo |

---

## 🛠️ Skills — Quando Usar Qual

Cada skill é um manual especializado. **Use a skill correspondente ao tipo de arquivo que está criando:**

| Quando o pedido envolve... | Skill | Arquivo |
|---|---|---|
| Criar/alterar tabelas ou validações | **Model & Schema** | `.agents/skills/model-writer.md` |
| Implementar regras de negócio, RBAC | **Service Layer** | `.agents/skills/service-writer.md` |
| Criar endpoint de mutação (Server Action) | **Server Actions** | `.agents/skills/action-writer.md` |
| Lógica de UI, fetching, estado | **UI Hooks** | `.agents/skills/hook-writer.md` |
| Webhooks, integrações externas | **External Boundaries** | `.agents/skills/route-writer.md` |
| Testes unitários | **Testing** | `.agents/skills/test-writer.md` |
| Realizar deploys ou gerenciar infra | **Infrastructure & Deploy** | `.agents/skills/deploy-manager.md` |

---

## 📏 Convenções de Naming

```
modules/[domain]/[domain].schema.ts      → Tabelas Drizzle + Zod
modules/[domain]/[domain].repository.ts  → Queries puras
modules/[domain]/[domain].service.ts     → Lógica de negócio + RBAC
modules/[domain]/[domain].actions.ts     → Server Actions (porteiro)
modules/[domain]/[domain].types.ts       → Tipos compartilhados

app/(hub)/[role]/[feature]/page.tsx      → RSC (NUNCA "use client")
app/(hub)/[role]/[feature]/_components/  → Client Components locais

hooks/use[Name].ts                       → Lógica de UI (SWR, Zustand)
components/ui/                           → Design System (Shadcn)
components/layout/                       → Header, Sidebar, Navigation
lib/                                     → Singletons e configs globais
utils/                                   → Funções puras (date, format, sanitize)
```

---

## ⚡ Quick Reference: Camadas e Responsabilidades

```
┌─────────────────────────────────────────────────────────────────┐
│ page.tsx (RSC)          → Busca dados, verifica sessão          │
│   └─ _components/*.tsx  → "use client", renderiza, chama Actions│
│        └─ Action        → Valida Zod, pega user, chama Service  │
│             └─ Service  → RBAC, regras de negócio, orquestra    │
│                  └─ Repository → Drizzle queries puras          │
└─────────────────────────────────────────────────────────────────┘
```

| Camada | Conhece Next.js? | Conhece Banco? | Tem Lógica de Negócio? |
|---|---|---|---|
| page.tsx | ✅ | Via Service | ❌ |
| _components/ | ✅ | ❌ | ❌ |
| Action | ✅ (revalidate) | ❌ | ❌ |
| Service | ❌ | Via Repository | ✅ |
| Repository | ❌ | ✅ (Drizzle) | ❌ |
| Hook | ✅ | ❌ | ❌ |
