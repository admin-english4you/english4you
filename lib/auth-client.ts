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
   */
  async signIn(email: string, password: string): Promise<AuthResult<{ user: User; redirectUrl: string }>> {
    try {
      // 1. Tentar autenticar no Firebase Client SDK se configurado
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err: unknown) {
        // Se as credenciais no Firebase falharem ou o Firebase Auth ainda não estiver ativado no Console
        const message = err instanceof Error ? err.message : String(err);
        console.warn("[AuthClient] Firebase Auth client signIn fallback:", message);
      }

      // 2. Chamar a Server Action para criar o cookie HTTP-only da sessão e buscar usuário no Neon DB
      const result = await loginAction({ email, password });

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
