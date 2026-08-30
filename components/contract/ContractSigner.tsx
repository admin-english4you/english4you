"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, PenLine, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LessonContentView } from "@/components/lesson/LessonContentView";
import { cn } from "@/lib/utils";
import { formatCep, formatCpf, formatPhone } from "@/lib/br-document";
import { saveSigningIdentityAction, signContractAction } from "@/modules/contract/contract.actions";
import { SigningIdentitySchema } from "@/modules/contract/contract.schema";
import type { StudentContractView } from "@/modules/contract/contract.types";
import type { User } from "@/modules/user/user.types";

interface ContractSignerProps {
  contract: StudentContractView;
  user: User;
}

/**
 * Assinatura de contrato em 3 passos (dados pessoais → leitura → assinatura).
 *
 * Mora em `components/` e não num `_components/` de rota porque é usado por dois
 * lugares: `/student/documents` (renovação, contrato avulso) e `/onboarding`
 * (matrícula, onde é o passo 1 do wizard). Depois de assinar ele só chama
 * `router.refresh()` — quem decide o que vem a seguir é o RSC que o renderizou.
 */

/** `z.input` e não `z.infer`: o schema tem `.transform()`, então a entrada do form é string crua. */
type IdentityFormInput = {
  phone: string;
  document: string;
  addressZipCode: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement?: string;
  addressDistrict: string;
  addressCity: string;
  addressState: string;
};

export function ContractSigner({ contract, user }: ContractSignerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Já preenchido (renovação) começa recolhido, direto na leitura.
  const [showIdentityForm, setShowIdentityForm] = useState(contract.needsIdentity);
  const [signedName, setSignedName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IdentityFormInput>({
    resolver: zodResolver(SigningIdentitySchema),
    defaultValues: {
      phone: formatPhone(user.phone),
      document: user.document ?? "",
      addressZipCode: user.addressZipCode ?? "",
      addressStreet: user.addressStreet ?? "",
      addressNumber: user.addressNumber ?? "",
      addressComplement: user.addressComplement ?? "",
      addressDistrict: user.addressDistrict ?? "",
      addressCity: user.addressCity ?? "",
      addressState: user.addressState ?? "",
    },
  });

  const onSaveIdentity = (data: IdentityFormInput) => {
    setError(null);
    startTransition(async () => {
      const result = await saveSigningIdentityAction(data);
      if (result.success) {
        setShowIdentityForm(false);
        // Recarrega para que a prévia do contrato venha do servidor já com os
        // dados novos — é exatamente o texto que será congelado na assinatura.
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  const handleSign = () => {
    setError(null);
    startTransition(async () => {
      const result = await signContractAction({
        contractId: contract.id,
        signedName,
        acceptedTerms: true,
      });
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  const canSign = !contract.needsIdentity && signedName.trim().length >= 3 && accepted;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-200 bg-amber-50/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold text-slate-900">Contrato de curso</h2>
          <p className="text-xs text-slate-500">
            {contract.packageName ? `Pacote ${contract.packageName}` : "Leia e assine para concluir sua matrícula"}
          </p>
        </div>
        <span className="inline-flex w-fit items-center rounded-md border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
          Aguardando sua assinatura
        </span>
      </div>

      <div className="space-y-6 p-6">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            {error}
          </div>
        )}

        {/* Passo 1 — dados pessoais */}
        <section>
          <StepHeader
            number={1}
            title="Seus dados"
            done={!contract.needsIdentity && !showIdentityForm}
          />

          {showIdentityForm ? (
            <form onSubmit={handleSubmit(onSaveIdentity)} className="mt-3 space-y-4">
              <p className="text-xs text-slate-500">
                Precisamos destes dados para preencher o contrato. Eles ficam guardados no seu perfil.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="CPF" error={errors.document?.message}>
                  <Input placeholder="000.000.000-00" {...register("document")} />
                </Field>
                <Field label="Telefone" error={errors.phone?.message}>
                  <Input
                    type="tel"
                    inputMode="tel"
                    placeholder="(11) 90000-0000"
                    {...register("phone")}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="CEP" error={errors.addressZipCode?.message}>
                  <Input placeholder="00000-000" {...register("addressZipCode")} />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Field label="Logradouro" error={errors.addressStreet?.message}>
                    <Input placeholder="Rua, avenida..." {...register("addressStreet")} />
                  </Field>
                </div>
                <Field label="Número" error={errors.addressNumber?.message}>
                  <Input placeholder="123" {...register("addressNumber")} />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Complemento (opcional)" error={errors.addressComplement?.message}>
                  <Input placeholder="Apto, bloco..." {...register("addressComplement")} />
                </Field>
                <Field label="Bairro" error={errors.addressDistrict?.message}>
                  <Input {...register("addressDistrict")} />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Field label="Cidade" error={errors.addressCity?.message}>
                    <Input {...register("addressCity")} />
                  </Field>
                </div>
                <Field label="UF" error={errors.addressState?.message}>
                  <Input placeholder="SP" maxLength={2} {...register("addressState")} />
                </Field>
              </div>

              <Button type="submit" loading={isPending} className="bg-primary hover:bg-primary/80">
                Salvar e continuar
              </Button>
            </form>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <span>
                <strong className="text-slate-500">CPF:</strong> {formatCpf(user.document)}
              </span>
              <span>
                <strong className="text-slate-500">Telefone:</strong> {formatPhone(user.phone)}
              </span>
              <span className="min-w-0 flex-1 truncate">
                <strong className="text-slate-500">Endereço:</strong> {user.addressStreet},{" "}
                {user.addressNumber} — {user.addressCity}/{user.addressState},{" "}
                {formatCep(user.addressZipCode)}
              </span>
              <button
                type="button"
                onClick={() => setShowIdentityForm(true)}
                className="font-semibold text-primary hover:underline"
              >
                Alterar
              </button>
            </div>
          )}
        </section>

        {/* Passo 2 — leitura */}
        <section>
          <StepHeader number={2} title="Leia o contrato" />
          <div className="mt-3 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-5">
            {contract.needsIdentity ? (
              <p className="py-8 text-center text-sm text-slate-500">
                Preencha seus dados acima para ver o contrato completo.
              </p>
            ) : (
              <LessonContentView html={contract.html} />
            )}
          </div>
        </section>

        {/* Passo 3 — assinatura */}
        <section>
          <StepHeader number={3} title="Assine" />
          <div className="mt-3 space-y-4 rounded-xl border border-slate-200 p-5">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Digite seu nome completo
              </label>
              <Input
                value={signedName}
                onChange={(e) => setSignedName(e.target.value)}
                placeholder={user.name}
                disabled={contract.needsIdentity || isPending}
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Deve ser igual ao nome do seu cadastro: {user.name}
              </p>
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                disabled={contract.needsIdentity || isPending}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-primary accent-primary disabled:cursor-not-allowed"
              />
              <span>Li e concordo com os termos do contrato acima.</span>
            </label>

            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
              <Button
                onClick={handleSign}
                disabled={!canSign}
                loading={isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {!isPending && <PenLine className="mr-2 h-4 w-4" />}
                Assinar contrato
              </Button>
              <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Registramos a data, a hora e o seu IP como comprovante da assinatura.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function StepHeader({ number, title, done = false }: { number: number; title: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          done ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
        )}
      >
        {done ? <Check className="h-3.5 w-3.5" /> : number}
      </span>
      <h3 className="font-semibold text-slate-800">{title}</h3>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}
