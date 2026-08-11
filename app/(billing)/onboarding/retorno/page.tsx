import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { CheckoutReturn } from "./_components/CheckoutReturn";

export const metadata: Metadata = {
  title: "Confirmando pagamento | English4You",
};

/**
 * `back_url` do preapproval: para onde o Mercado Pago devolve o aluno depois do
 * checkout. Não dá para decidir nada aqui — o MP redireciona assim que o aluno
 * conclui, e a confirmação chega pelo webhook, que costuma vir alguns segundos
 * depois. Quem espera é o client, em polling.
 */
export default async function CheckoutReturnPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  return <CheckoutReturn />;
}
