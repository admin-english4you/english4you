"use client";

import { useState, useTransition } from "react";
import { Archive, CalendarDays, Package as PackageIcon, Pencil, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import {
  archivePackageAction,
  createPackageAction,
  updatePackageAction,
} from "@/modules/finance/finance.actions";
import { centsToInputValue, formatCents, parseBRLToCents } from "@/modules/finance/finance.utils";
import type { Package } from "@/modules/finance/finance.types";

interface PackagesTabProps {
  packages: Package[];
}

interface FormState {
  name: string;
  durationInMonths: string;
  classesPerWeek: string;
  installmentValue: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  durationInMonths: "6",
  classesPerWeek: "2",
  installmentValue: "",
};

export function PackagesTab({ packages }: PackagesTabProps) {
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  // `null` = criando; um pacote = editando.
  const [editing, setEditing] = useState<Package | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setIsModalOpen(true);
  };

  const openEdit = (pkg: Package) => {
    setEditing(pkg);
    setForm({
      name: pkg.name,
      durationInMonths: String(pkg.durationInMonths),
      classesPerWeek: String(pkg.classesPerWeek),
      installmentValue: centsToInputValue(pkg.installmentValueCents),
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const installmentValueCents = parseBRLToCents(form.installmentValue);
    if (installmentValueCents === null) {
      setError("Informe um valor de mensalidade válido (ex: 150,00).");
      return;
    }

    const durationInMonths = Number(form.durationInMonths);
    const classesPerWeek = Number(form.classesPerWeek);
    if (!Number.isInteger(durationInMonths) || durationInMonths <= 0) {
      setError("A duração deve ser um número inteiro de meses.");
      return;
    }
    if (!Number.isInteger(classesPerWeek) || classesPerWeek <= 0) {
      setError("Informe quantas aulas por semana.");
      return;
    }

    const payload = { name: form.name, durationInMonths, classesPerWeek, installmentValueCents };

    startTransition(async () => {
      const result = editing
        ? await updatePackageAction({ packageId: editing.id, ...payload })
        : await createPackageAction(payload);

      if (result.success) {
        setIsModalOpen(false);
      } else {
        setError(result.error);
      }
    });
  };

  const handleArchive = (pkg: Package) => {
    startTransition(async () => {
      await archivePackageAction({ packageId: pkg.id });
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="bg-primary hover:bg-primary/80" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Novo Pacote
        </Button>
      </div>

      {packages.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title="Nenhum pacote cadastrado"
          description="Crie o primeiro pacote para poder matricular alunos — é dele que saem a duração do contrato e o valor da mensalidade."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={cn(
                "rounded-xl border bg-white p-5 shadow-sm transition-colors",
                pkg.isActive ? "border-slate-200" : "border-dashed border-slate-300 bg-slate-50/60"
              )}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <h3 className="min-w-0 truncate font-bold text-slate-900">{pkg.name}</h3>
                <span
                  className={cn(
                    "shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold",
                    pkg.isActive
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-100 text-slate-500"
                  )}
                >
                  {pkg.isActive ? "Ativo" : "Arquivado"}
                </span>
              </div>

              <p className="text-2xl font-extrabold tracking-tight text-slate-900">
                {formatCents(pkg.installmentValueCents)}
                <span className="ml-1 text-xs font-medium text-slate-400">/mês</span>
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {pkg.durationInMonths} {pkg.durationInMonths === 1 ? "mês" : "meses"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <PackageIcon className="h-3.5 w-3.5" />
                  {pkg.classesPerWeek}x por semana
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                <Button variant="outline" size="sm" onClick={() => openEdit(pkg)} disabled={isPending}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleArchive(pkg)}
                  disabled={isPending}
                  className="text-slate-500"
                >
                  {pkg.isActive ? (
                    <>
                      <Archive className="mr-1.5 h-3.5 w-3.5" /> Arquivar
                    </>
                  ) : (
                    <>
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reativar
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? "Editar Pacote" : "Novo Pacote"}
      >
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Nome do Pacote
            </label>
            <Input
              type="text"
              required
              placeholder="Ex: Semestral"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Duração (meses)
              </label>
              <Input
                type="number"
                min={1}
                required
                value={form.durationInMonths}
                onChange={(e) => setForm((f) => ({ ...f, durationInMonths: e.target.value }))}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Aulas por semana
              </label>
              <Input
                type="number"
                min={1}
                required
                value={form.classesPerWeek}
                onChange={(e) => setForm((f) => ({ ...f, classesPerWeek: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Valor da mensalidade
            </label>
            <Input
              type="text"
              required
              placeholder="150,00"
              value={form.installmentValue}
              onChange={(e) => setForm((f) => ({ ...f, installmentValue: e.target.value }))}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Aceita &quot;150,00&quot; ou &quot;150&quot;. É o valor de cada mensalidade, não o total do contrato.
            </p>
          </div>

          <Modal.Footer>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" loading={isPending} className="bg-primary text-primary-foreground hover:bg-primary/80">
              {editing ? "Salvar" : "Criar Pacote"}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
}
