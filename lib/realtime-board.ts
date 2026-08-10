import { ref, set, onValue } from "firebase/database";
import { signInWithCustomToken } from "firebase/auth";
import { auth, rtdb } from "./firebase-client";
import { getBoardAuthTokenAction } from "@/modules/class/class.actions";

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

/**
 * A sessão desta plataforma é um cookie próprio (ver lib/auth-server.ts), não
 * Firebase Auth — sem isto, `auth.currentUser` nunca existe no client, e as
 * regras (`auth != null`) barram toda leitura/escrita com permission_denied,
 * silenciosamente (best-effort, nunca lança). Troca a sessão atual por um
 * custom token (mesmo uid do usuário, ver `classService.getBoardAuthToken`)
 * uma única vez por carregamento de página — chamadas concorrentes
 * compartilham a mesma promise em vez de disparar o sign-in várias vezes.
 */
let boardAuthPromise: Promise<boolean> | null = null;

function ensureBoardAuth(recordId: string): Promise<boolean> {
  if (auth.currentUser) return Promise.resolve(true);

  if (!boardAuthPromise) {
    boardAuthPromise = getBoardAuthTokenAction({ recordId })
      .then((result) => {
        if (!result.success || !result.data?.token) return false;
        return signInWithCustomToken(auth, result.data.token)
          .then(() => true)
          .catch(() => false);
      })
      .catch(() => false)
      .then((ok) => {
        // Falhou (rede, RTDB não configurado, etc.) — não trava tentativas
        // futuras nesta mesma sessão de página.
        if (!ok) boardAuthPromise = null;
        return ok;
      });
  }

  return boardAuthPromise;
}

/** Publica o HTML atual do board no canal ao vivo desta aula. */
export function pushBoardContent(recordId: string, html: string): void {
  const db = rtdb;
  if (!db) {
    console.warn("[realtime-board] RTDB não configurado (NEXT_PUBLIC_FIREBASE_DATABASE_URL ausente) — board ao vivo desligado.");
    return;
  }
  void ensureBoardAuth(recordId).then((authenticated) => {
    if (!authenticated) return;
    void set(ref(db, contentPath(recordId)), html).catch((err) => {
      console.warn("[realtime-board] Falha ao publicar o board ao vivo (aluno não vai ver esta edição em tempo real):", err);
    });
  });
}

/**
 * Assina o board ao vivo desta aula. Devolve uma função de limpeza sempre
 * segura de chamar (inclusive quando o RTDB não está configurado ou a
 * autenticação ainda estiver em andamento no momento do cleanup).
 */
export function subscribeToBoardContent(recordId: string, onChange: (html: string) => void): () => void {
  const db = rtdb;
  if (!db) {
    console.warn("[realtime-board] RTDB não configurado (NEXT_PUBLIC_FIREBASE_DATABASE_URL ausente) — board ao vivo desligado.");
    return () => {};
  }

  let cancelled = false;
  let unsubscribe: (() => void) | null = null;

  void ensureBoardAuth(recordId).then((authenticated) => {
    if (cancelled || !authenticated) return;
    try {
      unsubscribe = onValue(
        ref(db, contentPath(recordId)),
        (snapshot) => {
          const value = snapshot.val();
          if (typeof value === "string") onChange(value);
        },
        (err) => {
          console.warn("[realtime-board] Falha ao assinar o board ao vivo (não vai atualizar em tempo real):", err);
        }
      );
    } catch (err) {
      console.warn("[realtime-board] Falha ao assinar o board ao vivo:", err);
    }
  });

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}
