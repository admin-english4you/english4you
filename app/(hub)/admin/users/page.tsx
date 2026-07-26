import type { Metadata } from "next";
import { UsersList } from "./_components/UsersList";

export const metadata: Metadata = {
  title: "Usuários | English4You Admin",
  description: "Gerenciamento de alunos, professores e administradores.",
};

export default function AdminUsersPage() {
  return <UsersList />;
}
