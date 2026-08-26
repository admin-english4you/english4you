"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, Copy, Save } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { cn } from "@/lib/utils";
import { updateContractTemplateAction } from "@/modules/contract/contract.actions";
import {
  CONTRACT_PLACEHOLDERS,
  findPlaceholderKeys,
  findUnknownPlaceholderKeys,
} from "@/modules/contract/contract.utils";
import type { ContractTemplate } from "@/modules/contract/contract.types";

interface ContractTemplateEditorProps {
  template: ContractTemplate;
}

const ROLE_LABELS = { STUDENT: "Aluno", TEACHER: "Professor" } as const;

export function ContractTemplateEditor({ template }: ContractTemplateEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(template.name);
  const [content, setContent] = useState(template.content);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Detecção ao vivo: é o que faz o admin perceber na hora quando o editor
  // partiu um `{{token}}` em duas tags (ex: ao negritar metade dele) — nesse
  // caso a variável simplesmente some desta lista.
  const usedKeys = useMemo(() => new Set(findPlaceholderKeys(content)), [content]);
  const unknownKeys = useMemo(() => findUnknownPlaceholderKeys(content), [content]);

  const handleCopy = async (key: string) => {
    await navigator.clipboard.writeText(`{{${key}}}`);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateContractTemplateAction({ templateId: template.id, name, content });
      if (result.success) {
        setSavedAt(new Date());
        // Editar um modelo já usado gera uma NOVA versão — o id muda, então
        // volta para a lista em vez de continuar editando um id obsoleto.
        if (result.data && result.data.id !== template.id) {
          router.push("/admin/finance?tab=modelos");
          return;
        }
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <AppLayout role="ADMIN">
      <div className="mx-auto space-y-4">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/admin/finance?tab=modelos"
              aria-label="Voltar para modelos"
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Modelo de contrato · {ROLE_LABELS[template.targetRole]} · v{template.version}
                {template.isActive && <span className="ml-2 text-emerald-600">Ativo</span>}
              </p>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 border-transparent px-0 text-lg font-bold shadow-none focus-visible:border-slate-300 focus-visible:px-3"
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {savedAt && !isPending && (
              <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Check className="h-3 w-3 text-emerald-500" /> Salvo
              </span>
            )}
            <Button
              onClick={handleSave}
              loading={isPending}
              disabled={unknownKeys.length > 0}
              className="bg-primary hover:bg-primary/80"
            >
              {!isPending && <Save className="mr-2 h-4 w-4" />}
              Salvar
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            {error}
          </div>
        )}

        {unknownKeys.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Variável não reconhecida:{" "}
              <strong>{unknownKeys.map((k) => `{{${k}}}`).join(", ")}</strong>. Use apenas as variáveis
              da lista ao lado — o modelo não pode ser salvo assim.
            </span>
          </div>
        )}

        {template.isActive && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
            Este é o modelo ativo. Se já existirem contratos usando ele, salvar cria uma nova versão em
            vez de alterar a atual — contratos já assinados nunca mudam.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <div className="h-[600px] overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
              <SimpleEditor content={template.content} onChange={setContent} />
            </div>
          </div>

          <aside className="lg:col-span-1">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Variáveis</h3>
              <p className="mt-1 text-[11px] text-slate-400">
                Clique para copiar e cole no texto. Em verde, as que já estão no modelo.
              </p>

              <div className="mt-3 max-h-[480px] space-y-1 overflow-y-auto pr-1">
                {CONTRACT_PLACEHOLDERS.map((placeholder) => {
                  const isUsed = usedKeys.has(placeholder.key);
                  return (
                    <button
                      key={placeholder.key}
                      type="button"
                      onClick={() => handleCopy(placeholder.key)}
                      title={`Exemplo: ${placeholder.example}`}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors",
                        isUsed
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-slate-200 bg-slate-50/60 hover:bg-slate-100"
                      )}
                    >
                      <span className="min-w-0">
                        <span
                          className={cn(
                            "block truncate font-mono text-[11px] font-semibold",
                            isUsed ? "text-emerald-700" : "text-slate-600"
                          )}
                        >
                          {`{{${placeholder.key}}}`}
                        </span>
                        <span className="block truncate text-[10px] text-slate-400">
                          {placeholder.label}
                        </span>
                      </span>
                      {copiedKey === placeholder.key ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
