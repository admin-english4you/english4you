import { Skeleton } from "@/components/ui/skeleton";

export default function TeacherClassesLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
