import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aula | English4You",
  description: "Material da aula e chamada de vídeo com a turma.",
};

/**
 * Shell de viewport inteira para a sala de aula.
 *
 * Não renderiza o AppLayout de propósito: a sala precisa de 100% da altura
 * para dividir conteúdo e vídeo, sem sidebar, header nem o padding do <main>.
 * Como o AppLayout é composto dentro dos client components (e não em um
 * layout.tsx de rota), basta não usá-lo aqui.
 */
export default function ClassRoomLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-screen overflow-hidden bg-slate-950 text-slate-100">{children}</div>;
}
