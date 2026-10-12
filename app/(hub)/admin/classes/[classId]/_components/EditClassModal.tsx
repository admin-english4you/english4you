"use client";

import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toaster";
import { updateClassBasicInfoAction } from "@/modules/class/class.actions";
import { ScheduleSchema, ScheduleSlot, WeekdayEnum } from "@/modules/class/class.schema";
import { WEEKDAY_LABELS, sortScheduleSlots } from "@/modules/class/class.utils";

const EditClassFormSchema = z.object({
  name: z.string().trim().min(2, "O nome da turma precisa ter ao menos 2 caracteres.").max(255),
  schedule: ScheduleSchema,
});

type EditClassFormValues = z.infer<typeof EditClassFormSchema>;

const WEEKDAY_OPTIONS = WeekdayEnum.options.map((day) => ({ value: day, label: WEEKDAY_LABELS[day] }));
const emptySlot: ScheduleSlot = { weekday: "MON", time: "09:00" };

interface EditClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  classGroupId: string;
  name: string;
  schedule: ScheduleSlot[];
}

function sameSchedule(a: ScheduleSlot[], b: ScheduleSlot[]) {
  return JSON.stringify(sortScheduleSlots(a)) === JSON.stringify(sortScheduleSlots(b));
}

export function EditClassModal({ isOpen, onClose, classGroupId, name, schedule }: EditClassModalProps) {
  const router = useRouter();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditClassFormValues>({
    resolver: zodResolver(EditClassFormSchema),
    defaultValues: { name, schedule },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "schedule" });
  const watchedSchedule = useWatch({ control, name: "schedule" });
  const scheduleChanged = !sameSchedule(watchedSchedule ?? [], schedule);

  const handleClose = () => {
    reset({ name, schedule });
    onClose();
  };

  const onSubmit = async (data: EditClassFormValues) => {
    const nameChanged = data.name !== name;
    const changedSchedule = !sameSchedule(data.schedule, schedule);

    if (!nameChanged && !changedSchedule) {
      handleClose();
      return;
    }

    const result = await updateClassBasicInfoAction({
      classGroupId,
      ...(nameChanged ? { name: data.name } : {}),
      ...(changedSchedule ? { schedule: data.schedule } : {}),
    });

    if (result.success) {
      toast.success(changedSchedule ? "Turma atualizada e aulas reagendadas." : "Turma atualizada.");
      onClose();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Editar Turma">
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Nome da Turma
          </label>
          <Input type="text" {...register("name")} />
          {errors.name && <p className="text-[11px] text-rose-600 mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Dias e horários das aulas
            </label>
            <button
              type="button"
              onClick={() => append(emptySlot)}
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

        {scheduleChanged && (
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 font-medium">
              As aulas que ainda não aconteceram serão reagendadas a partir de hoje, na ordem do plano, usando os novos
              dias e horários. Datas ajustadas manualmente nessas aulas serão substituídas. Aulas já concluídas ou em
              andamento não mudam.
            </p>
          </div>
        )}

        <Modal.Footer>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting} className="bg-primary hover:bg-primary/80 text-primary-foreground">
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
