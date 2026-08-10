import { ref, set, onValue } from "firebase/database";
import { rtdb } from "./firebase-client";

/**
 * Canal ao vivo do board da sala de aula (Firebase RTDB) — puramente uma
 * transmissão efêmera do HTML mais recente, não a fonte de verdade. A
 * persistência real continua em `class_records.boardContent` (Postgres, via
 * `saveBoardContentAction`); se o RTDB não estiver configurado (`rtdb` nulo,
 * ver lib/firebase-client.ts) ou a escrita/leitura falhar, o board segue
 * funcionando normalmente, só sem o "ao vivo" — por isso tudo aqui é
 * melhor-esforço e nunca lança.
 *
 * Quem pode ler/escrever cada `recordId` é decidido pelas regras em
 * database.rules.json, contra a lista de membros que o servidor mantém em
 * `class-boards/{recordId}/members` (ver `syncBoardMembers` em
 * modules/class/class.service.ts) — o client nunca escreve esse nó.
 */
function contentPath(recordId: string) {
  return `class-boards/${recordId}/content`;
}

/** Publica o HTML atual do board no canal ao vivo desta aula. */
export function pushBoardContent(recordId: string, html: string): void {
  if (!rtdb) return;
  void set(ref(rtdb, contentPath(recordId)), html).catch(() => {});
}

/**
 * Assina o board ao vivo desta aula. Devolve uma função de limpeza sempre
 * segura de chamar (inclusive quando o RTDB não está configurado).
 */
export function subscribeToBoardContent(recordId: string, onChange: (html: string) => void): () => void {
  if (!rtdb) return () => {};

  try {
    return onValue(ref(rtdb, contentPath(recordId)), (snapshot) => {
      const value = snapshot.val();
      if (typeof value === "string") onChange(value);
    });
  } catch {
    return () => {};
  }
}
