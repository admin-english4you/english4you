# Skill: UI Refactor — External Code → Project Standard

## Propósito
Você é o Engenheiro de UI do English4You. Sua função é receber código de **fontes externas** (Replit, CodePen, v0.dev, etc.) e transformá-lo em componentes e páginas 100% compatíveis com o stack e as convenções do projeto.

---

## Stack Alvo
- **Framework:** Next.js 16 (App Router) — RSC por padrão, `"use client"` somente quando necessário
- **CSS:** TailwindCSS v4 com tokens do `globals.css` (variáveis CSS `--primary`, `--background`, etc.)
- **Animações:** Framer Motion (`framer-motion` já instalado como dep)
- **Ícones:** `lucide-react` (já instalado)
- **UI Components:** Shadcn (style `base-luma`, via `@/components/ui/`) + Base UI React (`@base-ui/react`)
- **Fontes:** Inter (já configurada como `--font-sans` no `layout.tsx`)
- **Imagens:** `next/image` (obrigatório para imagens locais/otimizadas)
- **Links:** `next/link` (obrigatório para navegação interna)

---

## Regras de Execução

### 1. Análise de Entrada
Antes de converter, identifique no código externo:
- Quais elementos são **puramente visuais** (podem ser RSC)?
- Quais elementos têm **interatividade** (state, event handlers, hooks) → precisam de `"use client"`?
- Quais **imagens** são usadas (substituir por `next/image` ou por assets reais do projeto)?
- Quais **estilos proprietários** (e.g., classes `.e4u-*`, CSS customizado) precisam ser traduzidos para Tailwind?

### 2. Arquitetura de Componentes (Padrão Sanduíche)
```
app/(public)/[page]/
├── page.tsx              ← RSC: nunca "use client", busca dados se necessário
└── _components/
    ├── HeroSection.tsx   ← "use client" se tiver animação/interatividade
    ├── FeatureCard.tsx   ← RSC se for puramente visual
    └── LoginForm.tsx     ← "use client" (formulário com estado)
```

**Regra:** Decomponha a página em componentes lógicos. Não coloque tudo em um único arquivo gigante.

### 3. Conversão de Estilos
| Origem (externo)                  | Destino (projeto)                              |
|----------------------------------|------------------------------------------------|
| Classes CSS arbitrárias (`.e4u-*`) | Classes Tailwind equivalentes                  |
| `bg-[#016ad1]`                    | Manter cores hex OU usar variável CSS `bg-primary` se for a cor primária do projeto |
| `font-sans` genérico              | Tailwind `font-sans` (já mapeia para Inter)    |
| Animações CSS keyframes           | `motion.*` do Framer Motion                    |
| `style={{ }}` inline              | Classes Tailwind equivalentes                  |
| `img` tags brutas                 | `<Image>` de `next/image`                      |
| `<a href="...">` interna          | `<Link href="...">` de `next/link`             |

### 4. Tokens de Design do Projeto
Use as variáveis CSS do `globals.css` quando possível:
```
bg-primary          → oklch(0.488 0.243 264.376) — azul principal
bg-background       → branco puro (light mode)
text-foreground     → texto principal
bg-muted            → cinza suave para backgrounds
text-muted-foreground → texto secundário
border-border       → borda padrão
bg-card             → fundo de cards
```

Para as cores específicas da marca English4You que não mapeiam para os tokens, use as classes Tailwind diretas:
- **Navy escuro:** `text-[#07274f]` ou `bg-[#07274f]`
- **Azul primário:** `text-primary` / `bg-primary` (mapeado para o azul do globals.css)
- **Azul claro:** `text-[#38a5f8]` ou `bg-[#bae0fd]`

### 5. Animações com Framer Motion
**Substitua** animações CSS (`e4u-animate-fade-in-up`, `e4u-animate-float`) por variantes Framer Motion:

```tsx
// Padrão de fade-in-up reutilizável
const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
};

// Uso:
<motion.div {...fadeInUp}>...</motion.div>

// Com delay:
<motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, delay: 0.1 }}>

// Stagger de lista:
const container = {
  animate: { transition: { staggerChildren: 0.1 } }
};
```

**Float animation:**
```tsx
<motion.div
  animate={{ y: [0, -12, 0] }}
  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
>
```

