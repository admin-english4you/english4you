import { User, Role, SigningIdentityInput } from "./user.types";
import { userRepository } from "./user.repository";
import { adminAuth, adminStorage } from "@/lib/firebase-admin";
import { sendUserInviteEmail } from "@/lib/resend";
import { AppError } from "@/lib/errors";
import crypto from "crypto";

/**
 * Service do módulo de Usuários (Regras de Negócio e RBAC).
 *
 * Este módulo é deliberadamente uma FOLHA na árvore de dependências: ele não
 * importa nenhum outro service. Quem precisa compor "criar usuário + algo
 * mais" (ex: gerar o contrato do aluno) orquestra de fora — ver
 * `contractService.registerUserWithContract`.
 */
export const userService = {
  /**
   * Permite que administradores convidem/cadastrem novos usuários informando apenas nome, email e role.
   * O sistema dispara um fluxo de envio de e-mail para definição de senha.
   *
   * `skipInvite` adia o e-mail para quem precisa concluir outros passos antes
   * (o contrato do aluno): sem isso, uma falha posterior deixaria o aluno com
   * um convite para uma conta pela metade. Quem passa `skipInvite` fica
   * responsável por chamar `sendInviteForUser` no fim do fluxo.
   */
  async createUserByAdmin(
    creatorRole: Role,
    data: { name: string; email: string; role: Role },
    options?: { skipInvite?: boolean }
  ): Promise<{ user: User; inviteToken: string }> {
    // 1. RBAC Check: Apenas admins podem criar usuários
    if (creatorRole !== "ADMIN") {
      throw new AppError("Apenas administradores podem cadastrar novos usuários.");
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
      classGroupId: null,
    });

    const inviteToken = `setup_${crypto.randomUUID()}`;

    // 5. Disparar e-mail de onboarding via Resend (a menos que quem chamou
    //    ainda tenha passos pendentes — ver docblock).
    if (!options?.skipInvite) {
      await sendUserInviteEmail({
        email: data.email,
        name: data.name,
        resetLink,
      });
    }

    return { user: newUser, inviteToken };
  },

  /**
   * (Re)envia o e-mail de definição de senha. Idempotente — o link do Firebase
   * é gerado na hora, então chamar de novo simplesmente manda um link novo.
   * Usado ao final do cadastro com `skipInvite` e, futuramente, por um botão
   * "Reenviar convite" no painel do admin.
   */
  async sendInviteForUser(actingRole: Role, userId: string): Promise<void> {
    if (actingRole !== "ADMIN") {
      throw new AppError("Apenas administradores podem enviar convites.");
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError("Usuário não encontrado.");
    }

    let resetLink: string | undefined;
    if (adminAuth) {
      try {
        resetLink = await adminAuth.generatePasswordResetLink(user.email);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn("[Firebase Auth] Aviso ao gerar link de senha:", message);
      }
    }

    await sendUserInviteEmail({ email: user.email, name: user.name, resetLink });
  },

  /**
   * Grava os dados de identidade que o PRÓPRIO usuário preencheu antes de
   * assinar o contrato (CPF e endereço).
   *
   * Sem `actingRole`: o `userId` sempre vem de `getCurrentUser()` na action,
   * nunca do corpo da requisição — mesmo contrato de `updateAvatar`.
   */
  async updateSigningIdentity(userId: string, data: SigningIdentityInput): Promise<User> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError("Usuário não encontrado.");
    }

    return await userRepository.updateUser(userId, {
      document: data.document,
      addressStreet: data.addressStreet,
      addressNumber: data.addressNumber,
      addressComplement: data.addressComplement ?? null,
      addressDistrict: data.addressDistrict,
      addressCity: data.addressCity,
      addressState: data.addressState,
      addressZipCode: data.addressZipCode,
    });
  },

  /**
   * Valida a sessão de login: a senha já foi conferida pelo Firebase Auth no
   * CLIENTE (`signInWithEmailAndPassword`) — aqui só verificamos o ID token
   * resultante, que é o que prova que aquele login realmente aconteceu.
   *
   * `adminAuth.verifyIdToken` é uma verificação de assinatura offline (JWT do
   * Firebase), não uma nova tentativa de autenticação — não há como um token
   * inválido/expirado passar sem lançar. `decoded.uid` é o mesmo id usado como
   * `uid` no `adminAuth.createUser` (ver `createUserByAdmin`), então dá pra
   * buscar o usuário direto por ele, sem precisar do e-mail digitado.
   */
  async authenticateUser(credentials: { idToken: string; portal?: "STUDENT" | "STAFF" }): Promise<User> {
    const { idToken, portal } = credentials;

    if (!adminAuth) {
      throw new AppError("Autenticação indisponível no momento. Tente novamente mais tarde.");
    }

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch {
      throw new AppError("Sessão de autenticação inválida ou expirada. Faça login novamente.");
    }

    const user = await userRepository.findById(decoded.uid);

    if (!user) {
      throw new AppError("Usuário não encontrado ou credenciais inválidas.");
    }

    if (portal === 'STUDENT' && user.role !== 'STUDENT') {
      throw new AppError("Acesso negado. Utilize a página de login da equipe (Staff) para entrar com esta conta.");
    }

    if (portal === 'STAFF' && user.role === 'STUDENT') {
      throw new AppError("Acesso negado. Utilize a página de login de alunos para entrar com esta conta.");
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
   * Lê o aluno FRESCO do banco — ponto de entrada de toda leitura da área do aluno.
   *
   * `getCurrentUser()` devolve um snapshot do cookie escrito no login, então
   * `classGroupId` e `role` de lá podem estar obsoletos (um aluno transferido
   * de turma hoje de manhã ainda leria a turma de ontem). Nenhum método
   * student-scoped deve confiar na sessão para descobrir a turma.
   */
  async getStudentById(userId: string): Promise<User> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError("Usuário não encontrado.");
    }
    if (user.role !== "STUDENT") {
      throw new AppError("Esta área é exclusiva de alunos.");
    }
    return user;
  },

  /**
   * Colegas de turma do aluno, apenas com os campos exibíveis.
   *
   * Deliberadamente NÃO reusa `getStudentsByClassGroupId`: aquele é admin-only
   * e devolve o `User` inteiro, incluindo e-mail e telefone dos colegas.
   */
  async getClassmatesForStudent(
    studentUserId: string
  ): Promise<Pick<User, "id" | "name" | "avatarUrl">[]> {
    const student = await userRepository.findById(studentUserId);
    if (!student?.classGroupId) return [];

    const classmates = await userRepository.findStudentsByClassGroupId(student.classGroupId);
    return classmates.map(({ id, name, avatarUrl }) => ({ id, name, avatarUrl }));
  },

  /**
   * Lê o professor FRESCO do banco — mesmo contrato de `getStudentById`, ponto
   * de entrada de toda leitura da área do professor.
   */
  async getTeacherById(userId: string): Promise<User> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError("Usuário não encontrado.");
    }
    if (user.role !== "TEACHER") {
      throw new AppError("Esta área é exclusiva de professores.");
    }
    return user;
  },

  /**
   * Alunos de uma turma, só com os campos exibíveis para o professor (sem
   * e-mail/telefone — aquilo só sai via getTeacherClassStudentDetail, sob
   * demanda, depois de validar posse). A posse da turma é validada por quem
   * chama (classService), não aqui.
   */
  async getStudentsByClassGroupIdForTeacher(
    classGroupId: string
  ): Promise<Pick<User, "id" | "name" | "avatarUrl">[]> {
    const students = await userRepository.findStudentsByClassGroupId(classGroupId);
    return students.map(({ id, name, avatarUrl }) => ({ id, name, avatarUrl }));
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
            //TODO: Talvez falhar o upload se não conseguir deletar o antigo seja mais seguro, mas isso depende do caso de uso.
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

  /**
   * Lista de professores para seletores (ex: atribuir professor de uma turma).
   */
  async getTeachersForSelect(actingRole: Role): Promise<User[]> {
    if (actingRole !== "ADMIN") {
      throw new AppError("Apenas administradores podem visualizar a lista de professores.");
    }
    return await userRepository.findTeachers();
  },

  /**
   * Alunos disponíveis para entrar em uma turma: sem turma atual, ou já
   * pertencentes a esta mesma turma (útil pra reabrir o modal de adicionar).
   */
  async getAvailableStudentsForClass(actingRole: Role, classGroupId?: string): Promise<User[]> {
    if (actingRole !== "ADMIN") {
      throw new AppError("Apenas administradores podem visualizar alunos disponíveis.");
    }
    return await userRepository.findAvailableStudents(classGroupId);
  },

  /**
   * Alunos atualmente matriculados em uma turma.
   */
  async getStudentsByClassGroupId(actingRole: Role, classGroupId: string): Promise<User[]> {
    if (actingRole !== "ADMIN") {
      throw new AppError("Apenas administradores podem visualizar os alunos da turma.");
    }
    return await userRepository.findStudentsByClassGroupId(classGroupId);
  },

  async countStudentsInClassGroup(actingRole: Role, classGroupId: string): Promise<number> {
    if (actingRole !== "ADMIN" && actingRole !== "TEACHER") {
      throw new AppError("Apenas administradores podem consultar a ocupação da turma.");
    }
    return await userRepository.countStudentsInClassGroup(classGroupId);
  },

  async countStudentsByClassGroupIds(actingRole: Role, classGroupIds: string[]): Promise<Record<string, number>> {
    if (actingRole !== "ADMIN" && actingRole !== "TEACHER") {
      throw new AppError("Apenas administradores podem consultar a ocupação das turmas.");
    }
    return await userRepository.countStudentsByClassGroupIds(classGroupIds);
  },

  /**
   * Busca usuários por lote de IDs (ex: resolver professores substitutos das aulas).
   */
  async getUsersByIds(ids: string[]): Promise<User[]> {
    return await userRepository.findByIds(ids);
  },

  /**
   * Vincula um aluno a uma turma (usado por adicionar-aluno e transferir-aluno).
   * A validação de capacidade/elegibilidade da turma é responsabilidade do classService.
   */
  async assignClassGroup(actingRole: Role, userId: string, classGroupId: string): Promise<User> {
    if (actingRole !== "ADMIN") {
      throw new AppError("Apenas administradores podem gerenciar a turma de um aluno.");
    }
    return await userRepository.setClassGroupId(userId, classGroupId);
  },

  /**
   * Desvincula um aluno de sua turma atual.
   */
  async clearClassGroup(actingRole: Role, userId: string): Promise<User> {
    if (actingRole !== "ADMIN") {
      throw new AppError("Apenas administradores podem gerenciar a turma de um aluno.");
    }
    return await userRepository.setClassGroupId(userId, null);
  },

  /**
   * Retorna (sem executar) a query de limpeza em lote de `classGroupId`, para ser
   * combinada em um `db.batch([...])` junto de outra escrita (ex: desativar turma).
   * Uso interno — quem chama já deve ter feito o RBAC check (ex: classService.deactivateClass).
   */
  bulkClearClassGroupQuery(userIds: string[]) {
    return userRepository.bulkClearClassGroupIdQuery(userIds);
  },
};
