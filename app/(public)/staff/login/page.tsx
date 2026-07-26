import type { Metadata } from "next";
import { StaffLoginForm } from "./_components/StaffLoginForm";

export const metadata: Metadata = {
  title: "Acesso do Colaborador | English4You",
  description:
    "Portal de acesso exclusivo para professores e coordenação da English4You. Gerencie suas aulas, turmas e notas dos alunos.",
};

export default function StaffLoginPage() {
  return (
    <div className="min-h-screen flex bg-background w-full">
      <StaffLoginForm />
    </div>
  );
}
