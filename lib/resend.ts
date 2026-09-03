import { Resend } from "resend";
import { renderEmailLayout } from "./email-layout";

const resendApiKey = process.env.RESEND_API_KEY;

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM = "English4You <noreply@english4ubr.com.br>";

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
    const link = resetLink || `${process.env.APP_URL || "http://localhost:3000"}/login`;

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

export interface SendFirstPaymentConfirmedEmailParams {
  email: string;
  name: string;
  packageName: string;
  amountCents: number;
  accessUrl: string;
}

/**
 * Confirmação do PRIMEIRO pagamento — disparada pelo webhook do Mercado Pago
 * ao liquidar a cobrança inicial (ver `recordAuthorizedPaymentFromWebhook`).
 *
 * Existe como rede de segurança, não como recibo: depois de aprovar a cobrança,
 * o Mercado Pago leva o aluno para uma página de conclusão que é DELES e que
 * às vezes falha (já vimos um 403 lá). Quando isso acontece, o aluno paga e
 * fica sem saber que já tem acesso. Este e-mail chega pelo nosso lado, com o
 * link direto para a plataforma, e torna aquela tela irrelevante.
 *
 * Só o primeiro: as mensalidades seguintes são cobranças de rotina e um e-mail
 * mensal de "deu certo" viraria ruído.
 *
 * Best-effort, como todas as outras funções deste arquivo — nunca lança. O
 * chamador é um webhook, e falhar aqui faria o Mercado Pago reenfileirar e,
 * após erros seguidos, desabilitar o webhook inteiro.
 */
