"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toaster";

interface PracticeNoticeProps {
  notice: string | null;
}

/**
 * Mostra a mensagem de `?notice=` (dia bloqueado ao tentar reabrir uma
 * prática) e limpa o parâmetro da URL, sem re-render visível na trilha.
 */
export function PracticeNotice({ notice }: PracticeNoticeProps) {
  const router = useRouter();

  useEffect(() => {
    if (!notice) return;
    toast.error(notice);
    router.replace("/student/practice");
  }, [notice, router]);

  return null;
}
