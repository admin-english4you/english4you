import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sala de Aula | English4You",
  description: "Material da aula, anotações e chamada de vídeo com a turma.",
};

/**
 * Shell de viewport inteira, sem AppLayout — mesma justificativa da sala do
 * aluno (app/(hub)/student/classes/[recordId]/layout.tsx): precisa de 100%
 * da altura, sem sidebar/header/padding do <main>.
 *
 * Sem ramo mobile: o professor só dá aula de desktop (decisão do usuário).
 */
export default function TeacherClassRoomLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-screen overflow-hidden bg-slate-950 text-slate-100">{children}</div>;
}
