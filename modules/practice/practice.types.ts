import { z } from 'zod';
import { 
  PracticeModeEnum, 
  VocabMetadataSchema, 
  StructureMetadataSchema, 
  LearningItemSchema, 
  LessonLearningItemSchema, 
  PracticeItemSchema 
} from './practice.schema';

export type PracticeMode = z.infer<typeof PracticeModeEnum>;

export type VocabMetadata = z.infer<typeof VocabMetadataSchema>;
export type StructureMetadata = z.infer<typeof StructureMetadataSchema>;
export type LearningItem = z.infer<typeof LearningItemSchema>;
export type LessonLearningItem = z.infer<typeof LessonLearningItemSchema>;
export type PracticeItem = z.infer<typeof PracticeItemSchema>;
