import type { Metadata } from "next";
import { UsersList } from "./_components/UsersList";

import { userService } from "@/modules/user/user.service";

export const metadata: Metadata = {
  title: "Usuários | English4You Admin",
  description: "Gerenciamento de alunos, professores e administradores.",
};

export default async function AdminUsersPage() {
  const users = await userService.getUsersForAdmin();
  return <UsersList initialUsers={users} />;
}
