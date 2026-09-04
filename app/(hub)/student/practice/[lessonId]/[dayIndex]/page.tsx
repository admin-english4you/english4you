import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { AppError, BlockedPracticeError } from "@/lib/errors";
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
  const session = await getSession(currentUser.id, lessonId, day);

  return <PracticePlayer session={session} />;
}

async function getSession(userId: string, lessonId: string, dayIndex: number) {
  try {
    return await progressService.getPracticeSession(userId, lessonId, dayIndex);
  } catch (error) {
    // BlockedPracticeError = o aluno TEM posse do dia, mas ele já foi
    // concluído/expirou/ainda não abriu — não é "não encontrado", é um
    // estado de negócio. Redireciona com uma mensagem em vez de 404: um
    // refresh acidental (ex.: depois de terminar a prática) ou uma sessão
    // longa que atravessou a virada do dia não pode quebrar a tela.
    if (error instanceof BlockedPracticeError) {
      redirect(`/student/practice?notice=${encodeURIComponent(error.message)}`);
    }
    // AppError genérico = sem posse / sem conteúdo: 404 de verdade.
    if (error instanceof AppError) notFound();
    throw error;
  }
}
