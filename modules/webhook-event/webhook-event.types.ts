import { z } from 'zod';
import { ProcessedWebhookEventSchema } from './webhook-event.schema';

export type ProcessedWebhookEvent = z.infer<typeof ProcessedWebhookEventSchema>;
