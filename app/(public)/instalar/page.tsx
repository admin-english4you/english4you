import type { Metadata } from "next";
import { InstallPwaView } from "./_components/InstallPwaView";

export const metadata: Metadata = {
  title: "Instalar o App | English4You",
  description: "Instale a English4You no seu celular ou computador em poucos passos.",
};

/**
 * Página pública (sem login) pra onde o admin manda o link do WhatsApp/e-mail
 * de matrícula — o aluno instala o PWA sem precisar entender o que é um PWA.
 * Fica fora do (hub) de propósito: quem ainda não tem conta também deveria
 * conseguir instalar antes de logar pela primeira vez.
 */
export default function InstallPwaPage() {
  return <InstallPwaView />;
}
