import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { progressService } from "@/modules/progress/progress.service";
import { PracticePath } from "./_components/PracticePath";
import { PracticeNotice } from "./_components/PracticeNotice";

export const metadata: Metadata = {
  title: "Prática | English4You",
  description: "Uma atividade nova por dia para fixar o que você viu em aula.",
};

interface StudentPracticePageProps {
  searchParams: Promise<{ notice?: string }>;
}

export default async function StudentPracticePage({ searchParams }: StudentPracticePageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const [path, { notice }] = await Promise.all([
    progressService.getPracticePath(currentUser.id),
    searchParams,
  ]);

  return (
    <>
      <PracticeNotice notice={notice ?? null} />
      <PracticePath path={path} />
    </>
  );
}
