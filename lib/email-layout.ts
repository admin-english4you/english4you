/**
 * Layout compartilhado dos e-mails transacionais (Resend). Antes cada e-mail
 * (convite, gravação disponível, ...) tinha seu próprio HTML inline duplicado
 * — qualquer ajuste de marca (cor, borda, rodapé) precisava ser repetido em
 * cada função. Este arquivo é a única fonte da moldura visual; cada e-mail
 * só monta o conteúdo de dentro.
 */

export interface EmailAction {
  label: string;
  href: string;
}

export interface EmailLayoutParams {
  /** Título grande no topo do corpo (ex: "Olá, Ana!"). */
  heading: string;
  /** Parágrafos do corpo, em ordem — cada string vira um `<p>`. */
  paragraphs: string[];
  /** Botão de destaque, opcional (nem todo e-mail tem uma ação principal). */
  action?: EmailAction;
  /** Texto pequeno e discreto no fim, antes do rodapé (ex: aviso de segurança). */
  footnote?: string;
}

const BRAND_NAVY = "#04215d";
const BRAND_BLUE = "#04215d";

/**
 * Envolve o conteúdo na moldura visual padrão: cabeçalho com a marca, corpo
 * branco com borda arredondada, botão de destaque opcional e rodapé com o
 * ano corrente. `paragraphs` já pode conter HTML simples (`<strong>`) — não é
 * escapado, então nunca passe texto de entrada de usuário sem sanitizar.
 */
export function renderEmailLayout({ heading, paragraphs, action, footnote }: EmailLayoutParams): string {
  const paragraphsHtml = paragraphs
    .map(
      (text) =>
        `<p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 16px;">${text}</p>`
    )
    .join("");

  const actionHtml = action
    ? `
      <div style="margin: 28px 0; text-align: center;">
        <a href="${action.href}" style="background-color: ${BRAND_BLUE}; color: #ffffff; padding: 14px 28px; font-weight: bold; font-size: 15px; text-decoration: none; border-radius: 8px; display: inline-block;">
          ${action.label}
        </a>
      </div>
    `
    : "";

  const footnoteHtml = footnote
    ? `<p style="font-size: 13px; color: #94a3b8; margin-top: 24px; line-height: 1.5;">${footnote}</p>`
    : "";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 32px 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 18px; font-weight: bold; color: ${BRAND_NAVY}; letter-spacing: -0.02em;">
          English4You
        </span>
      </div>

      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px;">
        <h2 style="color: ${BRAND_NAVY}; font-size: 22px; margin: 0 0 16px;">${heading}</h2>
        ${paragraphsHtml}
        ${actionHtml}
        ${footnoteHtml}
      </div>

      <p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 20px;">
        © ${new Date().getFullYear()} English4You. Este é um e-mail automático, não é preciso responder.
      </p>
    </div>
  `;
}
