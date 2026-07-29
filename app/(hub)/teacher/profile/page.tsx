import { getCurrentUser } from "@/lib/auth-server";
import { userService } from "@/modules/user/user.service";
import { ProfileEditor } from "@/modules/user/_components/ProfileEditor";
import { redirect } from "next/navigation";

export default async function TeacherProfilePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/staff/login");

  const user = await userService.getUserById(currentUser.id);
  if (!user) redirect("/staff/login");

  return <ProfileEditor user={user} />;
}
