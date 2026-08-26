"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppLayout } from "@/components/layout/AppLayout";
import { Plus, ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { createPlanAction } from "@/modules/plan/plan.actions";
import { CreatePlanSchema } from "@/modules/plan/plan.schema";
import { CreatePlanInput, Plan } from "@/modules/plan/plan.types";
import { PLAN_STATUS_LABELS, PLAN_STATUS_STYLES } from "@/modules/plan/plan.utils";

interface PlansListProps {
  initialPlans: Plan[];
}

const COLOR_CYCLE = ["emerald", "indigo", "rose", "amber", "cyan", "violet"] as const;

const colorStyles: Record<(typeof COLOR_CYCLE)[number], { bg: string; badgeBg: string; badgeText: string; badgeBorder: string }> = {
  emerald: { bg: "bg-emerald-500", badgeBg: "bg-emerald-50", badgeText: "text-emerald-700", badgeBorder: "border-emerald-200" },
  indigo: { bg: "bg-indigo-500", badgeBg: "bg-indigo-50", badgeText: "text-indigo-700", badgeBorder: "border-indigo-200" },
  rose: { bg: "bg-rose-500", badgeBg: "bg-rose-50", badgeText: "text-rose-700", badgeBorder: "border-rose-200" },
  amber: { bg: "bg-amber-500", badgeBg: "bg-amber-50", badgeText: "text-amber-700", badgeBorder: "border-amber-200" },
  cyan: { bg: "bg-cyan-500", badgeBg: "bg-cyan-50", badgeText: "text-cyan-700", badgeBorder: "border-cyan-200" },
  violet: { bg: "bg-violet-500", badgeBg: "bg-violet-50", badgeText: "text-violet-700", badgeBorder: "border-violet-200" },
};

function colorForPlan(id: string): (typeof COLOR_CYCLE)[number] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % COLOR_CYCLE.length;
  return COLOR_CYCLE[hash];
}

export function PlansList({ initialPlans }: PlansListProps) {
  const [plansList, setPlansList] = useState<Plan[]>(initialPlans);
  const [optimisticPlans, addOptimisticPlan] = useOptimistic(
    plansList,
    (state: Plan[], newPlan: Plan) => [newPlan, ...state]
  );
  const [, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreatePlanInput>({
    resolver: zodResolver(CreatePlanSchema),
    defaultValues: { name: "", description: "" },
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setFormErrorMessage(null);
    reset({ name: "", description: "" });
  };

  const onSubmit = (data: CreatePlanInput) => {
    setFormErrorMessage(null);

    startTransition(async () => {
      addOptimisticPlan({
        id: `optimistic-${Date.now()}`,
        name: data.name,
        description: data.description ?? null,
        status: "DRAFT",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await createPlanAction(data);

      if (result.success && result.data) {
        setPlansList((prev) => [result.data!, ...prev]);
        closeModal();
      } else if (!result.success) {
        setFormErrorMessage(result.error);
      }
    });
  };

  return (
    <AppLayout role="ADMIN">
      <div className="mx-auto space-y-6">
        <PageHeader
          title="Planos de Ensino"
          description="Monte o currículo, as lições e o conteúdo pedagógico da escola."
        >
          <Button className="bg-primary hover:bg-primary/80" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Criar Plano
          </Button>
        </PageHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {optimisticPlans.map((p) => {
            const style = colorStyles[colorForPlan(p.id)];

            return (
              <Link
                key={p.id}
                href={`/admin/plans/${p.id}`}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all group flex flex-col"
              >
                <div className={`h-1.5 w-full ${style.bg}`}></div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded text-xs font-bold border ${PLAN_STATUS_STYLES[p.status]}`}>
                      {PLAN_STATUS_LABELS[p.status]}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                  </div>

                  <h3 className="font-bold text-lg text-slate-900 leading-tight mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                    {p.name}
                  </h3>

                  <p className="text-sm text-slate-500 line-clamp-2 flex-1">
                    {p.description || "Sem descrição."}
                  </p>

                  <div className="flex items-center gap-2 pt-4 mt-4 border-t border-slate-100 text-xs text-slate-400">
                    <BookOpen className={`w-3.5 h-3.5 ${style.badgeText}`} />
                    Ver lições do plano
                  </div>
                </div>
              </Link>
            );
          })}

          {optimisticPlans.length === 0 && (
            <div className="col-span-full text-center text-sm text-slate-400 py-12">
              Nenhum plano de ensino cadastrado ainda. Clique em &quot;Criar Plano&quot; para começar.
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title="Criar Plano de Ensino">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {formErrorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              {formErrorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nome do Plano
            </label>
            <Input type="text" placeholder="Ex: Inglês Básico 1" {...register("name")} />
            {errors.name && <p className="text-[11px] text-rose-600 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Descrição (opcional)
            </label>
            <textarea
              rows={3}
              placeholder="Descreva o objetivo e o público deste plano..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-y"
              {...register("description")}
            />
          </div>

          <Modal.Footer>
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting} className="bg-primary hover:bg-primary/80 text-primary-foreground">
              {isSubmitting ? "Criando..." : "Criar Plano"}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </AppLayout>
  );
}
