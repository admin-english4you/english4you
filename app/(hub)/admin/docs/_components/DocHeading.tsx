import { CopyLinkButton } from "./CopyLinkButton";

interface DocHeadingProps {
  /** Âncora estável do subtópico. Não mude depois de publicada: links já
   *  enviados a alunos e clientes apontam para ela. */
  id: string;
  children: string;
}

/**
 * Subtópico da documentação, com link copiável.
 *
 * O `scroll-mt` compensa o header fixo: sem ele, chegar pela âncora deixaria o
 * título escondido atrás da barra do topo.
 */
export function DocHeading({ id, children }: DocHeadingProps) {
  return (
    <h3 id={id} className="group flex scroll-mt-24 items-center gap-1.5">
      {children}
      <CopyLinkButton anchorId={id} title={children} />
    </h3>
  );
}
