import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { progressService } from "@/modules/progress/progress.service";
import { PracticePath } from "./_components/PracticePath";

export const metadata: Metadata = {
  title: "Prática | English4You",
  description: "Uma atividade nova por dia para fixar o que você viu em aula.",
};

export default async function StudentPracticePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const path = await progressService.getPracticePath(currentUser.id);

  return <PracticePath path={path} />;
}
