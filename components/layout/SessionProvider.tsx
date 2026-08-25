"use client";

import { createContext, useContext } from "react";
import type { Role } from "@/modules/user/user.types";

export interface SessionUserView {
  id: string;
  name: string;
  /** Usado pela reautenticação do admin (`IdentityVault`), que precisa do
   *  e-mail para chamar `signInWithEmailAndPassword` no Firebase. */
  email: string;
  role: Role;
  avatarUrl: string | null;
}

/**
 * Identidade do usuário logado, resolvida no SERVIDOR e entregue já pronta ao
 * primeiro render.
 *
 * Existe para matar um flash: o `AppHeader` tinha valores de exemplo
 * ("Sarah Jenkins", "Diretora Escolar") como default de prop e buscava o
 * usuário real num `useEffect` depois da hidratação. Como o `AppLayout` é um
 * Client Component remontado a cada navegação, o nome falso reaparecia a cada
 * troca de página até a Server Action responder.
 *
 * Com o contexto preenchido pelo `(hub)/layout.tsx`, o HTML que sai do servidor
 * já tem o nome certo — não há segundo render para piscar.
 */
const SessionContext = createContext<SessionUserView | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUserView;
  children: React.ReactNode;
}) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

/**
 * `null` apenas fora do provider (nenhuma tela do `(hub)` está nessa situação
 * hoje). Quem consome trata o nulo em vez de quebrar, para uma futura tela
 * fora do hub não derrubar o header.
 */
export function useSessionUser(): SessionUserView | null {
  return useContext(SessionContext);
}
