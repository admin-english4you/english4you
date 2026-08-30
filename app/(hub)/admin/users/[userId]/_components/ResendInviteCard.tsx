"use client";

import { useState, useTransition } from "react";
import { Check, KeyRound, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resendInviteAction } from "@/modules/user/user.actions";

interface ResendInviteCardProps {
  userId: string;
  userName: string;
  userEmail: string;
}

/**
 * Reenvia o e-mail de definição de senha.
 *
 * Existe porque o link do Firebase expira: aluno que demora a abrir o convite
 * fica travado, e antes disto a única saída era ele lembrar sozinho do
 * "esqueci minha senha" — na prática, virava ligação para a secretaria.
 */
export function ResendInviteCard({ userId, userName, userEmail }: ResendInviteCardProps) {
  const [isPending, startTransition] = useTransition();
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResend = () => {
    setError(null);
    startTransition(async () => {
      const result = await resendInviteAction({ userId });
      if (result.success) {
        setEnviado(true);
        // Confirmação momentânea: reenviar de novo continua permitido.
        setTimeout(() => setEnviado(false), 4000);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50">
          <KeyRound className="h-4 w-4 text-sky-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-slate-900">Acesso à plataforma</h2>
          <p className="mt-1 text-xs text-slate-500">
            Reenvia para <strong className="text-slate-700">{userEmail}</strong> o e-mail com o
            link para definir a senha. Use quando {userName.split(" ")[0]} disser que o link
            expirou ou que não recebeu o convite.
          </p>

          {error && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          <div className="mt-4">
            <Button variant="outline" size="sm" loading={isPending} onClick={handleResend}>
              {!isPending &&
                (enviado ? (
                  <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                ))}
              {enviado ? "E-mail enviado" : "Reenviar link de senha"}
            </Button>
            <p className="mt-2 text-[11px] text-slate-400">
              O link anterior deixa de valer assim que um novo é enviado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
