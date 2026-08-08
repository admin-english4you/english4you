import { AppLayout } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";

export default function StudentClassesLoading() {
  return (
    <AppLayout role="STUDENT">
      <div className="animate-in fade-in duration-500 w-full mx-auto">
        
        {/* Cabeçalho Superior (Minha Turma) */}
        <div className="flex flex-col space-y-3 rounded-2xl border bg-card p-6 shadow-sm">
          <Skeleton className="h-8 w-48 sm:w-64 rounded-lg" />
          <Skeleton className="h-4 w-64 sm:w-96 rounded-md" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          
          {/* Coluna Esquerda: Card de Detalhes da Turma (1/3 da tela) */}
          <div className="flex flex-col rounded-2xl border bg-card shadow-sm overflow-hidden lg:col-span-1">
            {/* Topo do Card (Simula a área azul) */}
            <div className="bg-muted/30 p-6 space-y-3 border-b">
              <Skeleton className="h-3 w-24 rounded-md" /> {/* Label MINHA TURMA */}
              <Skeleton className="h-7 w-3/4 rounded-lg" /> {/* Nome da Turma */}
              <Skeleton className="h-4 w-1/4 rounded-md" /> {/* Nível */}
            </div>

            {/* Área do Professor */}
            <div className="flex items-center gap-4 p-6">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="h-5 w-32 rounded-md" />
              </div>
            </div>

            {/* Cards internos (Horário e Plano de Ensino) */}
            <div className="grid grid-cols-2 gap-4 px-6 pb-6">
              <div className="space-y-2 rounded-xl bg-muted/20 p-4">
                <Skeleton className="h-3 w-12 rounded-md" />
                <Skeleton className="h-8 w-full rounded-md" />
              </div>
              <div className="space-y-2 rounded-xl bg-muted/20 p-4">
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="h-8 w-full rounded-md" />
              </div>
            </div>

            {/* Barra de Progresso */}
            <div className="p-6 pt-0 space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-3 w-24 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </div>

          {/* Coluna Direita: Listas de Aulas (2/3 da tela) */}
          <div className="space-y-8 lg:col-span-2">
            
            {/* Seção 1: Próximas Aulas */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-32 rounded-md" /> {/* Título da Seção */}
                <Skeleton className="h-6 w-8 rounded-full" /> {/* Badge Numérico */}
              </div>
              
              {/* Item da Lista (Card da Aula) */}
              <div className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm">
                <Skeleton className="h-12 w-12 rounded-full" /> {/* Ícone Play */}
                <div className="flex-1 space-y-3">
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-28 rounded-full" /> {/* Badge Data */}
                    <Skeleton className="h-6 w-20 rounded-full" /> {/* Badge Hora */}
                  </div>
                  <Skeleton className="h-6 w-48 rounded-md" /> {/* Título da Aula */}
                  <Skeleton className="h-4 w-32 rounded-md" /> {/* Nome do Professor */}
                </div>
                <Skeleton className="hidden sm:block h-6 w-6 rounded-full" /> {/* Seta direita */}
              </div>
            </div>

            {/* Seção 2: Aulas Anteriores */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-32 rounded-md" />
                <Skeleton className="h-6 w-8 rounded-full" />
              </div>
              
              <div className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-3">
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-28 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-6 w-48 rounded-md" />
                  <Skeleton className="h-4 w-32 rounded-md" />
                </div>
                <Skeleton className="hidden sm:block h-6 w-6 rounded-full" />
              </div>
            </div>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}