import { z } from 'zod';
import { ClassGroupSchema, ClassRecordSchema, ClassStatusEnum } from './class.schema';

export type ClassStatus = z.infer<typeof ClassStatusEnum>;
export type ClassGroup = z.infer<typeof ClassGroupSchema>;
export type ClassRecord = z.infer<typeof ClassRecordSchema>;
