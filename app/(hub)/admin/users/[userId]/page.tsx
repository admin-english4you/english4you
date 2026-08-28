import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { userService } from "@/modules/user/user.service";
import { contractService } from "@/modules/contract/contract.service";
import { paymentService } from "@/modules/payment/payment.service";
import { classService } from "@/modules/class/class.service";
import { UserDetailView } from "./_components/UserDetailView";

export const metadata: Metadata = {
  title: "Detalhes do Usuário | English4You Admin",
  description: "Ficha completa do usuário: dados, contratos e situação financeira.",
};

interface AdminUserDetailPageProps {
  params: Promise<{ userId: string }>;
}

/**
 * Ficha de um usuário.
 *
 * NADA de CPF/endereço sai daqui: a página monta os cards com os dados não
 * sensíveis, e a identidade regulada só é buscada depois que o admin confirma
 * a própria senha (ver `IdentityVault` → `revealUserIdentityAction`). Passar o
 * CPF nas props "só para escondê-lo com CSS" o deixaria no HTML da página,
 * legível por qualquer um com o devtools aberto.
 */
export default async function AdminUserDetailPage({ params }: AdminUserDetailPageProps) {
  const { userId } = await params;

  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/staff/login");

  const user = await userService.getUserById(userId);
  if (!user) notFound();

  const isStudent = user.role === "STUDENT";

  const [contracts, financial, classGroup, currentContract] = await Promise.all([
    contractService.getContractsForUser(currentUser.role, userId),
    // Assinatura e cobranças só existem para aluno — nem consultamos para
    // professor/admin.
    isStudent
      ? paymentService.getStudentFinancialSummary(currentUser.role, userId)
      : Promise.resolve(null),
    user.classGroupId
      ? classService.getClassById(currentUser.role, user.classGroupId)
      : Promise.resolve(undefined),
    // Os termos de bolsa vivem no contrato VIGENTE, não no usuário.
    isStudent
      ? contractService.getCurrentContractForUser(userId)
      : Promise.resolve(null),
  ]);

  return (
    <UserDetailView
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        // Booleano, não o valor: a ficha precisa saber se HÁ identidade
        // preenchida (para escolher entre "ver dados" e "ainda não informou"),
        // e isso não vaza o dado em si.
        hasIdentity: Boolean(user.document),
        hasPhone: Boolean(user.phone),
      }}
      classGroup={classGroup ? { id: classGroup.id, name: classGroup.name } : null}
      contracts={contracts}
      financial={financial}
      scholarship={
        currentContract
          ? {
              scholarshipPercent: currentContract.scholarshipPercent,
              billingMode: currentContract.billingMode,
              canEdit: Boolean(currentContract.packageId),
            }
          : null
      }
      isSelf={currentUser.id === user.id}
    />
  );
}
