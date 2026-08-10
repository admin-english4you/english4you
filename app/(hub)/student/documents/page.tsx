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
  const [user, contracts] = await Promise.all([
    userService.getUserById(currentUser.id),
    contractService.getMyContracts(currentUser.id),
  ]);

  if (!user) redirect("/login");

  return <DocumentsView user={user} contracts={contracts} />;
}
