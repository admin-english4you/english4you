import { notificationRepository } from './notification.repository';
import { CreateNotificationInput, Notification } from './notification.types';
import { AppError } from '@/lib/errors';

export const notificationService = {
  /** Sem RBAC — chamado internamente por outros services (ex: classService no webhook), nunca direto por uma action de fora. */
  async notifyUsers(userIds: string[], data: Omit<CreateNotificationInput, 'userId'>): Promise<void> {
    if (userIds.length === 0) return;
    await notificationRepository.createMany(userIds.map((userId) => ({ ...data, userId })));
  },

  /** Releitura fresca implícita: `userId` sempre vem de `getCurrentUser()` na action, nunca de input do cliente. */
  async getMyNotifications(userId: string): Promise<{ notifications: Notification[]; unreadCount: number }> {
    const [notifications, unreadCount] = await Promise.all([
      notificationRepository.findRecentByUserId(userId),
      notificationRepository.countUnreadByUserId(userId),
    ]);
    return { notifications, unreadCount };
  },

  async markRead(userId: string, notificationId: string): Promise<void> {
    if (!userId) throw new AppError('Usuário não autenticado.');
    await notificationRepository.markRead(userId, notificationId);
  },

  async markAllRead(userId: string): Promise<void> {
    await notificationRepository.markAllRead(userId);
  },
};
