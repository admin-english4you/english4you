"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMyAccessStateAction } from "@/modules/payment/payment.actions";
import { BillingShell } from "../../../_components/BillingShell";

/** De quanto em quanto tempo perguntamos ao servidor se o webhook já chegou. */
const POLL_INTERVAL_MS = 3000;
/** Depois disso paramos de perguntar e devolvemos o controle ao aluno. */
const POLL_TIMEOUT_MS = 60_000;

type Phase = "waiting" | "confirmed" | "timeout";

/**
 * Espera a confirmação do Mercado Pago.
 *
 * O aluno volta do checkout antes de o webhook chegar, então o estado de acesso
 * ainda é o antigo no instante do redirect. Em vez de mostrar um "pendente" que
 * mente, ficamos em polling até o webhook virar a assinatura para autorizada.
 */
export function CheckoutReturn() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("waiting");

  useEffect(() => {
    if (phase !== "waiting") return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const startedAt = Date.now();

    const poll = async () => {
      const result = await getMyAccessStateAction();
      if (cancelled) return;

      if (result.success && result.data?.state === "OK") {
        setPhase("confirmed");
        // `replace` e não `push`: voltar para esta tela depois de confirmado não
        // faz sentido nenhum.
        router.replace("/student");
        return;
      }

      if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
        setPhase("timeout");
        return;
      }

      timer = setTimeout(poll, POLL_INTERVAL_MS);
    };

    timer = setTimeout(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phase, router]);

  if (phase === "timeout") {
    return (
      <BillingShell
        title="Ainda confirmando"
        description="O Mercado Pago está processando a autorização."
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-600">
            A confirmação pode levar alguns minutos. Você pode fechar esta página — assim que o
            Mercado Pago confirmar, seu acesso é liberado automaticamente.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => setPhase("waiting")}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Verificar de novo
          </Button>
        </div>
      </BillingShell>
    );
  }

  const confirmed = phase === "confirmed";

  return (
    <BillingShell
      title={confirmed ? "Tudo certo!" : "Confirmando seu pagamento"}
      description={
        confirmed
          ? "Sua assinatura está ativa."
          : "Não feche esta página, estamos aguardando a confirmação."
      }
    >
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        {confirmed ? (
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        ) : (
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        )}
        <p className="text-sm text-slate-600">
          {confirmed ? "Redirecionando para a plataforma…" : "Isso costuma levar poucos segundos."}
        </p>
      </div>
    </BillingShell>
  );
}