export async function sendFirstPaymentConfirmedEmail({
  email,
  name,
  packageName,
  amountCents,
  accessUrl,
}: SendFirstPaymentConfirmedEmailParams) {
  if (!resend) {
    console.warn("[Resend] RESEND_API_KEY não está configurada em .env.local");
    return;
  }

  const valor = (amountCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  try {
    await resend.emails.send({
      from: FROM,
      to: [email],
      subject: "Pagamento confirmado — seu acesso está liberado",
      html: renderEmailLayout({
        heading: `Tudo certo, ${name}!`,
        paragraphs: [
          `Recebemos o pagamento da sua primeira mensalidade do pacote <strong>${packageName}</strong>, no valor de <strong>${valor}</strong>.`,
          "Sua matrícula está concluída e o acesso à plataforma já está liberado. É só entrar e começar a estudar:",
        ],
        action: { label: "Acessar a plataforma", href: accessUrl },
        footnote:
          "As próximas mensalidades serão cobradas automaticamente no mesmo cartão, sem que você precise fazer nada.",
      }),
    });
    console.log(`[Resend] Confirmação de primeiro pagamento enviada para ${email}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Resend] Erro ao enviar confirmação de pagamento:", errorMessage);
  }
}

export interface SendPackageChangedEmailParams {
  email: string;
  name: string;
  packageName: string;
  monthlyAmountCents: number;
  /** `true` quando ainda há checkout a refazer (cobrança pelo Mercado Pago). */
  needsPayment: boolean;
  actionUrl: string;
}

/**
 * Aviso de troca de plano, disparado por `paymentService.changeStudentPackage`.
 *
 * Não é cortesia: trocar o pacote CANCELA o contrato e a assinatura atuais e
 * emite um contrato novo, então o aluno perde o acesso até assinar de novo. Sem
 * este e-mail ele descobre isso sozinho, ao ser expulso para o onboarding sem
 * explicação — e o mais provável é que ache que o sistema quebrou.
 *
 * Best-effort, como as demais funções deste arquivo: a troca de pacote já foi
 * efetivada quando isto roda, e falhar aqui não pode desfazê-la nem estourar
 * um erro para o admin.
 */
export async function sendPackageChangedEmail({
  email,
  name,
  packageName,
  monthlyAmountCents,
  needsPayment,
  actionUrl,
}: SendPackageChangedEmailParams) {
  if (!resend) {
    console.warn("[Resend] RESEND_API_KEY não está configurada em .env.local");
    return;
  }

  const valor = (monthlyAmountCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const proximoPasso = needsPayment
    ? "Para voltar a estudar, você precisa <strong>assinar o novo contrato</strong> e cadastrar a forma de pagamento. É rápido:"
    : "Para voltar a estudar, você precisa <strong>assinar o novo contrato</strong>. É rápido:";

  try {
    await resend.emails.send({
      from: FROM,
      to: [email],
      subject: "Seu plano foi alterado — assine o novo contrato",
      html: renderEmailLayout({
        heading: `Olá, ${name}!`,
        paragraphs: [
          `A coordenação da <strong>English4You</strong> alterou o seu plano para <strong>${packageName}</strong>, com mensalidade de <strong>${valor}</strong>.`,
          "Como as condições da matrícula mudaram, foi emitido um contrato novo — o anterior foi encerrado.",
          proximoPasso,
        ],
        action: { label: "Assinar o novo contrato", href: actionUrl },
        footnote:
          "Enquanto o novo contrato não for assinado, o acesso às aulas fica pausado. Em caso de dúvida, fale com a secretaria da escola.",
      }),
    });
    console.log(`[Resend] Aviso de troca de plano enviado para ${email}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Resend] Erro ao enviar aviso de troca de plano:", errorMessage);
  }
}

export interface SendScholarshipChangedEmailParams {
  email: string;
  name: string;
  /** 0 = bolsa removida, 100 = integral. */
  scholarshipPercent: number;
  monthlyAmountCents: number;
  /** `true` quando ainda há checkout a refazer (cobrança pelo Mercado Pago). */
  needsPayment: boolean;
  actionUrl: string;
}

/**
 * Aviso de mudança na bolsa, disparado por `paymentService.setScholarshipTerms`.
 *
 * Mesmo motivo do aviso de troca de plano: alterar a bolsa cancela contrato e
 * assinatura e emite um contrato novo, então o aluno perde o acesso até
 * reassinar. Só que aqui o assunto é mais delicado — pode ser a concessão de um
 * benefício ou a retirada dele —, e por isso o texto muda conforme o caso em
 * vez de ser um aviso genérico.
 *
 * Best-effort: a mudança já foi efetivada quando isto roda.
 */
export async function sendScholarshipChangedEmail({
  email,
  name,
  scholarshipPercent,
  monthlyAmountCents,
  needsPayment,
  actionUrl,
}: SendScholarshipChangedEmailParams) {
  if (!resend) {
    console.warn("[Resend] RESEND_API_KEY não está configurada em .env.local");
    return;
  }

  const valor = (monthlyAmountCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const subject =
    scholarshipPercent === 0
      ? "Sua bolsa de estudos foi encerrada — assine o novo contrato"
      : "Sua bolsa de estudos foi atualizada — assine o novo contrato";

  const anuncio =
    scholarshipPercent === 100
      ? "Você passou a ter <strong>bolsa integral</strong> na English4You: não haverá mensalidade a pagar."
      : scholarshipPercent > 0
        ? `Sua bolsa de estudos na English4You passou a ser de <strong>${scholarshipPercent}%</strong>, e sua mensalidade fica em <strong>${valor}</strong>.`
        : `Sua bolsa de estudos na English4You foi encerrada, e sua mensalidade passa a ser de <strong>${valor}</strong>.`;

  const proximoPasso = needsPayment
    ? "Para voltar a estudar, você precisa <strong>assinar o novo contrato</strong> e cadastrar a forma de pagamento:"
    : "Para voltar a estudar, você precisa <strong>assinar o novo contrato</strong>:";

  try {
    await resend.emails.send({
      from: FROM,
      to: [email],
      subject,
      html: renderEmailLayout({
        heading: `Olá, ${name}!`,
        paragraphs: [
          anuncio,
          "Como as condições da matrícula mudaram, foi emitido um contrato novo — o anterior foi encerrado.",
          proximoPasso,
        ],
        action: { label: "Assinar o novo contrato", href: actionUrl },
        footnote:
          "Enquanto o novo contrato não for assinado, o acesso às aulas fica pausado. Em caso de dúvida, fale com a secretaria da escola.",
      }),
    });
    console.log(`[Resend] Aviso de mudança de bolsa enviado para ${email}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Resend] Erro ao enviar aviso de mudança de bolsa:", errorMessage);
  }
}

export interface SendClassRecordingEmailParams {
  email: string;
  studentName: string;
  className: string;
  lessonTitle: string;
  recordingUrl: string;
  /** Data em que o Stream apaga a gravação — ver RECORDING_RETENTION_DAYS. */
  availableUntil: Date;
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
  availableUntil,
}: SendClassRecordingEmailParams) {
  if (!resend) {
    console.warn("[Resend] RESEND_API_KEY não está configurada em .env.local");
    return;
  }

  const prazo = availableUntil.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

  try {
    // O SDK não lança em erro de API (rate limit, endereço inválido etc.) —
    // devolve `{ data, error }`. Sem checar `error` aqui, um 429 do Resend
    // loga "enviado com sucesso" mesmo tendo falhado (foi assim que o envio
    // pra um aluno se perdeu silenciosamente no backfill de gravações).
    const { error } = await resend.emails.send({
      from: FROM,
      to: [email],
      subject: `Gravação disponível: ${lessonTitle}`,
      html: renderEmailLayout({
        heading: `Olá, ${studentName}!`,
        paragraphs: [
          `A gravação da aula <strong>${lessonTitle}</strong> da turma <strong>${className}</strong> já está disponível para você reassistir.`,
          `<strong>Atenção ao prazo:</strong> esta gravação fica disponível até <strong>${prazo}</strong>. Depois dessa data ela é apagada e não há como recuperá-la.`,
        ],
        action: { label: "Assistir gravação", href: recordingUrl },
      }),
    });
    if (error) throw new Error(error.message);
    console.log(`[Resend] E-mail de gravação disponível enviado para ${email}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Resend] Erro ao enviar e-mail de gravação:", errorMessage);
  }
}
