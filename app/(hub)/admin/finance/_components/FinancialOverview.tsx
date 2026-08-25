"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Landmark,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { toDayKey, todayKey } from "@/lib/date";
import {
  createFinancialEntryAction,
  deleteFinancialEntryAction,
  settleFinancialEntryAction,
  updateFinancialEntryAction,
} from "@/modules/finance/finance.actions";
import {
  CATEGORIES_BY_TYPE,
  ENTRY_CATEGORY_LABELS,
  ENTRY_STATUS_LABELS,
  ENTRY_STATUS_STYLES,
  centsToInputValue,
  formatCents,
  formatSignedCents,
  parseBRLToCents,
} from "@/modules/finance/finance.utils";
import type {
  FinanceOverview,
  FinancialEntryType,
  LedgerEntry,
} from "@/modules/finance/finance.types";

interface FinancialOverviewProps {
  overview: FinanceOverview;
}

interface FormState {
  type: FinancialEntryType;
  category: string;
  description: string;
  counterparty: string;
  amount: string;
  dueDate: string;
  isPaid: boolean;
  paidAt: string;
  method: string;
  notes: string;
}

type LedgerFilter = "TODOS" | "ENTRADAS" | "SAIDAS" | "EM_ABERTO";

const FILTERS: { key: LedgerFilter; label: string }[] = [
  { key: "TODOS", label: "Todos" },
  { key: "ENTRADAS", label: "Entradas" },
  { key: "SAIDAS", label: "Saídas" },
  { key: "EM_ABERTO", label: "Em aberto" },
];

function emptyForm(today: string): FormState {
  return {
    type: "INCOME",
    category: "TUITION",
    description: "",
    counterparty: "",
    amount: "",
    dueDate: today,
    isPaid: true,
    paidAt: today,
    method: "",
    notes: "",
  };
}