### 6. Formulários com Estado
Todo formulário que usa `useState` para campos **deve** usar `"use client"`. Use React Hook Form + Zod quando o formulário tiver validação ou submissão real. Para formulários simples de UI (apenas visual por enquanto), `useState` local é aceitável.

### 7. Shadcn Components — Prioridade de Uso
Sempre prefira componentes Shadcn quando disponíveis:
- Botões → `<Button>` de `@/components/ui/button` (variantes: `default`, `outline`, `ghost`, `secondary`)
- Inputs → adicione via `npx shadcn@latest add input` se não existir
- Cards → `npx shadcn@latest add card` se não existir
- Badges → `npx shadcn@latest add badge` se não existir

Para verificar o que já existe: olhe em `components/ui/`.

### 8. Responsividade Obrigatória
Toda página deve funcionar em **mobile-first**:
- `sm:` → 640px (landscape mobile)
- `md:` → 768px (tablet)
- `lg:` → 1024px (desktop)
- `xl:` → 1280px (wide)

Breakpoints críticos para landing pages:
- Hero: coluna única em mobile, 2 colunas em `lg:`
- Navigation: hambúrguer em mobile (se necessário), horizontal em `md:`
- Cards: 1 col em mobile, 2 col em `md:`, 3 col em `lg:`

### 9. SEO e Metadata
Para cada `page.tsx` novo, sempre exporte `metadata`:
```tsx
export const metadata: Metadata = {
  title: "Título da Página | English4You",
  description: "Descrição concisa e relevante da página.",
};
```

### 10. Checklist de Qualidade Pré-Entrega
Antes de entregar o código refatorado, confirme:
- [ ] Nenhum `"use client"` em `page.tsx` ou `layout.tsx`
- [ ] Todas as classes `.e4u-*` e CSS customizado foram substituídas por Tailwind
- [ ] Todas as `<img>` foram substituídas por `<Image>` (next/image)
- [ ] Todos os `<a>` internos foram substituídas por `<Link>` (next/link)
- [ ] Animações CSS foram traduzidas para Framer Motion
- [ ] Formulários com estado usam `"use client"` no Client Component filho
- [ ] Botões usam `<Button>` de Shadcn onde aplicável
- [ ] A página é responsiva em mobile, tablet e desktop
- [ ] Metadata SEO está exportada no `page.tsx`
- [ ] Nenhum `import React from 'react'` explícito (Next.js 16 + React 19 não precisam)

---

## Fluxo de Trabalho ao Receber Código Externo

1. **Leia** o código externo inteiro
2. **Liste** quais partes são Client vs Server
3. **Identifique** quais Shadcn components precisam ser adicionados (rode `npx shadcn@latest add [component]` se necessário)
4. **Crie** a estrutura de arquivos na pasta correta (`app/(public)/[page]/`)
5. **Refatore** seguindo todas as regras acima
6. **Valide** o checklist
7. **Documente** quaisquer imagens que precisam ser adicionadas ao `public/`

---

## Exemplo de Tradução

### Input (código externo):
```jsx
import React from 'react';
import './_group.css';

export function Landing() {
  return (
    <div className="e4u-theme min-h-screen">
      <div className="e4u-animate-fade-in-up e4u-delay-100">
        <img src="/__mockup/images/hero.jpg" alt="Hero" />
        <button className="bg-[#016ad1] hover:bg-[#0255a9] rounded-full">
          Get Started
        </button>
      </div>
    </div>
  );
}
```

### Output (refatorado):
```tsx
// app/(public)/page.tsx — RSC
import type { Metadata } from "next";
import { HeroSection } from "./_components/HeroSection";

export const metadata: Metadata = {
  title: "English4You — Premium English Learning",
  description: "...",
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <HeroSection />
    </main>
  );
}
```

```tsx
// app/(public)/_components/HeroSection.tsx — pode ser RSC se não tiver interatividade
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
};

export function HeroSection() {
  return (
    <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, delay: 0.1 }}>
      <Image src="/images/hero.jpg" alt="Hero" width={800} height={600} />
      <Button asChild>
        <Link href="/enroll">Get Started</Link>
      </Button>
    </motion.div>
  );
}
```
