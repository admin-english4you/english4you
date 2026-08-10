import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { classService } from "@/modules/class/class.service";
import { TeacherClassRoom } from "./_components/TeacherClassRoom";

interface TeacherClassRoomPageProps {
  params: Promise<{ recordId: string }>;
}

export default async function TeacherClassRoomPage({ params }: TeacherClassRoomPageProps) {
  const { recordId } = await params;

  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/staff/login");

  // Devolve null quando a aula não é titular/substituto deste professor —
  // posse validada no service, não aqui.
  const record = await classService.getTeacherClassRecord(currentUser.id, recordId);
  if (!record) notFound();

  // Só busca acesso à call se ela já foi iniciada (ex: refresh no meio da
  // aula) — se ainda não começou, getTeacherCallAccess devolve null e o
  // professor vê o botão "Iniciar chamada" em vez do player.
  const initialCallAccess = record.callStartedAt
    ? await classService.getTeacherCallAccess(currentUser.id, recordId)
    : null;

  return (
    <TeacherClassRoom
      record={record}
      initialCallAccess={initialCallAccess}
      selfId={currentUser.id}
      selfName={currentUser.name}
      selfAvatarUrl={currentUser.avatarUrl}
    />
  );
}
