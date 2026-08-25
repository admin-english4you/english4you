"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Fingerprint, Lock, ShieldCheck } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { revealUserIdentityAction } from "@/modules/user/user.actions";
import { useSessionUser } from "@/components/layout/SessionProvider";
import { formatCpf, formatCep } from "@/lib/br-document";

interface IdentityVaultProps {
  userId: string;
  userName: string;
  hasIdentity: boolean;
  hasPhone: boolean;
}

interface Identity {
  document: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressDistrict: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZipCode: string | null;
  phone: string | null;
}

/**
 * CPF, endereço e telefone — escondidos até o admin reconfirmar a senha.
 *
 * O dado NÃO está na página: `revealUserIdentityAction` é quem vai buscá-lo, e
 * só devolve depois que o servidor valida um ID token recém-emitido para a
 * conta do próprio admin. A senha digitada aqui vai direto para o Firebase
 * (`signInWithEmailAndPassword`), nunca para o nosso servidor — mesmo desenho
 * do login.
 */
export function IdentityVault({ userId, userName, hasIdentity, hasPhone }: IdentityVaultProps) {
  const sessionUser = useSessionUser();
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);

  const hasAnything = hasIdentity || hasPhone;

  const handleReveal = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!sessionUser) {
      setError("Sessão expirada. Recarregue a página.");
      return;
    }

    startTransition(async () => {
      let idToken: string;
      try {
        // Reautenticação: confirma que quem está na frente da tela é o admin
        // logado, e não alguém que encontrou a sessão aberta. A senha vai
        // direto para o Firebase — nosso servidor recebe só o token.
        const credential = await signInWithEmailAndPassword(
          auth,
          sessionUser.email,
          password
        );
        idToken = await credential.user.getIdToken();
      } catch {
        setError("Senha incorreta.");
        return;
      }

      const result = await revealUserIdentityAction({ userId, idToken });
      if (result.success && result.data) {
        setIdentity(result.data);
        setIsModalOpen(false);
        setPassword("");
      } else if (!result.success) {
        setError(result.error);
      }
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600">
            <Fingerprint className="h-4 w-4" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Dados pessoais</h2>
        </div>

        {identity ? (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" /> Liberado
          </span>
        ) : (
          hasAnything && (
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(true)}>
              <Lock className="mr-1.5 h-3.5 w-3.5" /> Ver dados
            </Button>
          )
        )}
      </div>

      <div className="p-5">
        {!hasAnything ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
            {userName.split(" ")[0]} ainda não informou CPF e endereço. Esses dados são preenchidos
            pelo próprio aluno na hora de assinar o contrato.
          </p>
        ) : identity ? (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="CPF" value={identity.document ? formatCpf(identity.document) : null} />
            <Field label="Telefone" value={identity.phone} />
            <Field
              label="Endereço"
              className="sm:col-span-2"
              value={
                identity.addressStreet
                  ? [
                      `${identity.addressStreet}, ${identity.addressNumber ?? "s/n"}`,
                      identity.addressComplement,
                      identity.addressDistrict,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : null
              }
            />
            <Field
              label="Cidade / UF"
              value={
                identity.addressCity
                  ? `${identity.addressCity}${identity.addressState ? ` - ${identity.addressState}` : ""}`
                  : null
              }
            />
            <Field
              label="CEP"
              value={identity.addressZipCode ? formatCep(identity.addressZipCode) : null}
            />
          </dl>
        ) : (
          <div className="space-y-3">
            {["CPF", "Telefone", "Endereço", "CEP"].map((label) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {label}
                </span>
                <span className="select-none font-mono text-sm tracking-widest text-slate-300">
                  ••••••••••
                </span>
              </div>
            ))}
            <p className="pt-2 text-[11px] leading-relaxed text-slate-400">
              Dados pessoais protegidos. Confirme sua senha para visualizá-los — o acesso é
              individual e expira ao recarregar a página.
            </p>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setPassword("");
          setError(null);
        }}
        title="Confirme sua identidade"
      >
        <form onSubmit={handleReveal} className="space-y-4 p-6">
          <p className="text-sm text-slate-600">
            Para ver os dados pessoais de <strong className="text-slate-900">{userName}</strong>,
            digite a senha da <strong>sua</strong> conta de administrador.
          </p>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Sua senha
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <Modal.Footer>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={isPending} className="bg-indigo-600 text-white hover:bg-indigo-700">
              Ver dados
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
}

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-800">{value ?? "—"}</dd>
    </div>
  );
}
