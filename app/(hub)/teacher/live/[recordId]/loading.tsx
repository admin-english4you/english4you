import { Skeleton } from "@/components/ui/skeleton";

export default function TeacherClassRoomLoading() {
  return (
    <div className="flex h-screen flex-col animate-in fade-in duration-500">
      {/* TeacherClassRoomTopBar */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-800 bg-slate-900 px-3 sm:px-5">
        <Skeleton className="h-8 w-8 rounded-lg bg-slate-800" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-2.5 w-32 rounded-full bg-slate-800" />
          <Skeleton className="h-4 w-48 rounded-md bg-slate-800" />
        </div>
        <Skeleton className="h-6 w-24 shrink-0 rounded-full bg-slate-800" />
      </header>

      {/* `min-h-0` obrigatório: sem ele o overflow não rola dentro da linha do grid. */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-4">
        {/* BoardEditor — 3/4 da largura, fundo branco */}
        <section className="min-h-0 bg-white lg:col-span-3">
          <div className="flex h-full flex-col">
            <div className="flex shrink-0 items-center gap-1 border-b border-slate-200 px-3 py-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-7 rounded-md" />
              ))}
            </div>
            <div className="flex-1 space-y-3 p-6">
              <Skeleton className="h-5 w-2/3 rounded-md" />
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-5/6 rounded-md" />
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <Skeleton className="mt-6 h-40 w-full rounded-lg" />
            </div>
          </div>
        </section>

        {/* TeacherVideoPanel — 1/4 da largura, fundo escuro */}
        <aside className="min-h-0 border-t border-slate-800 bg-slate-900 lg:col-span-1 lg:border-t-0 lg:border-l">
          <div className="flex h-full flex-col">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-3">
              <Skeleton className="h-2.5 w-24 rounded-full bg-slate-800" />
              <Skeleton className="h-4 w-20 rounded-full bg-slate-800" />
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-hidden p-4">
              <Skeleton className="aspect-video w-full rounded-xl bg-slate-800" />

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Skeleton className="h-2.5 w-16 rounded-full bg-slate-800" />
                  <Skeleton className="h-2.5 w-6 rounded-full bg-slate-800" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-video w-full rounded-lg bg-slate-800" />
                  ))}
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-800 p-3">
              <Skeleton className="h-10 w-full rounded-lg bg-slate-800" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
