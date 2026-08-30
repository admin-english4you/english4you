"use client";

import { useOptimistic, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppLayout } from "@/components/layout/AppLayout";
import { Plus, Calendar, Clock, Users, ArrowRight, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { createClassAction } from "@/modules/class/class.actions";
import { CreateClassGroupSchema, WeekdayEnum } from "@/modules/class/class.schema";
import {
  CreateClassGroupInput,
  ClassGroupListItem,
  PendingRecordingView,
} from "@/modules/class/class.types";
import { formatScheduleSummary, WEEKDAY_LABELS, STATUS_LABELS } from "@/modules/class/class.utils";
import { PendingRecordingsNotice } from "./PendingRecordingsNotice";

interface ClassesListProps {
  initialClasses: ClassGroupListItem[];
  pendingRecordings: PendingRecordingView[];
}

const WEEKDAY_OPTIONS = WeekdayEnum.options.map((day) => ({ value: day, label: WEEKDAY_LABELS[day] }));

type StatusFilter = "ALL" | ClassGroupListItem["status"];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "ACTIVE", label: STATUS_LABELS.ACTIVE },
  { value: "INACTIVE", label: STATUS_LABELS.INACTIVE },
  { value: "COMPLETED", label: STATUS_LABELS.COMPLETED },
  { value: "ALL", label: "Todas" },
];

const COLOR_CYCLE = ["emerald", "indigo", "rose", "amber", "cyan", "violet"] as const;

const colorStyles: Record<(typeof COLOR_CYCLE)[number], { bg: string; badgeBg: string; badgeText: string; badgeBorder: string }> = {
  emerald: { bg: "bg-emerald-500", badgeBg: "bg-emerald-50", badgeText: "text-emerald-700", badgeBorder: "border-emerald-200" },
  indigo: { bg: "bg-indigo-500", badgeBg: "bg-indigo-50", badgeText: "text-indigo-700", badgeBorder: "border-indigo-200" },
  rose: { bg: "bg-rose-500", badgeBg: "bg-rose-50", badgeText: "text-rose-700", badgeBorder: "border-rose-200" },
  amber: { bg: "bg-amber-500", badgeBg: "bg-amber-50", badgeText: "text-amber-700", badgeBorder: "border-amber-200" },
  cyan: { bg: "bg-cyan-500", badgeBg: "bg-cyan-50", badgeText: "text-cyan-700", badgeBorder: "border-cyan-200" },
  violet: { bg: "bg-violet-500", badgeBg: "bg-violet-50", badgeText: "text-violet-700", badgeBorder: "border-violet-200" },
};

function colorForClass(id: string): (typeof COLOR_CYCLE)[number] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % COLOR_CYCLE.length;
  return COLOR_CYCLE[hash];
}

const emptySchedule = { weekday: "MON" as const, time: "09:00" };