export function FinancialOverview({ overview }: FinancialOverviewProps) {
  const { summary, entries, monthLabel } = overview;
  // Congelado num `useMemo` sem dependências: o "hoje" precisa ser o mesmo da
  // primeira renderização até o próximo carregamento, senão a linha divisória
  // entre "em aberto" e "vencido" mudaria no meio de uma sessão aberta à
  // meia-noite. O servidor já derivou os status; aqui é só para o formulário.
  const today = useMemo(() => todayKey(), []);

  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  // `null` = criando; um lançamento = editando.
  const [editing, setEditing] = useState<LedgerEntry | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(today));
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<LedgerFilter>("TODOS");
  const [confirmingDelete, setConfirmingDelete] = useState<LedgerEntry | null>(null);

  const visibleEntries = entries.filter((entry) => {
    if (filter === "ENTRADAS") return entry.type === "INCOME";
    if (filter === "SAIDAS") return entry.type === "EXPENSE";
    if (filter === "EM_ABERTO") return entry.status !== "PAID";
    return true;
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(today));
    setError(null);
    setIsModalOpen(true);
  };

  const openEdit = (entry: LedgerEntry) => {
    setEditing(entry);
    setForm({
      type: entry.type,
      category: entry.category ?? CATEGORIES_BY_TYPE[entry.type][0],
      description: entry.description,
      counterparty: entry.counterparty ?? "",
      amount: centsToInputValue(entry.amountCents),
      dueDate: toDayKey(entry.dueDate),
      isPaid: entry.paidAt !== null,
      paidAt: entry.paidAt ? toDayKey(entry.paidAt) : today,
      method: entry.method ?? "",
      notes: entry.notes ?? "",
    });
    setError(null);
    setIsModalOpen(true);
  };

  /** Trocar o tipo troca o leque de categorias — a antiga não faria sentido. */
  const handleTypeChange = (type: FinancialEntryType) => {
    setForm((f) => ({ ...f, type, category: CATEGORIES_BY_TYPE[type][0] }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const amountCents = parseBRLToCents(form.amount);
    if (amountCents === null) {
      setError("Informe um valor válido (ex: 450,00).");
      return;
    }

    const payload = {
      type: form.type,
      category: form.category as (typeof CATEGORIES_BY_TYPE)[FinancialEntryType][number],
      description: form.description,
      counterparty: form.counterparty,
      amountCents,
      dueDate: form.dueDate,
      paidAt: form.isPaid ? form.paidAt : null,
      method: form.method,
      notes: form.notes,
    };

    startTransition(async () => {
      const result = editing
        ? await updateFinancialEntryAction({ entryId: editing.id, ...payload })
        : await createFinancialEntryAction(payload);

      if (result.success) {
        setIsModalOpen(false);
      } else {
        setError(result.error);
      }
    });
  };

  const handleToggleSettled = (entry: LedgerEntry) => {
    startTransition(async () => {
      await settleFinancialEntryAction({
        entryId: entry.id,
        paidAt: entry.paidAt ? null : today,
      });
    });
  };

  const handleDelete = () => {
    if (!confirmingDelete) return;
    const entryId = confirmingDelete.id;

    startTransition(async () => {
      const result = await deleteFinancialEntryAction({ entryId });
      if (result.success) setConfirmingDelete(null);
    });
  };

  return (
    <div className="mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          Livro-caixa da escola em <strong className="font-semibold text-slate-700">{monthLabel}</strong> — o
          que você lança aqui somado às mensalidades cobradas pelo Mercado Pago.
        </p>
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Novo Lançamento
        </Button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <SummaryCard
          icon={ArrowUpCircle}
          tone="emerald"
          title="Entradas do mês"
          value={formatCents(summary.monthIncomeCents)}
          footer={
            summary.monthMercadoPagoCents > 0 ? (
              <span className="text-slate-500">
                {formatCents(summary.monthMercadoPagoCents)} via Mercado Pago
              </span>
            ) : (
              <span className="text-slate-400">Nenhuma cobrança do Mercado Pago neste mês</span>
            )
          }
        />

        <SummaryCard
          icon={ArrowDownCircle}
          tone="rose"
          title="Saídas do mês"
          value={formatCents(summary.monthExpenseCents)}
          footer={
            <span
              className={cn(
                "font-semibold",
                summary.monthNetCents >= 0 ? "text-emerald-600" : "text-rose-600"
              )}
            >
              Saldo: {formatCents(summary.monthNetCents)}
            </span>
          }
        />

        <SummaryCard
          icon={Wallet}
          tone="amber"
          title="Em aberto"
          value={formatCents(summary.receivableCents + summary.payableCents)}
          footer={
            <span className="text-slate-500">
              {formatCents(summary.receivableCents)} a receber ·{" "}
              {formatCents(summary.payableCents)} a pagar
              {summary.receivableOverdueCount + summary.payableOverdueCount > 0 && (
                <span className="ml-1 font-semibold text-rose-600">
                  ({summary.receivableOverdueCount + summary.payableOverdueCount} vencido
                  {summary.receivableOverdueCount + summary.payableOverdueCount > 1 ? "s" : ""})
                </span>
              )}
            </span>
          }
        />
      </div>

      {/* Extrato */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/50 p-5 sm:flex-row sm:items-center">
          <h2 className="text-base font-bold text-slate-900">Movimentações</h2>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setFilter(option.key)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  filter === option.key
                    ? "bg-indigo-600 text-white"
                    : "text-slate-500 hover:bg-slate-200/70 hover:text-slate-800"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {visibleEntries.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Landmark}
              title={
                entries.length === 0
                  ? "Nenhuma movimentação ainda"
                  : "Nada neste filtro"
              }
              description={
                entries.length === 0
                  ? "Lance a primeira entrada ou saída para começar a acompanhar o caixa da escola. As mensalidades cobradas pelo Mercado Pago aparecem aqui automaticamente."
                  : "Troque o filtro para ver as outras movimentações."
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Descrição</th>
                  <th className="px-6 py-3.5">Contraparte</th>
                  <th className="px-6 py-3.5">Categoria</th>
                  <th className="px-6 py-3.5">Valor</th>
                  <th className="px-6 py-3.5">Data</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleEntries.map((entry) => {
                  const isManual = entry.source === "MANUAL";

                  return (
                    <tr key={`${entry.source}-${entry.id}`} className="transition-colors hover:bg-slate-50/70">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900">{entry.description}</span>
                        {entry.method && (
                          <span className="ml-2 text-xs text-slate-400">· {entry.method}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{entry.counterparty ?? "—"}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {entry.category ? ENTRY_CATEGORY_LABELS[entry.category] : "—"}
                      </td>
                      <td
                        className={cn(
                          "px-6 py-4 font-bold",
                          entry.type === "EXPENSE" ? "text-slate-900" : "text-emerald-600"
                        )}
                      >
                        {formatSignedCents(entry.type, entry.amountCents)}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {entry.date.toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-bold",
                            ENTRY_STATUS_STYLES[entry.status]
                          )}
                        >
                          {ENTRY_STATUS_LABELS[entry.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isManual ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              title={entry.paidAt ? "Reabrir" : "Marcar como liquidado"}
                              onClick={() => handleToggleSettled(entry)}
                              disabled={isPending}
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50"
                            >
                              {entry.paidAt ? (
                                <RotateCcw className="h-4 w-4" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              title="Editar"
                              onClick={() => openEdit(entry)}
                              disabled={isPending}
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Excluir"
                              onClick={() => setConfirmingDelete(entry)}
                              disabled={isPending}
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          // Cobrança do Mercado Pago: quem escreve nessa tabela é
                          // o webhook. Editar aqui seria sobrescrito na próxima
                          // notificação — melhor não oferecer o botão.
                          <div
                            className="flex items-center justify-end gap-1.5 text-xs text-slate-400"
                            title="Cobrança gerada pelo Mercado Pago — atualizada automaticamente"
                          >
                            <Lock className="h-3.5 w-3.5" />
                            Automático
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Formulário */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? "Editar Lançamento" : "Novo Lançamento"}
      >
        <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {(["INCOME", "EXPENSE"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleTypeChange(type)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors",
                  form.type === type
                    ? type === "INCOME"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-rose-300 bg-rose-50 text-rose-700"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                )}
              >
                {type === "INCOME" ? "Entrada" : "Saída"}
              </button>
            ))}
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Descrição
            </label>
            <Input
              type="text"
              required
              placeholder={form.type === "INCOME" ? "Ex: Mensalidade de março" : "Ex: Repasse de horas"}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Categoria
              </label>
              <Select
                value={form.category}
                onChange={(value) => setForm((f) => ({ ...f, category: value }))}
                options={CATEGORIES_BY_TYPE[form.type].map((category) => ({
                  value: category,
                  label: ENTRY_CATEGORY_LABELS[category],
                }))}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Valor
              </label>
              <Input
                type="text"
                required
                placeholder="450,00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Contraparte <span className="font-normal normal-case text-slate-400">(opcional)</span>
            </label>
            <Input
              type="text"
              placeholder={form.type === "INCOME" ? "Nome do aluno" : "Professor, fornecedor..."}
              value={form.counterparty}
              onChange={(e) => setForm((f) => ({ ...f, counterparty: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Vencimento
              </label>
              <Input
                type="date"
                required
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Forma <span className="font-normal normal-case text-slate-400">(opcional)</span>
              </label>
              <Input
                type="text"
                placeholder="PIX, Transferência..."
                value={form.method}
                onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={form.isPaid}
                onChange={(e) => setForm((f) => ({ ...f, isPaid: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-semibold text-slate-700">
                {form.type === "INCOME" ? "Já recebido" : "Já pago"}
              </span>
            </label>

            {form.isPaid ? (
              <div className="mt-3">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Data da liquidação
                </label>
                <Input
                  type="date"
                  required
                  value={form.paidAt}
                  onChange={(e) => setForm((f) => ({ ...f, paidAt: e.target.value }))}
                />
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-slate-500">
                Fica <strong>em aberto</strong> — vira {form.type === "INCOME" ? "um valor a receber" : "uma dívida"}{" "}
                e é marcado como vencido depois da data de vencimento.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Observações <span className="font-normal normal-case text-slate-400">(opcional)</span>
            </label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus-visible:border-[#016ad1] focus-visible:ring-2 focus-visible:ring-[#016ad1]/20"
              placeholder="Detalhes que ajudem a lembrar do lançamento depois."
            />
          </div>

          <Modal.Footer>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" loading={isPending} className="bg-indigo-600 text-white hover:bg-indigo-700">
              {editing ? "Salvar" : "Lançar"}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Confirmação de exclusão — lançamento manual some de vez. */}
      <Modal
        isOpen={confirmingDelete !== null}
        onClose={() => setConfirmingDelete(null)}
        title="Excluir lançamento"
      >
        <div className="space-y-4 p-6">
          <p className="text-sm text-slate-600">
            Excluir <strong className="text-slate-900">{confirmingDelete?.description}</strong> (
            {confirmingDelete && formatCents(confirmingDelete.amountCents)})? Esta ação não pode ser
            desfeita.
          </p>
          <Modal.Footer>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmingDelete(null)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              loading={isPending}
              onClick={handleDelete}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              Excluir
            </Button>
          </Modal.Footer>
        </div>
      </Modal>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  tone,
  title,
  value,
  footer,
}: {
  icon: React.ElementType;
  tone: "emerald" | "rose" | "amber";
  title: string;
  value: string;
  footer: React.ReactNode;
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
  } as const;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl border", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-semibold text-slate-600">{title}</h3>
      </div>
      <div className="mb-2 text-3xl font-extrabold tracking-tight text-slate-900">{value}</div>
      <div className="text-xs">{footer}</div>
    </div>
  );
}
