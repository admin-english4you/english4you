"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import {
  createContractTemplateAction,
  setContractTemplateActiveAction,
} from "@/modules/contract/contract.actions";
import type {
  ContractTargetRole,
  ContractTemplate,
  ContractTemplateKind,
} from "@/modules/contract/contract.types";

interface TemplatesTabProps {
  templates: ContractTemplate[];
}

const ROLE_LABELS: Record<ContractTargetRole, string> = {
  STUDENT: "Aluno",
  TEACHER: "Professor",
};

const KIND_LABELS: Record<ContractTemplateKind, string> = {
  STANDARD: "Padrão",
  SCHOLARSHIP: "Bolsista",
};

export function TemplatesTab({ templates }: TemplatesTabProps) {
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [targetRole, setTargetRole] = useState<ContractTargetRole>("STUDENT");
  const [kind, setKind] = useState<ContractTemplateKind>("STANDARD");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createContractTemplateAction({ name, targetRole, kind });
      if (result.success) {
        setIsModalOpen(false);
        setName("");
        setKind("STANDARD");
      } else {
        setError(result.error);
      }
    });
  };

  const handleActivate = (templateId: string) => {
    startTransition(async () => {
      await setContractTemplateActiveAction({ templateId });
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          Um modelo ativo <strong>por perfil e tipo</strong> — é ele que gera os contratos dos novos
          cadastros. O contrato de quem tem bolsa sai do modelo do tipo <strong>Bolsista</strong>.
        </p>
        <Button className="shrink-0 bg-primary hover:bg-primary/80" onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo Modelo
        </Button>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum modelo de contrato"
          description="Crie e ative um modelo de aluno antes de cadastrar alunos — sem ele, o contrato não pode ser emitido."
        />
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-semibold text-slate-900">{template.name}</h3>
                  <span className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    {ROLE_LABELS[template.targetRole]}
                  </span>
                  {/* Sem este selo, dois "Contrato do Aluno" — o padrão e o de
                      bolsista — ficam indistinguíveis na lista. */}
                  {template.kind === "SCHOLARSHIP" && (
                    <span className="shrink-0 rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                      {KIND_LABELS.SCHOLARSHIP}
                    </span>
                  )}
                  <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                    v{template.version}
                  </span>
                  {template.isActive && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> Ativo
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Atualizado em {new Date(template.updatedAt).toLocaleDateString("pt-BR")}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {!template.isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleActivate(template.id)}
                    disabled={isPending}
                  >
                    Ativar
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/admin/finance/templates/${template.id}`} />}
                  className={cn("text-primary")}
                >
                  Editar <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Modelo de Contrato">
        <form onSubmit={handleCreate} className="space-y-4 p-6">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Nome do Modelo
            </label>
            <Input
              type="text"
              required
              placeholder="Ex: Contrato Padrão do Aluno"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Destinado a
            </label>
            <Select
              value={targetRole}
              onChange={(value) => {
                const role = value as ContractTargetRole;
                setTargetRole(role);
                // Bolsa é um termo de matrícula de aluno; professor não tem.
                if (role !== "STUDENT") setKind("STANDARD");
              }}
              options={[
                { value: "STUDENT", label: "Aluno" },
                { value: "TEACHER", label: "Professor" },
              ]}
            />
          </div>

          {targetRole === "STUDENT" && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Tipo de contrato
              </label>
              <Select
                value={kind}
                onChange={(value) => setKind(value as ContractTemplateKind)}
                options={[
                  { value: "STANDARD", label: "Padrão (aluno pagante)" },
                  { value: "SCHOLARSHIP", label: "Bolsista (com bolsa de estudos)" },
                ]}
              />
            </div>
          )}

          <p className="text-[11px] text-slate-400">
            O modelo já nasce com um texto de exemplo e as variáveis mais comuns. Você edita o conteúdo na
            tela seguinte.
          </p>

          <Modal.Footer>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" loading={isPending} className="bg-primary text-primary-foreground hover:bg-primary/80">
              Criar Modelo
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
}
