import { z } from 'zod';
import {
  PracticeModeEnum,
  VocabMetadataSchema,
  StructureMetadataSchema,
  LearningItemSchema,
  LearningItemReviewStatusEnum,
  AIGeneratedLearningItemSchema,
  PracticeItemSchema,
  learningItemsTable,
  QuizQuestionSchema,
  QuizRenderModeEnum,
  AIGeneratedQuizQuestionSchema,
  quizQuestionsTable,
} from './practice.schema';
import { QuizSectionTypeEnum } from './practice.schema';

export type PracticeMode = z.infer<typeof PracticeModeEnum>;

export type VocabMetadata = z.infer<typeof VocabMetadataSchema>;
export type StructureMetadata = z.infer<typeof StructureMetadataSchema>;
export type LearningItemReviewStatus = z.infer<typeof LearningItemReviewStatusEnum>;
export type LearningItem = z.infer<typeof LearningItemSchema>;
export type NewLearningItem = typeof learningItemsTable.$inferInsert;
export type AIGeneratedLearningItem = z.infer<typeof AIGeneratedLearningItemSchema>;
export type PracticeItem = z.infer<typeof PracticeItemSchema>;

export type QuizSectionType = z.infer<typeof QuizSectionTypeEnum>;
export type QuizRenderMode = z.infer<typeof QuizRenderModeEnum>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type NewQuizQuestion = typeof quizQuestionsTable.$inferInsert;
export type AIGeneratedQuizQuestion = z.infer<typeof AIGeneratedQuizQuestionSchema>;
