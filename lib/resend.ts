import { Resend } from "resend";
import { renderEmailLayout } from "./email-layout";

const resendApiKey = process.env.RESEND_API_KEY;

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM = "English4You <onboarding@resend.dev>";

export interface SendInviteEmailParams {
  email: string;
  name: string;
  resetLink?: string;
}

export async function sendUserInviteEmail({ email, name, resetLink }: SendInviteEmailParams) {
  if (!resend) {
    console.warn("[Resend] RESEND_API_KEY não está configurada em .env.local");
    return;
  }

  try {
    const link = resetLink || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`;

    await resend.emails.send({
      from: FROM,
      to: [email],
      subject: "Bem-vindo à English4You — Defina sua senha de acesso",
      html: renderEmailLayout({
        heading: `Olá, ${name}!`,
        paragraphs: [
          "Seu cadastro na plataforma <strong>English4You</strong> foi concluído com sucesso.",
          "Para definir sua senha de acesso e entrar no seu painel, clique no botão abaixo:",
        ],
        action: { label: "Definir minha senha", href: link },
        footnote: "Se você não solicitou este acesso, pode ignorar este e-mail com segurança.",
      }),
    });
    console.log(`[Resend] E-mail de convite enviado com sucesso para ${email}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Resend] Erro ao enviar e-mail:", errorMessage);
  }
}

export interface SendPasswordResetRequestEmailParams {
  email: string;
  name: string;
  resetLink: string;
}

/**
 * Link de redefinição de senha, disparado por `requestPasswordResetAction`
 * (fluxo público de "esqueci minha senha"). Substitui o e-mail padrão do
 * Firebase Auth pelo nosso template — mesmo `resetLink` gerado por
 * `adminAuth.generatePasswordResetLink`, só a casca visual muda.
 */
export async function sendPasswordResetRequestEmail({
  email,
  name,
  resetLink,
}: SendPasswordResetRequestEmailParams) {
  if (!resend) {
    console.warn("[Resend] RESEND_API_KEY não está configurada em .env.local");
    return;
  }

  try {
    await resend.emails.send({
      from: FROM,
      to: [email],
      subject: "Redefinição de senha — English4You",
      html: renderEmailLayout({
        heading: `Olá, ${name}!`,
        paragraphs: [
          "Recebemos um pedido para redefinir a senha da sua conta na <strong>English4You</strong>.",
          "Clique no botão abaixo para escolher uma nova senha. O link expira em algumas horas.",
        ],
        action: { label: "Redefinir minha senha", href: resetLink },
        footnote:
          "Se você não pediu essa redefinição, pode ignorar este e-mail — sua senha atual continua a mesma.",
      }),
    });
    console.log(`[Resend] E-mail de redefinição de senha enviado para ${email}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Resend] Erro ao enviar e-mail de redefinição:", errorMessage);
  }
}

export interface SendAccountDeactivatedEmailParams {
  email: string;
  name: string;
}

/**
 * Aviso de conta desativada, disparado por `userService.setUserStatus` ao
 * transicionar pra `Inactive` — best-effort, mesmo padrão das outras funções
 * deste arquivo (nunca lança, só loga).
 */
export async function sendAccountDeactivatedEmail({ email, name }: SendAccountDeactivatedEmailParams) {
  if (!resend) {
    console.warn("[Resend] RESEND_API_KEY não está configurada em .env.local");
    return;
  }

  try {
    await resend.emails.send({
      from: FROM,
      to: [email],
      subject: "Sua conta na English4You foi desativada",
      html: renderEmailLayout({
        heading: `Olá, ${name}.`,
        paragraphs: [
          "Sua conta na plataforma <strong>English4You</strong> foi desativada por um administrador e o acesso ao painel foi encerrado.",
          "Se você acredita que isso foi um engano, entre em contato com a coordenação da escola.",
        ],
      }),
    });
    console.log(`[Resend] E-mail de conta desativada enviado para ${email}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Resend] Erro ao enviar e-mail de desativação:", errorMessage);
  }
}

export interface SendClassRecordingEmailParams {
  email: string;
  studentName: string;
  className: string;
  lessonTitle: string;
  recordingUrl: string;
}

/**
 * Aviso de gravação disponível, disparado pelo webhook do Stream
 * (classService.handleRecordingReady). Best-effort por aluno — nunca lança
 * pro chamador, mesmo padrão de sendUserInviteEmail.
 */
export async function sendClassRecordingEmail({
  email,
  studentName,
  className,
  lessonTitle,
  recordingUrl,
}: SendClassRecordingEmailParams) {
  if (!resend) {
    console.warn("[Resend] RESEND_API_KEY não está configurada em .env.local");
    return;
  }

  try {
    await resend.emails.send({
      from: FROM,
      to: [email],
      subject: `Gravação disponível: ${lessonTitle}`,
      html: renderEmailLayout({
        heading: `Olá, ${studentName}!`,
        paragraphs: [
          `A gravação da aula <strong>${lessonTitle}</strong> da turma <strong>${className}</strong> já está disponível para você reassistir.`,
        ],
        action: { label: "Assistir gravação", href: recordingUrl },
      }),
    });
    console.log(`[Resend] E-mail de gravação disponível enviado para ${email}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Resend] Erro ao enviar e-mail de gravação:", errorMessage);
  }
}
