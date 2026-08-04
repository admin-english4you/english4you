import { planRepository } from './plan.repository';
import { lessonService } from '@/modules/lesson/lesson.service';
import { Lesson } from '@/modules/lesson/lesson.types';
import { Plan } from './plan.types';

/**
 * Service do módulo de Planos de Ensino. Por enquanto só leitura — CRUD
 * completo de planos/lições é escopo de outra tarefa.
 * TODO: Implementar métodos de criação, atualização e deleção de planos e lições.
 */
export const planService = {
  async getActivePlansForSelect(): Promise<Plan[]> {
    return await planRepository.findActivePlans();
  },

  async getPlanById(id: string): Promise<Plan | undefined> {
    return await planRepository.findById(id);
  },

  async getOrderedLessonsForPlan(planId: string): Promise<Lesson[]> {
    const orderedIds = await planRepository.getOrderedLessonIds(planId);
    if (orderedIds.length === 0) return [];

    const lessons = await lessonService.getLessonsByIds(orderedIds.map((entry) => entry.lessonId));
    const lessonsById = new Map(lessons.map((lesson) => [lesson.id, lesson]));

    return orderedIds
      .map((entry) => lessonsById.get(entry.lessonId))
      .filter((lesson): lesson is Lesson => Boolean(lesson));
  },
};
