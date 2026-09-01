"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { deleteUserAccountAction } from "@/modules/payment/payment.actions";
import { runAction } from "@/lib/run-action";

interface DeleteAccountCardProps {
  userId: string;
  userName: string;
  userEmail: string;
  isStudent: boolean;
  isSelf: boolean;
}

/**
 * Apagar a conta PERMANENTEMENTE — separado de "Desativar" (AccountStatusCard),
 * que é reversível e não tira nada do banco.
 *
 * Existe pra cadastro feito errado (duplicado, e-mail trocado, teste que virou
 * produção sem querer), não pra aluno que saiu da escola — esse caso é
 * desativar, porque preserva o histórico financeiro. A confirmação pede o
 * e-mail exato da conta (não um "tem certeza?" genérico) porque é irreversível
 * de verdade: sem undo, sem "reativar" depois.
 */
export function DeleteAccountCard({ userId, userName, userEmail, isStudent, isSelf }: DeleteAccountCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const emailMatches = confirmEmail.trim().toLowerCase() === userEmail.toLowerCase();

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await runAction(() => deleteUserAccountAction({ userId, confirmEmail }));
      if (result.success) {
        // A ficha que estava na tela não existe mais — não dá pra só
        // `router.refresh()` como as outras ações fazem.
        router.push("/admin/users");
      } else {
        setError(result.error);
      }
    });
  };

  if (isSelf) return null;

  return (
    <div className="rounded-xl border border-rose-200 bg-white shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600">
          <Trash2 className="h-4 w-4" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Apagar conta</h2>
      </div>

      <div className="space-y-4 p-5">
        <p className="text-sm text-slate-600">
          Remove a conta de {userName.split(" ")[0]} para sempre — cadastro, histórico e acesso.
          Use só para conta criada por engano. Se o aluno saiu da escola, prefira{" "}
          <strong>Desativar</strong>: mantém o histórico e é reversível.
        </p>

        <Button
          onClick={() => setIsModalOpen(true)}
          disabled={isPending}
          variant="outline"
          className="w-full border-rose-300 text-rose-700 hover:bg-rose-50"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Apagar {isStudent ? "aluno" : "conta"} permanentemente
        </Button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setConfirmEmail("");
          setError(null);
        }}
        title="Apagar conta permanentemente"
      >
        <div className="space-y-4 p-6">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</div>
          )}

          <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="flex items-center gap-2 text-xs font-bold text-rose-800">
              <AlertTriangle className="h-4 w-4" /> Isto não pode ser desfeito
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-rose-800">
              <li>A assinatura no Mercado Pago é cancelada — não haverá novas cobranças.</li>
              <li>Cobranças pendentes são canceladas.</li>
              <li>Contrato, histórico de pagamentos, progresso e conquistas são apagados.</li>
              <li>O acesso à plataforma (login) é removido.</li>
              <li className="font-semibold">Nada disto pode ser recuperado depois.</li>
            </ul>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-700">
              Digite <strong>{userEmail}</strong> para confirmar
            </span>
            <input
              type="text"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder={userEmail}
            />
          </label>

          <Modal.Footer>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setConfirmEmail("");
              }}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              loading={isPending}
              disabled={!emailMatches}
              onClick={handleConfirm}
              className="bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40"
            >
              Apagar permanentemente
            </Button>
          </Modal.Footer>
        </div>
      </Modal>
    </div>
  );
}
