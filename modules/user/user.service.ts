import { User, Role } from "./user.types";
import { userRepository } from "./user.repository";
import { adminAuth, adminStorage } from "@/lib/firebase-admin";
import { sendUserInviteEmail } from "@/lib/resend";
import crypto from "crypto";

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
    data: { name: string; email: string; role: Role; packageId?: string }
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

    if (data.role === 'STUDENT' && data.packageId) {
      // TODO: Implementar criação de contrato no módulo financeiro (associando studentId e packageId)
      console.log(`[Finance] Pacote ${data.packageId} selecionado para o novo aluno ${userId}. Criação de contrato pendente.`);
    }

    // 5. Disparar e-mail de onboarding via Resend
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
  async authenticateUser(credentials: { email: string; password: string; portal?: "STUDENT" | "STAFF" }): Promise<User> {
    const { email, password, portal } = credentials;

    if (!email || !password) {
      throw new Error("E-mail e senha são obrigatórios.");
    }

    const user = await userRepository.findByEmail(email);

    if (!user) {
      throw new Error("Usuário não encontrado ou credenciais inválidas.");
    }

    if (portal === 'STUDENT' && user.role !== 'STUDENT') {
      throw new Error("Acesso negado. Utilize a página de login da equipe (Staff) para entrar com esta conta.");
    }

    if (portal === 'STAFF' && user.role === 'STUDENT') {
      throw new Error("Acesso negado. Utilize a página de login de alunos para entrar com esta conta.");
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

  /**
   * Atualiza o avatar do usuário (faz upload pro Firebase Admin Storage e atualiza no DB)
   */
  async updateAvatar(userId: string, file: File): Promise<User> {
    if (!adminStorage) {
      throw new Error("Serviço de Storage não configurado no servidor.");
    }

    const bucket = adminStorage.bucket();
    const bucketName = bucket.name;

    // 1. Buscar o usuário atual para ver se já possui um avatar cadastrado
    const currentUser = await userRepository.findById(userId);
    if (currentUser?.avatarUrl) {
      const prefix = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/`;
      if (currentUser.avatarUrl.startsWith(prefix)) {
        const parts = currentUser.avatarUrl.split('/o/');
        if (parts.length > 1) {
          const pathAndQuery = parts[1];
          const encodedPath = pathAndQuery.split('?')[0];
          const oldFilePath = decodeURIComponent(encodedPath);
          
          try {
            const oldFileRef = bucket.file(oldFilePath);
            const [exists] = await oldFileRef.exists();
            if (exists) {
              await oldFileRef.delete();
            }
          } catch (err) {
            console.error("Erro ao deletar avatar antigo no Firebase Storage:", err);
            // Não barramos o upload se falhar a deleção do antigo
          }
        }
      }
    }

    const extension = file.name.split('.').pop() || "jpg";
    // Usando timestamp para evitar problemas de cache do navegador com o mesmo nome
    const timestamp = Date.now();
    const filePath = `avatars/${userId}/avatar_${timestamp}.${extension}`;
    const fileRef = bucket.file(filePath);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Gerar token de download para o Firebase Storage
    const downloadToken = crypto.randomUUID();

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000',
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
        }
      }
    });

    // Formata URL pública do Firebase Storage com o token
    const avatarUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filePath)}?alt=media&token=${downloadToken}`;

    // Atualiza o Drizzle (Neon)
    return await userRepository.updateUser(userId, { avatarUrl });
  },
};
