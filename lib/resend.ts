import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

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
      from: "English4You <onboarding@resend.dev>",
      to: [email],
      subject: "Bem-vindo à English4You - Defina sua Senha de Acesso",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #07274f; font-size: 24px; margin-bottom: 16px;">Olá, ${name}!</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #475569;">
            Seu cadastro na plataforma <strong>English4You</strong> foi concluído com sucesso.
          </p>
          <p style="font-size: 15px; line-height: 1.6; color: #475569;">
            Para definir sua senha de acesso e entrar no seu painel, clique no botão abaixo:
          </p>
          <div style="margin: 28px 0; text-align: center;">
            <a href="${link}" style="background-color: #016ad1; color: #ffffff; padding: 14px 28px; font-weight: bold; font-size: 15px; text-decoration: none; border-radius: 8px; display: inline-block;">
              Definir Minha Senha
            </a>
          </div>
          <p style="font-size: 13px; color: #94a3b8; margin-top: 24px;">
            Se você não solicitou este acesso, por favor desconsidere este e-mail.
          </p>
        </div>
      `,
    });
    console.log(`[Resend] E-mail de convite enviado com sucesso para ${email}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Resend] Erro ao enviar e-mail:", errorMessage);
  }
}
