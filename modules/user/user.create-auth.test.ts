import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Criação de usuário e a conta de acesso no Firebase.
 *
 * O modelo depende de `uid` do Firebase === `id` do Neon. Gravar a linha do
 * banco quando o acesso não foi criado produz uma conta que autentica e não é
 * encontrada — "credenciais inválidas" para sempre, sem sinal no painel.
 * Aconteceu em produção; estes testes existem para não acontecer de novo.
 */

const createUser = vi.fn();
const generatePasswordResetLink = vi.fn();
const repoCreateUser = vi.fn();

vi.mock('@/lib/firebase-admin', () => ({
  adminAuth: {
    createUser: (...a: unknown[]) => createUser(...a),
    generatePasswordResetLink: (...a: unknown[]) => generatePasswordResetLink(...a),
  },
  adminDb: null,
}));
vi.mock('./user.repository', () => ({
  userRepository: {
    createUser: (...a: unknown[]) => repoCreateUser(...a),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    updateUser: vi.fn(),
  },
}));
vi.mock('@/lib/resend', () => ({
  sendUserInviteEmail: vi.fn(),
  sendPasswordResetRequestEmail: vi.fn(),
  sendAccountDeactivatedEmail: vi.fn(),
}));
vi.mock('@/lib/storage-upload', () => ({
  uploadBufferToStorage: vi.fn(),
  deleteStorageFileByUrl: vi.fn(),
}));

const { userService } = await import('./user.service');

const DADOS = { name: 'Aluno', email: 'aluno@teste.invalid', role: 'STUDENT' as const };

beforeEach(() => {
  vi.clearAllMocks();
  createUser.mockResolvedValue({ uid: 'x' });
  generatePasswordResetLink.mockResolvedValue('https://reset');
  repoCreateUser.mockImplementation(async (d: Record<string, unknown>) => d);
});

describe('createUserByAdmin', () => {
  it('grava no banco com o MESMO id usado no Firebase', async () => {
    await userService.createUserByAdmin('ADMIN', DADOS, { skipInvite: true });

    const uidFirebase = createUser.mock.calls[0][0].uid;
    const idNeon = repoCreateUser.mock.calls[0][0].id;
    expect(idNeon).toBe(uidFirebase);
  });

  /** O caso exato que quebrou em produção. */
  it('NÃO cria o usuário no banco quando o e-mail já existe no Firebase', async () => {
    createUser.mockRejectedValue(
      Object.assign(new Error('já existe'), { code: 'auth/email-already-exists' })
    );

    await expect(
      userService.createUserByAdmin('ADMIN', DADOS, { skipInvite: true })
    ).rejects.toThrow(/Já existe uma conta de acesso/i);

    expect(repoCreateUser).not.toHaveBeenCalled();
  });

  it('NÃO cria o usuário no banco quando o Firebase falha por outro motivo', async () => {
    createUser.mockRejectedValue(new Error('rede fora'));

    await expect(
      userService.createUserByAdmin('ADMIN', DADOS, { skipInvite: true })
    ).rejects.toThrow(/Não foi possível criar o acesso/i);

    expect(repoCreateUser).not.toHaveBeenCalled();
  });

  /** A conta já existe; sem o link o usuário ainda entra por "esqueci minha senha". */
  it('falha ao gerar o link não impede o cadastro', async () => {
    generatePasswordResetLink.mockRejectedValue(new Error('indisponível'));

    await expect(
      userService.createUserByAdmin('ADMIN', DADOS, { skipInvite: true })
    ).resolves.toBeTruthy();

    expect(repoCreateUser).toHaveBeenCalled();
  });

  it('só admin cadastra', async () => {
    await expect(userService.createUserByAdmin('TEACHER', DADOS)).rejects.toThrow();
    expect(createUser).not.toHaveBeenCalled();
  });
});
