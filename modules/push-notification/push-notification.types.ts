import { z } from 'zod';
import {
  PushSubscriptionSchema,
  SubscribePushSchema,
  pushSubscriptionsTable,
} from './push-notification.schema';

export type PushSubscriptionRow = z.infer<typeof PushSubscriptionSchema>;
export type NewPushSubscription = typeof pushSubscriptionsTable.$inferInsert;
export type SubscribePushInput = z.infer<typeof SubscribePushSchema>;

/** Linha mínima que o envio em massa precisa — evita carregar colunas à toa. */
export interface PendingReminderSubscription {
  subscriptionId: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}
