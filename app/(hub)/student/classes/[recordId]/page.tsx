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

  // Mesmo critério de "ao vivo agora" do card na lista (ver
  // ClassRecordCard/StudentDashboard) — não depende de horário agendado nem
  // de qual professor iniciou.
  const isLiveNow = Boolean(record.callStartedAt) && !record.completed;

  // A lição bloqueada não deve ser lida — EXCETO se a aula está ao vivo
  // agora: bloquear pelo conteúdo impediria a aluna de sequer ENTRAR na
  // chamada que está acontecendo neste exato momento. Faltou isto quando o
  // card da lista ganhou o mesmo escape (`isOpenable = isLiveNow || ...`) —
  // o clique passou a funcionar, mas a página de destino continuava batendo
  // a porta com "não encontrada" assim que o professor abre uma sala cuja
  // lição ainda não foi publicada.
  if (!isLiveNow && (!record.lesson || record.lesson.status === "DISABLED")) {
    notFound();
  }

  // Só busca acesso à call se ela já estava ao vivo no momento da request —
  // se o professor ainda não iniciou, o painel entra em modo de espera e faz
  // poll leve (getStudentCallAccessAction) até a call aparecer.
  const initialCallAccess = record.callStartedAt
    ? await classService.getStudentCallAccess(currentUser.id, recordId)
    : null;

  return (
    <LiveClassRoom
      record={record}
      initialCallAccess={initialCallAccess}
      selfId={currentUser.id}
      selfName={currentUser.name}
      selfAvatarUrl={currentUser.avatarUrl}
      todayKey={todayKey()}
    />
  );
}
