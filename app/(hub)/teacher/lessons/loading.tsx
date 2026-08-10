import { Skeleton } from "@/components/ui/skeleton";

export default function TeacherLessonsLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="mt-6 space-y-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
