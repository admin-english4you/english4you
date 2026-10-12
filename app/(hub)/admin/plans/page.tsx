import type { Metadata } from "next";
import { PlansList } from "./_components/PlansList";
import { planService } from "@/modules/plan/plan.service";
import { classService } from "@/modules/class/class.service";
import { getCurrentUser } from "@/lib/auth-server";

export const metadata: Metadata = {
  title: "Planos de Ensino | English4You Admin",
  description: "Construtor de planos de ensino, lições e conteúdo pedagógico.",
};

export default async function AdminPlansPage() {
  const user = await getCurrentUser();
  const [plans, classCountByPlan] = user
    ? await Promise.all([planService.getAllPlans(user.role), classService.getClassCountByPlan(user.role)])
    : [[], {}];

  return <PlansList initialPlans={plans} classCountByPlan={classCountByPlan} />;
}
