import { z } from 'zod';
import { NotificationSchema, NotificationType } from './notification.schema';

// `createSelectSchema` não preserva o `.$type<NotificationType>()` da coluna
// (infere `string` puro pra varchar) — por isso o campo é sobrescrito aqui.
export type Notification = Omit<z.infer<typeof NotificationSchema>, 'type'> & { type: NotificationType };

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string | null;
}
