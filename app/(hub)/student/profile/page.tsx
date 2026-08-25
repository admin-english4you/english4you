import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { todayKey } from "@/lib/date";
import { userService } from "@/modules/user/user.service";
import { classService } from "@/modules/class/class.service";
import { ProfileEditor } from "@/modules/user/_components/ProfileEditor";
import { PushNotificationManager } from "@/components/pwa/PushNotificationManager";
import { NextClassCard } from "./_components/NextClassCard";

export const metadata: Metadata = {
  title: "Meu Perfil | English4You",
  description: "Sua foto, seus dados e a sua próxima aula.",
};

export default async function StudentProfilePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const user = await userService.getUserById(currentUser.id);
  if (!user) redirect("/login");

  const [nextClass, overview] = await Promise.all([
    classService.getStudentNextClass(currentUser.id),
    classService.getStudentClassOverview(currentUser.id),
  ]);

  return (
    <ProfileEditor
      user={user}
      aside={
        <div className="space-y-6">
          <NextClassCard
            record={nextClass}
            classGroup={overview?.classGroup ?? null}
            headTeacherName={overview?.teacher?.name ?? null}
            todayKey={todayKey()}
          />
          <PushNotificationManager />
        </div>
      }
    />
  );
}
