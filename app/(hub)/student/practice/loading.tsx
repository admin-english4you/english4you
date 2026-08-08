import { AppLayout } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";

export default function StudentPracticeLoading() {
  return (
    <AppLayout role="STUDENT">
<div className="animate-in fade-in duration-500 w-full mx-auto">
      
      {/* Cabeçalho (Prática) */}
      <div className="flex flex-col space-y-3 rounded-2xl border bg-card p-6 shadow-sm mb-6">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-4 w-64 sm:w-96 rounded-md" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Coluna Esquerda: Trilha de Prática (2/3 da tela) */}
        <div className="flex flex-col rounded-2xl border bg-card p-6 shadow-sm lg:col-span-2">
          
          {/* Topo do Card (Nível, Título e Data) */}
          <div className="flex justify-between items-start mb-6">
            <div className="space-y-3">
              <Skeleton className="h-3 w-32 rounded-md" />
              <Skeleton className="h-6 w-16 rounded-md" />
              <Skeleton className="h-4 w-40 rounded-md" />
            </div>
            <Skeleton className="h-4 w-12 rounded-md" />
          </div>

          {/* Barra de progresso horizontal principal */}
          <Skeleton className="h-1.5 w-full rounded-full mb-10" />

          {/* Stepper / Linha do tempo dos dias (As 6 bolinhas) */}
          <div className="relative flex w-full justify-between items-start pt-2">
            {/* Linha conectora no fundo */}
            <div className="absolute top-6 left-6 right-6 h-0.5 bg-muted/60 -z-10 hidden sm:block" />
            
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center space-y-3 bg-card px-1 sm:px-2">
                <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-full" />
                <div className="space-y-1.5 flex flex-col items-center">
                  <Skeleton className="h-2 w-8 sm:w-10 rounded-full" />
                  <Skeleton className="h-2 w-12 sm:w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coluna Direita: Cards de Resumo (1/3 da tela) */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Card Escuro (Tudo feito por hoje) */}
          {/* Usando slate-900 para forçar o aspecto escuro independente do tema claro/escuro global */}
          <div className="rounded-2xl bg-slate-900 p-6 shadow-sm space-y-4 text-slate-100">
            <Skeleton className="h-3 w-32 bg-slate-700 rounded-md" />
            <Skeleton className="h-6 w-48 bg-slate-700 rounded-md" />
            <Skeleton className="h-4 w-full bg-slate-700 rounded-md" />
          </div>

          {/* Card Claro (Saldo da Semana) */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-24 rounded-md" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-12 rounded-md" />
              </div>
            </div>
            
            <Skeleton className="h-8 w-20 rounded-md" />
            
            <div className="space-y-2">
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-3 w-40 rounded-md" />
            </div>
          </div>
          
        </div>
      </div>
    </div>
    </AppLayout>
  );
}
