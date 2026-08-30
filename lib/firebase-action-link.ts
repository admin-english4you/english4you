/**
 * Reescreve o link de ação do Firebase para a NOSSA página de definir senha.
 *
 * O `generatePasswordResetLink` do Admin SDK devolve uma URL hospedada pelo
 * Firebase (`.../__/auth/action?mode=resetPassword&oobCode=...`). Aquela página
 * é genérica, em inglês, sem a marca da escola e — o que mais dói na prática —
 * quando o link expira ela mostra um erro seco, sem oferecer um novo link. O
 * aluno trava ali e liga para a secretaria.
 *
 * O que importa naquele link é o `oobCode`: é ele a credencial de uso único que
 * o Firebase valida. A página em volta é só interface, e pode ser a nossa.
 *
 * Fazemos por reescrita, e não configurando a "action URL" no console do
 * Firebase, porque assim nada depende de um ajuste manual no painel — e a
 * mudança vale só para os fluxos que escolhermos, sem afetar os outros
 * e-mails do projeto.
 */
export function toAppPasswordSetupLink(firebaseLink: string, appUrl: string): string {
  try {
    const oobCode = new URL(firebaseLink).searchParams.get("oobCode");
    // Sem `oobCode` não há o que reescrever: devolver o link original é melhor
    // do que mandar o aluno para uma página que não vai conseguir fazer nada.
    if (!oobCode) return firebaseLink;

    return `${appUrl.replace(/\/+$/, "")}/definir-senha?oobCode=${encodeURIComponent(oobCode)}`;
  } catch {
    return firebaseLink;
  }
}
