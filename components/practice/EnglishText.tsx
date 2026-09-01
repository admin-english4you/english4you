/**
 * Texto em INGLÊS dentro de uma interface em português.
 *
 * Existe por um bug real (31/08/2026): com a interface toda em português e o
 * `<html>` declarado como `lang="en"`, o Chrome no Android traduzia a página
 * inteira pro português — inclusive o conteúdo das atividades. O aluno via
 * "um professor" no lugar de "a teacher" e "Eles são estudantes" no lugar de
 * "They are students", o que destrói o exercício (ele existe justamente para
 * ensinar a forma em inglês).
 *
 * A causa raiz foi corrigida no `app/layout.tsx` (`lang="pt-BR"`), mas isso
 * sozinho não basta: o usuário ainda pode pedir a tradução manualmente, e
 * qualquer tradutor respeita `translate="no"`. Marcar o conteúdo de estudo é
 * a proteção que sobrevive a isso.
 *
 * `lang="en"` no mesmo elemento não é decorativo: leitores de tela usam essa
 * marcação para trocar a pronúncia para o inglês, em vez de ler as palavras
 * com fonética portuguesa.
 */
interface EnglishTextProps {
  children: React.ReactNode;
  className?: string;
  /** Elemento renderizado. Padrão `span` — use `p`/`div` quando for bloco. */
  as?: "span" | "p" | "div";
}

export function EnglishText({ children, className, as: Tag = "span" }: EnglishTextProps) {
  return (
    <Tag lang="en" translate="no" className={className}>
      {children}
    </Tag>
  );
}
