import type { Metadata } from "next";
import { UsersList } from "./_components/UsersList";

import { userService } from "@/modules/user/user.service";
import { financeService } from "@/modules/finance/finance.service";
import { addDaysToKey, todayKey } from "@/lib/date";

export const metadata: Metadata = {
  title: "Usuários | English4You Admin",
  description: "Gerenciamento de alunos, professores e administradores.",
};

export default async function AdminUsersPage() {
  // Os pacotes alimentam o seletor do cadastro de aluno — só os ativos, já
  // que é deles que sai o contrato gerado na matrícula.
  const [users, packages] = await Promise.all([
    userService.getUsersForAdmin(),
    financeService.getActivePackagesForSelect(),
  ]);

  // Amanhã no fuso da escola, e não em UTC: perto da meia-noite os dois
  // discordam, e o admin veria o calendário barrar um dia que ainda é válido.
  const minFirstChargeDay = addDaysToKey(todayKey(), 1);

  return (
    <UsersList
      initialUsers={users}
      packages={packages}
      minFirstChargeDay={minFirstChargeDay}
    />
  );
}
