import { AppLayout } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";

export default function StudentDashboardLoading() {
  return (
    <AppLayout role="STUDENT">
      <div className="mx-auto w-full space-y-8 animate-in fade-in duration-500">
        
        {/* Cabeçalho Universal (Simula Título da Página e Breadcrumbs/Filtros) */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-8 w-48 sm:w-64 rounded-lg" />
            <Skeleton className="h-4 w-32 rounded-md" />
          </div>
          <Skeleton className="hidden sm:block h-10 w-24 rounded-lg" />
        </div>

        {/* Bloco de Destaque (Simula o card da "Próxima Aula" ou "Banner") */}
        <div className="flex flex-col space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <Skeleton className="h-6 w-1/3 rounded-lg" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-4/5 rounded-md" />
            <Skeleton className="h-4 w-2/3 rounded-md" />
          </div>
          <div className="flex gap-3 pt-4">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </div>

        {/* Grid Inferior (Simula Histórico de Aulas, Exercícios ou Cadernos) */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col space-y-4 rounded-xl border bg-card p-5 shadow-sm">
              {/* Simula uma thumbnail ou área de ícone */}
              <Skeleton className="h-32 w-full rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4 rounded-md" />
                <Skeleton className="h-4 w-1/2 rounded-md" />
              </div>
            </div>
          ))}
        </div>

      </div>
    </AppLayout>
  );
}