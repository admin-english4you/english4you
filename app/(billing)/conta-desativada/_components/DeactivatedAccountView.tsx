"use client";

import { Lock } from "lucide-react";
import { BillingShell } from "../../_components/BillingShell";

/**
 * Sem botão de ação de propósito: reativar é decisão do administrador, e
 * oferecer qualquer caminho aqui (recontratar, trocar cartão) seria justamente
 * a brecha que permitiria ao aluno desfazer sozinho a desativação.
 */
export function DeactivatedAccountView() {
  return (
    <BillingShell
      title="Conta desativada"
      description="Seu acesso à plataforma está suspenso no momento."
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
            <Lock className="h-5 w-5 text-slate-500" />
          </div>
          <div className="space-y-3">
            <p className="text-sm text-slate-700">
              Sua conta foi <strong>desativada por um administrador</strong> da escola, então as
              aulas, os materiais e a prática não estão acessíveis.
            </p>
            <p className="text-sm text-slate-500">
              Se você acredita que isso foi um engano, ou quer voltar a estudar, fale com a
              coordenação da English4You — a reativação é feita por lá.
            </p>
            <p className="text-xs text-slate-400">
              Seu histórico de aulas e pagamentos continua guardado e volta com você quando a conta
              for reativada.
            </p>
          </div>
        </div>
      </div>
    </BillingShell>
  );
}
