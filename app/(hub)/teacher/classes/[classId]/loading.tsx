import { Skeleton } from "@/components/ui/skeleton";

export default function TeacherClassDetailLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-xl lg:col-span-1" />
        <Skeleton className="h-72 rounded-xl lg:col-span-2" />
      </div>
    </div>
  );
}
