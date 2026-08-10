import { AppLayout } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";

export default function TeacherLessonsLoading() {
  return (
    <AppLayout role="TEACHER">
      <div className="animate-in fade-in duration-500">
        {/* PageHeader (Lições) */}
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
          <div className="space-y-3">
            <Skeleton className="h-7 w-24 rounded-lg" />
            <Skeleton className="h-4 w-80 rounded-md" />
          </div>
        </div>

        {/* Grupos por plano de ensino, cada um com suas lições */}
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, gi) => (
            <div key={gi} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-5 w-40 rounded-md" />
              </div>
              <Skeleton className="mt-2 h-3 w-64 rounded-md" />

              <div className="mt-4 space-y-2">
                {Array.from({ length: 4 }).map((_, li) => (
                  <div
                    key={li}
                    className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-48 rounded-md" />
                      <Skeleton className="h-3 w-20 rounded-md" />
                    </div>
                    <Skeleton className="h-5 w-16 shrink-0 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
