import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { todayKey } from "@/lib/date";
import { userService } from "@/modules/user/user.service";
import { classService } from "@/modules/class/class.service";
import { ProfileEditor } from "@/modules/user/_components/ProfileEditor";
import { TeacherProfileAside } from "./_components/TeacherProfileAside";

export default async function TeacherProfilePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/staff/login");

  const user = await userService.getUserById(currentUser.id);
  if (!user) redirect("/staff/login");

  const overview = await classService.getTeacherClassesOverview(currentUser.id);

  return (
    <ProfileEditor
      user={user}
      aside={<TeacherProfileAside overview={overview} todayKey={todayKey()} />}
    />
  );
}
