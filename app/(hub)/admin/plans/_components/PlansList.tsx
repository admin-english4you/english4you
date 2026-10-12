"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppLayout } from "@/components/layout/AppLayout";
import { Plus, ArrowRight, BookOpen, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { toast } from "@/components/ui/toaster";
import { createPlanAction, deletePlanAction } from "@/modules/plan/plan.actions";
import { CreatePlanSchema } from "@/modules/plan/plan.schema";
import { CreatePlanInput, Plan, PlanStatus } from "@/modules/plan/plan.types";
import { PLAN_STATUS_LABELS, PLAN_STATUS_STYLES } from "@/modules/plan/plan.utils";

interface PlansListProps {
  initialPlans: Plan[];
  classCountByPlan: Record<string, number>;
}

type StatusFilter = "ALL" | PlanStatus;

const STATUS_FILTERS: StatusFilter[] = ["ALL", "DRAFT", "ACTIVE", "ARCHIVED"];

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

export function PlansList({ initialPlans, classCountByPlan }: PlansListProps) {
  const [plansList, setPlansList] = useState<Plan[]>(initialPlans);
  const [optimisticPlans, addOptimisticPlan] = useOptimistic(
    plansList,
    (state: Plan[], newPlan: Plan) => [newPlan, ...state]
  );
  const [, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredPlans = optimisticPlans.filter((p) => {
    if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
    if (!normalizedSearch) return true;
    return (
      p.name.toLowerCase().includes(normalizedSearch) ||
      (p.description ?? "").toLowerCase().includes(normalizedSearch)
    );
  });

  const handleConfirmDelete = async () => {
    if (!planToDelete) return;
    setIsDeleting(true);
    const result = await deletePlanAction({ planId: planToDelete.id });
    setIsDeleting(false);

    if (result.success) {
      setPlansList((prev) => prev.filter((p) => p.id !== planToDelete.id));
      toast.success("Plano excluído.");
      setPlanToDelete(null);
    } else {
      toast.error(result.error);
    }
  };

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

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filtrar:</span>
            {STATUS_FILTERS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  statusFilter === status
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {status === "ALL" ? "Todos" : PLAN_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
          <div className="relative md:ml-auto md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Buscar por nome ou descrição..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((p) => {
            const style = colorStyles[colorForPlan(p.id)];

            return (
              <div key={p.id} className="relative">
              {!p.id.startsWith("optimistic-") && (
                <button
                  type="button"
                  aria-label={`Excluir plano ${p.name}`}
                  onClick={() => setPlanToDelete(p)}
                  className="absolute bottom-4 right-4 z-10 p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <Link
                href={`/admin/plans/${p.id}`}
                className="h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all group flex flex-col"
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
              </div>
            );
          })}

          {optimisticPlans.length === 0 && (
            <div className="col-span-full text-center text-sm text-slate-400 py-12">
              Nenhum plano de ensino cadastrado ainda. Clique em &quot;Criar Plano&quot; para começar.
            </div>
          )}

          {optimisticPlans.length > 0 && filteredPlans.length === 0 && (
            <div className="col-span-full text-center text-sm text-slate-400 py-12">
              Nenhum plano encontrado com os filtros atuais.
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={planToDelete !== null}
        onClose={() => !isDeleting && setPlanToDelete(null)}
        title="Excluir plano de ensino"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-700">
            Tem certeza que deseja excluir <strong>{planToDelete?.name}</strong>? Esta ação não pode ser desfeita.
            As lições continuam existindo, mas deixam de fazer parte deste plano.
          </p>

          {planToDelete && (classCountByPlan[planToDelete.id] ?? 0) > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
              <p>
                <strong>{classCountByPlan[planToDelete.id]} turma(s)</strong> usam este plano e ficarão sem plano.
                As aulas já geradas permanecem, mas essas turmas não receberão lições novas e, se já tiverem
                aulas concluídas, não poderão ter outro plano atribuído.
              </p>
              <p>Para apenas tirar o plano de uso, prefira alterar o status para Arquivado.</p>
            </div>
          )}

          <Modal.Footer>
            <Button type="button" variant="outline" onClick={() => setPlanToDelete(null)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" loading={isDeleting} onClick={handleConfirmDelete}>
              {isDeleting ? "Excluindo..." : "Excluir plano"}
            </Button>
          </Modal.Footer>
        </div>
      </Modal>

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
