import { userService } from '@/modules/user/user.service';
import { classService } from '@/modules/class/class.service';
import { contractService } from '@/modules/contract/contract.service';
import { paymentService } from '@/modules/payment/payment.service';
import { financeOverviewService } from '@/modules/finance/finance.overview.service';
import { AppError } from '@/lib/errors';
import { formatRelativeTime } from '@/lib/date';
import type { Role } from '@/modules/user/user.types';
import type { ActivityItem, AdminDashboard } from './dashboard.types';

/**
 * Monta a tela inicial de /admin.
 *
 * Módulo de LEITURA, sem schema nem repository próprios: um dashboard não é um
 * domínio, é uma vista sobre os outros. Por isso tudo aqui entra via Service —
 * `userService`, `classService`, `contractService`, `paymentService` e
 * `financeOverviewService` — e nada escreve.
 *
 * Ninguém importa este módulo de volta (só a página /admin o consome), então
 * ele pode depender de todos sem fechar ciclo.
 */

/** Quantos itens de cada origem são considerados antes do merge do feed. */
const ACTIVITY_SOURCE_LIMIT = 8;
/** Quantos sobrevivem à ordenação por data e aparecem na tela. */
const ACTIVITY_LIMIT = 6;

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'administrador',
  TEACHER: 'professor',
  STUDENT: 'aluno',
};

function assertAdmin(actingRole: Role) {
  if (actingRole !== 'ADMIN') {
    throw new AppError('Apenas administradores podem ver o painel.');
  }
}

export const dashboardService = {
  async getAdminDashboard(actingRole: Role): Promise<AdminDashboard> {
    assertAdmin(actingRole);

    const [
      monthTotals,
      usersByRole,
      classesByStatus,
      contractsByStatus,
      recentUsers,
      recentContracts,
      recentPayments,
      recentClasses,
    ] = await Promise.all([
      financeOverviewService.getMonthTotals(actingRole),
      userService.countActiveByRole(),
      classService.countByStatus(actingRole),
      contractService.countByStatus(actingRole),
      userService.getRecentUsers(ACTIVITY_SOURCE_LIMIT),
      contractService.getRecentSignedContracts(actingRole, ACTIVITY_SOURCE_LIMIT),
      paymentService.getRecentPayments(actingRole, ACTIVITY_SOURCE_LIMIT),
      classService.getRecentClassGroups(actingRole, ACTIVITY_SOURCE_LIMIT),
    ]);

    // Contratos e cobranças guardam só o `userId`; os nomes vêm daqui, numa
    // consulta só para as duas listas.
    const referencedUserIds = Array.from(
      new Set([...recentContracts.map((c) => c.userId), ...recentPayments.map((p) => p.userId)])
    );
    const referencedUsers = await userService.getUsersByIds(referencedUserIds);
    const nameById = new Map(referencedUsers.map((user) => [user.id, user.name]));

    const now = new Date();
    const activities: (ActivityItem & { at: Date })[] = [];

    for (const user of recentUsers) {
      activities.push({
        id: `user-${user.id}`,
        kind: 'ENROLLMENT',
        text: `Novo ${ROLE_LABELS[user.role]} cadastrado: ${user.name}`,
        at: user.createdAt,
        relative: formatRelativeTime(user.createdAt, now),
        href: '/admin/users',
      });
    }

    for (const contract of recentContracts) {
      // `findRecentSignedContracts` já filtra por `signedAt` não-nulo; o
      // fallback existe só para o TypeScript, que não sabe disso.
      const at = contract.signedAt ?? contract.createdAt;
      activities.push({
        id: `contract-${contract.id}`,
        kind: 'CONTRACT',
        text: `Contrato assinado por ${nameById.get(contract.userId) ?? 'usuário removido'}`,
        at,
        relative: formatRelativeTime(at, now),
        href: `/admin/finance/contracts/${contract.id}`,
      });
    }

    // Só cobranças efetivamente pagas viram atividade: uma cobrança agendada
    // ou recusada não é um acontecimento que o admin precise comemorar no feed
    // (a recusada aparece como inadimplência na tela do financeiro).
    for (const payment of recentPayments) {
      if (payment.status !== 'PAID' || !payment.paidAt) continue;
      activities.push({
        id: `payment-${payment.id}`,
        kind: 'PAYMENT',
        text: `Pagamento confirmado de ${nameById.get(payment.userId) ?? 'usuário removido'}`,
        at: payment.paidAt,
        relative: formatRelativeTime(payment.paidAt, now),
        href: '/admin/finance',
      });
    }

    for (const classGroup of recentClasses) {
      activities.push({
        id: `class-${classGroup.id}`,
        kind: 'CLASS',
        text: `Nova turma criada: ${classGroup.name}`,
        at: classGroup.createdAt,
        relative: formatRelativeTime(classGroup.createdAt, now),
        href: `/admin/classes/${classGroup.id}`,
      });
    }

    const sorted: ActivityItem[] = activities
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, ACTIVITY_LIMIT)
      // `at` era só para ordenar — o cliente recebe a string já formatada.
      .map((item) => ({
        id: item.id,
        kind: item.kind,
        text: item.text,
        relative: item.relative,
        href: item.href,
      }));

    return {
      stats: {
        monthIncomeCents: monthTotals.incomeCents,
        monthNetCents: monthTotals.netCents,
        activeStudents: usersByRole.STUDENT,
        activeTeachers: usersByRole.TEACHER,
        activeClasses: classesByStatus.ACTIVE,
        pendingContracts: contractsByStatus.PENDING_SIGNATURE,
      },
      activities: sorted,
      monthLabel: monthTotals.monthLabel,
    };
  },
};
