import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { todayKey } from "@/lib/date";
import { classService } from "@/modules/class/class.service";
import { LiveClassRoom } from "./_components/LiveClassRoom";

interface StudentClassRoomPageProps {
  params: Promise<{ recordId: string }>;
}

export default async function StudentClassRoomPage({ params }: StudentClassRoomPageProps) {
  const { recordId } = await params;

  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  // Devolve null quando a aula não é da turma do aluno — a posse é validada
  // no service, não aqui.
  const record = await classService.getStudentClassRecord(currentUser.id, recordId);
  if (!record) notFound();

  // A lição bloqueada não deve ser lida, mesmo sendo da turma do aluno.
  if (!record.lesson || record.lesson.status === "DISABLED") notFound();

  return <LiveClassRoom record={record} selfName={currentUser.name} todayKey={todayKey()} />;
}
