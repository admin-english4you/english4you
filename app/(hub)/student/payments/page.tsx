import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { userService } from "@/modules/user/user.service";
import { paymentService } from "@/modules/payment/payment.service";
import { PaymentsView } from "./_components/PaymentsView";

export const metadata: Metadata = {
  title: "Pagamentos | English4You",
  description: "Acompanhe suas mensalidades e gerencie o cartão da assinatura.",
};

export default async function StudentPaymentsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const [user, billing] = await Promise.all([
    userService.getUserById(currentUser.id),
    paymentService.getMyBilling(currentUser.id),
  ]);

  if (!user) redirect("/login");

  return <PaymentsView user={user} billing={billing} />;
}
