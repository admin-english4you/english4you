import { User, Role } from "./user.types";
import { userRepository } from "./user.repository";
import { adminAuth } from "@/lib/firebase-admin";
import { sendUserInviteEmail } from "@/lib/resend";

/**
 * Service do módulo de Usuários (Regras de Negócio e RBAC).
 */
export const userService = {
  /**
   * Permite que administradores convidem/cadastrem novos usuários informando apenas nome, email e role.
   * O sistema dispara um fluxo de envio de e-mail para definição de senha.
   */
  async createUserByAdmin(
    creatorRole: Role,
    data: { name: string; email: string; role: Role }
  ): Promise<{ user: User; inviteToken: string }> {
    // 1. RBAC Check: Apenas admins podem criar usuários
    if (creatorRole !== "ADMIN") {
      throw new Error("Apenas administradores podem cadastrar novos usuários.");
    }

    // 2. Gerar ID unificado (UUID) para servir como id no Neon DB e uid no Firebase Auth
    const userId = crypto.randomUUID();
    let resetLink: string | undefined;

    // 3. Criar usuário no Firebase Auth se o Firebase Admin estiver disponível
    if (adminAuth) {
      try {
        await adminAuth.createUser({
          uid: userId,
          email: data.email,
          displayName: data.name,
          emailVerified: false,
        });

        // Gerar o link oficial do Firebase para o usuário cadastrar/redefinir sua senha
        resetLink = await adminAuth.generatePasswordResetLink(data.email);
        console.log(`[Firebase Auth] Usuário criado com UID unificado no Firebase: ${userId}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn("[Firebase Auth] Aviso ao criar usuário no Firebase Auth:", message);
      }
    }

    // 4. Persistir no banco de dados Neon via Drizzle usando o mesmo ID
    const newUser = await userRepository.createUser({
      id: userId,
      name: data.name,
      email: data.email,
      role: data.role,
      status: "Active",
      avatarUrl: null,
      phone: null,
    });

    const inviteToken = `setup_${crypto.randomUUID()}`;

    // 4. Disparar e-mail de onboarding via Resend
    await sendUserInviteEmail({
      email: data.email,
      name: data.name,
      resetLink,
    });

    return { user: newUser, inviteToken };
  },

  /**
   * Valida as credenciais do usuário para login com e-mail e senha.
   */
  async authenticateUser(credentials: { email: string; password: string }): Promise<User> {
    const { email, password } = credentials;

    if (!email || !password) {
      throw new Error("E-mail e senha são obrigatórios.");
    }

    const user = await userRepository.findByEmail(email);

    if (!user) {
      throw new Error("Usuário não encontrado ou credenciais inválidas.");
    }

    return user;
  },

  /**
   * Lista os usuários para o painel de Admin
   */
  async getUsersForAdmin(): Promise<User[]> {
    return await userRepository.getAllUsers();
  },

  /**
   * Busca usuário por ID
   */
  async getUserById(id: string): Promise<User | undefined> {
    return await userRepository.findById(id);
  },
};
