import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { AppError } from "@/lib/errors";
import { progressService } from "@/modules/progress/progress.service";
import { PracticePlayer } from "./_components/PracticePlayer";

export const metadata: Metadata = {
  title: "Prática | English4You",
};

interface PracticePlayerPageProps {
  params: Promise<{ lessonId: string; dayIndex: string }>;
}

export default async function PracticePlayerPage({ params }: PracticePlayerPageProps) {
  const { lessonId, dayIndex } = await params;

  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const day = Number(dayIndex);
  if (!Number.isInteger(day) || day < 1 || day > 6) notFound();

  // O service é o ponto de estrangulamento de posse: valida que a lição está
  // entre as aulas já dadas da turma do aluno e que o dia é jogável.
  // O await fica fora do JSX porque erros de render não seriam pegos por um
  // try/catch — só a busca de dados é protegida aqui.
  const session = await getSessionOrNull(currentUser.id, lessonId, day);
  if (!session) notFound();

  return <PracticePlayer session={session} />;
}

async function getSessionOrNull(userId: string, lessonId: string, dayIndex: number) {
  try {
    return await progressService.getPracticeSession(userId, lessonId, dayIndex);
  } catch (error) {
    // AppError = regra de negócio (dia travado, sem posse, sem conteúdo): 404.
    // Qualquer outra falha é erro real e deve subir.
    if (error instanceof AppError) return null;
    throw error;
  }
}
