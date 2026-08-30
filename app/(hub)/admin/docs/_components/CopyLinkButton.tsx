"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";

interface CopyLinkButtonProps {
  /** Âncora do tópico — vira o `#id` do link. */
  anchorId: string;
  /** Descreve o alvo no aviso de sucesso e no rótulo acessível. */
  title: string;
  className?: string;
}

/**
 * Copia o link direto de um tópico da documentação.
 *
 * Monta a URL a partir de `window.location` em vez de um domínio fixo, para o
 * link funcionar igual em produção, em preview da Vercel e em localhost — o
 * mesmo botão serve para mandar ao cliente e para conferir aqui.
 */
export function CopyLinkButton({ anchorId, title, className }: CopyLinkButtonProps) {
  const [copiado, setCopiado] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}${window.location.pathname}#${anchorId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      toast.success(`Link de "${title}" copiado.`);
      // Volta ao ícone normal: o ✓ é confirmação momentânea, não estado.
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Clipboard bloqueado (http, permissão negada): mostrar a URL ainda
      // permite copiar à mão, o que é melhor do que um clique que não faz nada.
      toast.error(`Não foi possível copiar. O link é: ${url}`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copiar link de ${title}`}
      title="Copiar link deste tópico"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md p-1 text-slate-300 transition-colors",
        "hover:bg-slate-100 hover:text-primary",
        // Só aparece de verdade no hover do cabeçalho, para não poluir a
        // leitura — mas continua focável pelo teclado.
        "opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
        copiado && "text-emerald-600 opacity-100",
        className
      )}
    >
      {copiado ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
    </button>
  );
}
