import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Apagar conta permanentemente (Neon + Firebase Auth) — o oposto de
 * `createUserByAdmin`, e de propósito na ordem INVERSA: lá, o acesso é criado
 * primeiro (falhar depois deixa uma conta fantasma que autentica e não é
 * encontrada). Aqui, o banco é apagado primeiro — se falhar (ex: FK de
 * professor titular de turma), nada mudou, seguro pra tentar de novo. Um erro
 * nesta função tem custo real: apagar em produção não tem undo.
 */

const findById = vi.fn();
const repoDeleteUser = vi.fn();
const deleteStorageFileByUrl = vi.fn();
const firebaseDeleteUser = vi.fn();

vi.mock('@/lib/firebase-admin', () => ({
  adminAuth: {
    deleteUser: (...a: unknown[]) => firebaseDeleteUser(...a),
  },
  adminDb: null,
}));
vi.mock('./user.repository', () => ({
  userRepository: {
    findById: (...a: unknown[]) => findById(...a),
    deleteUser: (...a: unknown[]) => repoDeleteUser(...a),
  },
}));
vi.mock('@/lib/resend', () => ({
  sendUserInviteEmail: vi.fn(),
  sendPasswordResetRequestEmail: vi.fn(),
  sendAccountDeactivatedEmail: vi.fn(),
}));
vi.mock('@/lib/storage-upload', () => ({
  uploadBufferToStorage: vi.fn(),
  deleteStorageFileByUrl: (...a: unknown[]) => deleteStorageFileByUrl(...a),
}));

const { userService } = await import('./user.service');

const USUARIO = { id: 'u1', name: 'Aluna Teste', email: 'aluna@teste.invalid', avatarUrl: null };

beforeEach(() => {
  vi.clearAllMocks();
  findById.mockResolvedValue(USUARIO);
  repoDeleteUser.mockResolvedValue(undefined);
  firebaseDeleteUser.mockResolvedValue(undefined);
  deleteStorageFileByUrl.mockResolvedValue(undefined);
});

describe('deleteUserPermanently — RBAC e existência', () => {
  it('recusa quem não é admin', async () => {
    await expect(userService.deleteUserPermanently('TEACHER', 'u1')).rejects.toThrow(/administrador/i);
    expect(repoDeleteUser).not.toHaveBeenCalled();
  });

  it('recusa se o usuário não existe', async () => {
    findById.mockResolvedValue(undefined);
    await expect(userService.deleteUserPermanently('ADMIN', 'inexistente')).rejects.toThrow(/não encontrado/i);
    expect(repoDeleteUser).not.toHaveBeenCalled();
  });
});

describe('deleteUserPermanently — ordem: banco primeiro, Firebase depois', () => {
  it('apaga o banco ANTES do Firebase', async () => {
    await userService.deleteUserPermanently('ADMIN', 'u1');

    expect(repoDeleteUser).toHaveBeenCalledWith('u1');
    expect(firebaseDeleteUser).toHaveBeenCalledWith('u1');
    const dbOrder = repoDeleteUser.mock.invocationCallOrder[0];
    const fbOrder = firebaseDeleteUser.mock.invocationCallOrder[0];
    expect(dbOrder).toBeLessThan(fbOrder);
  });

  it('erro de FK (23503) no banco vira mensagem clara, e o Firebase NUNCA é chamado', async () => {
    // Caso real: professor ainda titular de turma (class_groups.teacherId
    // não tem cascade, de propósito). Sem tradução, o admin veria o código
    // cru do Postgres em vez de saber o que fazer.
    repoDeleteUser.mockRejectedValue(Object.assign(new Error('fk violation'), { code: '23503' }));

    await expect(userService.deleteUserPermanently('ADMIN', 'u1')).rejects.toThrow(/referenciada/i);
    expect(firebaseDeleteUser).not.toHaveBeenCalled();
  });

  it('outros erros do banco (não FK) propagam sem virar mensagem genérica', async () => {
    repoDeleteUser.mockRejectedValue(new Error('conexão caiu'));
    await expect(userService.deleteUserPermanently('ADMIN', 'u1')).rejects.toThrow('conexão caiu');
    expect(firebaseDeleteUser).not.toHaveBeenCalled();
  });
});

describe('deleteUserPermanently — Firebase', () => {
  it('tolera usuário já inexistente no Firebase (auth/user-not-found) — objetivo já cumprido', async () => {
    firebaseDeleteUser.mockRejectedValue(Object.assign(new Error('not found'), { code: 'auth/user-not-found' }));

    await expect(userService.deleteUserPermanently('ADMIN', 'u1')).resolves.toBeUndefined();
    // O banco já foi apagado — não desfaz por causa disso.
    expect(repoDeleteUser).toHaveBeenCalled();
  });

  it('outro erro do Firebase avisa que o banco já foi apagado mas o acesso pode ter sobrado', async () => {
    firebaseDeleteUser.mockRejectedValue(Object.assign(new Error('rede caiu'), { code: 'internal' }));

    await expect(userService.deleteUserPermanently('ADMIN', 'u1')).rejects.toThrow(/apagada do banco/i);
    // Já era tarde pra desfazer o delete do banco — só reporta o estado.
    expect(repoDeleteUser).toHaveBeenCalled();
  });
});

describe('deleteUserPermanently — avatar', () => {
  it('apaga o avatar do Storage antes de apagar a conta, quando existe', async () => {
    findById.mockResolvedValue({ ...USUARIO, avatarUrl: 'https://storage.test/avatar.png' });

    await userService.deleteUserPermanently('ADMIN', 'u1');

    expect(deleteStorageFileByUrl).toHaveBeenCalledWith('https://storage.test/avatar.png');
  });

  it('falha ao apagar o avatar não impede o resto — best-effort', async () => {
    findById.mockResolvedValue({ ...USUARIO, avatarUrl: 'https://storage.test/avatar.png' });
    deleteStorageFileByUrl.mockRejectedValue(new Error('storage fora do ar'));

    await expect(userService.deleteUserPermanently('ADMIN', 'u1')).resolves.toBeUndefined();
    expect(repoDeleteUser).toHaveBeenCalled();
  });

  it('sem avatar, não chama o Storage', async () => {
    await userService.deleteUserPermanently('ADMIN', 'u1');
    expect(deleteStorageFileByUrl).not.toHaveBeenCalled();
  });
});
