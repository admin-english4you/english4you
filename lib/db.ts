import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as userSchema from '@/modules/user/user.schema';
import * as lessonSchema from '@/modules/lesson/lesson.schema';
import * as planSchema from '@/modules/plan/plan.schema';
import * as classSchema from '@/modules/class/class.schema';
import * as practiceSchema from '@/modules/practice/practice.schema';
import * as progressSchema from '@/modules/progress/progress.schema';
import * as notificationSchema from '@/modules/notification/notification.schema';
import * as webhookEventSchema from '@/modules/webhook-event/webhook-event.schema';
import * as financeSchema from '@/modules/finance/finance.schema';
import * as contractSchema from '@/modules/contract/contract.schema';

const databaseUrl = process.env.DATABASE_URL!;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(databaseUrl);
export const db = drizzle(sql, {
  schema: {
    ...userSchema,
    ...lessonSchema,
    ...planSchema,
    ...classSchema,
    ...practiceSchema,
    ...progressSchema,
    ...notificationSchema,
    ...webhookEventSchema,
    ...financeSchema,
    ...contractSchema,
  }
});
