import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  sendPasswordResetEmail 
} from "firebase/auth";
import { auth } from "./firebase-client";
import { loginAction, logoutAction } from "@/modules/user/user.actions";
import { User } from "@/modules/user/user.types";

export type AuthResult<T = unknown> = 
  | { success: true; data: T }
  | { success: false; error: string };

export const authClient = {
  /**
   * Realiza login no cliente via Firebase SDK e sincroniza a sessão via Server Action.
   *
   * A senha é conferida AQUI, pelo próprio Firebase — o servidor nunca a
   * recebe. Só o ID token resultante desse login vai pra Server Action, que
   * o verifica (`adminAuth.verifyIdToken`) antes de emitir a sessão. Por
   * isso, ao contrário de antes, uma falha do Firebase Auth INTERROMPE o
   * login aqui — não faz mais sentido seguir pro passo 2 sem um token válido
   * pra mandar.
   */
  async signIn(email: string, password: string, portal?: "STUDENT" | "STAFF"): Promise<AuthResult<{ user: User; redirectUrl: string }>> {
    try {
      let idToken: string;
      try {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        idToken = await credential.user.getIdToken();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn("[AuthClient] Firebase Auth signIn falhou:", message);
        return {
          success: false,
          error: "E-mail ou senha inválidos.",
        };
      }

      // Chamar a Server Action para verificar o token e criar o cookie HTTP-only da sessão
      const result = await loginAction({ idToken, portal });

      if (!result.success) {
        return {
          success: false,
          error: result.error || "Falha na autenticação. Verifique suas credenciais.",
        };
      }

      if (!result.data) {
        return {
          success: false,
          error: "Sessão não pôde ser iniciada.",
        };
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro inesperado ao realizar login.";
      return {
        success: false,
        error: message,
      };
    }
  },

  /**
   * Encerra a sessão do usuário tanto no Firebase SDK quanto no servidor (deleta cookie).
   */
  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn("[AuthClient] Error signing out of Firebase SDK:", err);
    }
    await logoutAction();
  },

  /**
   * Dispara o e-mail de redefinição de senha do Firebase Auth.
   */
  async sendPasswordReset(email: string): Promise<AuthResult<void>> {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true, data: undefined };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Não foi possível enviar o e-mail de redefinição.";
      return {
        success: false,
        error: message,
      };
    }
  },
};
