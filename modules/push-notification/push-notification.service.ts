import { pushNotificationRepository } from './push-notification.repository';
import { pickReminderCopy, type ReminderSlot } from './push-notification.copy';
import { sendPushNotification } from '@/lib/web-push';
import { AppError } from '@/lib/errors';
import { Role } from '@/modules/user/user.types';
import { SubscribePushInput } from './push-notification.types';

/**
 * Service do módulo de push. Cobre a inscrição do dispositivo (feita pelo
 * próprio aluno, via Server Action com sessão) e o disparo em massa dos
 * lembretes (feito pela rota de cron, sem sessão nenhuma).
 *
 * Deliberadamente NÃO cria linha em `modules/notification` (o sino in-app):
 * um lembrete de estudo é um cutucão de DISPOSITIVO — se também virasse item
 * de inbox, o sino acumularia lembretes que o aluno já dispensou na tela de
 * bloqueio, sem ganho nenhum.
 */
export const pushNotificationService = {
  async subscribe(userId: string, role: Role, sub: SubscribePushInput, userAgent?: string): Promise<void> {
    if (role !== 'STUDENT') {
      throw new AppError('Apenas alunos podem ativar lembretes de estudo.');
    }

    await pushNotificationRepository.upsertSubscription({
      userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      userAgent: userAgent?.slice(0, 255),
    });
  },

  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    await pushNotificationRepository.deleteByEndpointForUser(userId, endpoint);
  },

  /**
   * Dispara os lembretes de um horário pra todo aluno inscrito que ainda não
   * praticou hoje. Chamado SÓ pela rota `app/api/cron/push-reminders` — sem
   * RBAC de sessão porque não há sessão nenhuma nesse contexto (a rota já é
   * protegida por `CRON_SECRET`).
   *
   * Envio sequencial, não `Promise.all`: evita rajada no push service e
   * mantém memória previsível. Roda no máximo 3x/dia — não é hot path.
   */
  async sendDailyReminders(slot: ReminderSlot): Promise<{ sent: number; skipped: number; cleaned: number }> {
    const pending = await pushNotificationRepository.findStudentSubscriptionsPendingReminder();

    let sent = 0;
    const deadEndpoints: string[] = [];

    for (const subscription of pending) {
      const copy = pickReminderCopy(slot);
      const result = await sendPushNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        { title: copy.title, body: copy.body, link: '/student/practice' }
      );

      if (result.ok) {
        sent += 1;
      } else if (result.gone) {
        deadEndpoints.push(subscription.endpoint);
      }
    }

    if (deadEndpoints.length > 0) {
      await pushNotificationRepository.deleteExpiredSubscriptions(deadEndpoints);
    }

    return {
      sent,
      skipped: pending.length - sent - deadEndpoints.length,
      cleaned: deadEndpoints.length,
    };
  },
};