export function ClassesList({ initialClasses, pendingRecordings }: ClassesListProps) {
  const [classesList, setClassesList] = useState<ClassGroupListItem[]>(initialClasses);
  const [optimisticClasses, addOptimisticClass] = useOptimistic(
    classesList,
    (state: ClassGroupListItem[], newClass: ClassGroupListItem) => [newClass, ...state]
  );
  const [, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVE");
  const [searchTerm, setSearchTerm] = useState("");

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateClassGroupInput>({
    resolver: zodResolver(CreateClassGroupSchema),
    defaultValues: { name: "", level: "", schedule: [emptySchedule] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "schedule" });

  const closeModal = () => {
    setIsModalOpen(false);
    setFormErrorMessage(null);
    reset({ name: "", level: "", schedule: [emptySchedule] });
  };

  const onSubmit = (data: CreateClassGroupInput) => {
    setFormErrorMessage(null);

    startTransition(async () => {
      addOptimisticClass({
        id: `optimistic-${Date.now()}`,
        name: data.name,
        level: data.level,
        schedule: data.schedule,
        maxStudents: 12,
        teacherId: null,
        planId: null,
        status: "ACTIVE",
        enrolledCount: 0,
        teacher: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await createClassAction(data);

      if (result.success && result.data) {
        const created = result.data;
        setClassesList((prev) => [{ ...created, enrolledCount: 0, teacher: null }, ...prev]);
        closeModal();
      } else if (!result.success) {
        setFormErrorMessage(result.error);
      }
    });
  };

  const filteredClasses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return optimisticClasses.filter((c) => {
      const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
      const matchesSearch =
        term === "" ||
        c.name.toLowerCase().includes(term) ||
        c.level.toLowerCase().includes(term) ||
        (c.teacher?.name.toLowerCase().includes(term) ?? false);
      return matchesStatus && matchesSearch;
    });
  }, [optimisticClasses, statusFilter, searchTerm]);

  return (
    <AppLayout role="ADMIN">
      <div className="mx-auto space-y-6">
        <PageHeader
          title="Turmas"
          description="Gerencie os horários, matrículas e alocação de professores das turmas."
        >
          <Button className="bg-primary hover:bg-primary/80" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Criar Nova Turma
          </Button>
        </PageHeader>

        {/* Antes da lista, e não no fim: é uma pendência com prazo, e o que
            vence some da tela se ficar embaixo de tudo. */}
        <PendingRecordingsNotice pending={pendingRecordings} />

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  statusFilter === filter.value
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <Input
              type="text"
              placeholder="Buscar por nome, nível ou professor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((c) => {
            const isFull = c.enrolledCount >= c.maxStudents;
            const progress = Math.min(100, (c.enrolledCount / c.maxStudents) * 100);
            const style = colorStyles[colorForClass(c.id)];
            const initials = c.teacher
              ? c.teacher.name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()
              : "—";

            return (
              <Link
                key={c.id}
                href={`/admin/classes/${c.id}`}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all group flex flex-col"
              >
                <div className={`h-1.5 w-full ${style.bg}`}></div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded text-xs font-bold ${style.badgeBg} ${style.badgeText} border ${style.badgeBorder}`}>
                      {c.level}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                  </div>

                  <h3 className="font-bold text-lg text-slate-900 leading-tight mb-3 line-clamp-1 group-hover:text-primary transition-colors">
                    {c.name}
                  </h3>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatScheduleSummary(c.schedule).split(" • ")[0]}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatScheduleSummary(c.schedule).split(" • ")[1] ?? "—"}</span>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Alunos
                      </span>
                      <span className={isFull ? "text-amber-600 font-bold" : "text-slate-700 font-semibold"}>
                        {c.enrolledCount} <span className="text-slate-400 font-normal">/ {c.maxStudents} (max)</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-4">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-in-out ${isFull ? "bg-amber-500" : "bg-primary"}`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center border border-slate-200">
                        {initials}
                      </div>
                      <div className="text-xs">
                        <div className="font-semibold text-slate-900 leading-none mb-0.5">
                          {c.teacher?.name ?? "Sem professor"}
                        </div>
                        <div className="text-slate-400 leading-none">Professor Responsável</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}

          {filteredClasses.length === 0 && optimisticClasses.length === 0 && (
            <div className="col-span-full text-center text-sm text-slate-400 py-12">
              Nenhuma turma cadastrada ainda. Clique em &quot;Criar Nova Turma&quot; para começar.
            </div>
          )}

          {filteredClasses.length === 0 && optimisticClasses.length > 0 && (
            <div className="col-span-full text-center text-sm text-slate-400 py-12">
              Nenhuma turma encontrada para os filtros selecionados.
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title="Criar Nova Turma">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {formErrorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              {formErrorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nome da Turma
            </label>
            <Input type="text" placeholder="Ex: Beginner Conversation" {...register("name")} />
            {errors.name && <p className="text-[11px] text-rose-600 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nível
            </label>
            <Input type="text" placeholder="Ex: A1, B2..." {...register("level")} />
            {errors.level && <p className="text-[11px] text-rose-600 mt-1">{errors.level.message}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Horários
              </label>
              <button
                type="button"
                onClick={() => append(emptySchedule)}
                className="text-xs font-semibold text-primary hover:text-primary/80"
              >
                + Adicionar horário
              </button>
            </div>

            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Controller
                      control={control}
                      name={`schedule.${index}.weekday` as const}
                      render={({ field: weekdayField }) => (
                        <Select
                          value={weekdayField.value}
                          onChange={weekdayField.onChange}
                          options={WEEKDAY_OPTIONS}
                        />
                      )}
                    />
                  </div>
                  <Input type="time" className="w-32" {...register(`schedule.${index}.time` as const)} />
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 1}
                    className="p-2 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            {errors.schedule && (
              <p className="text-[11px] text-rose-600 mt-1">
                {errors.schedule.message ?? "Defina ao menos um horário válido."}
              </p>
            )}
          </div>

          <Modal.Footer>
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting} className="bg-primary hover:bg-primary/80 text-primary-foreground">
              {isSubmitting ? "Criando..." : "Criar Turma"}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </AppLayout>
  );
}
