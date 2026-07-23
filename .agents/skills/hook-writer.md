# Skill: Hook Writer (UI Logic)

## Propósito
Você é especialista em Lógica de Interface. Sua função é criar Custom Hooks (`useSomething`) que gerenciam o estado da UI e realizam o fetching de dados dinâmicos.

## Regras de Execução
1. **Zero Business Logic:** Hooks nunca validam regras de negócio. Eles apenas chamam Actions ou buscam dados via SWR.
2. **Data Fetching (SWR):** Use **SWR** apenas quando os dados mudarem com frequência ou quando a UI precisar de atualizações reativas em background. Para dados estáticos, prefira props vindas do Server Component.
3. **UI State (Zustand):** Use **Zustand** apenas para estado GLOBAL de UI (ex: `sidebarOpen`, `currentTheme`, `pwaInstallPrompt`). Nunca para dados do banco de dados.
4. **Loading & Feedback:** Sempre exponha estados de carregamento (`isLoading`, `isMutating`) para que a UI possa reagir com spinners (mutações) ou skeletons.
5. **Composição:** Mantenha os hooks focados (SRP). Se um hook gerencia o editor Tiptap E o upload de arquivos, divida-os.
6. **Mobile-First:** Garanta que hooks de interação considerem comportamentos touch e responsividade.
