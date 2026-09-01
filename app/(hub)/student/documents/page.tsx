import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { userService } from "@/modules/user/user.service";
import { contractService } from "@/modules/contract/contract.service";
import { DocumentsView } from "./_components/DocumentsView";

export const metadata: Metadata = {
  title: "Documentos | English4You",
  description: "Leia e assine o seu contrato de curso.",
};

export default async function StudentDocumentsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  // Relê o usuário do banco: a sessão é um snapshot em cookie e, desde a
  // proteção de PII, nem carrega mais CPF/endereço.
  //
  // Sequencial, e não `Promise.all`: `getMyContracts` LANÇA se o userId da
  // sessão não existir mais no banco (conta apagada/recriada). Rodar em
  // paralelo faz essa exceção vencer a corrida e derrubar a página antes do
  // `if (!user) redirect` abaixo conseguir agir.
  const user = await userService.getUserById(currentUser.id);
  if (!user) redirect("/api/session/invalidate");

  const contracts = await contractService.getMyContracts(currentUser.id);

  return <DocumentsView user={user} contracts={contracts} />;
}
