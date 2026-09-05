import { planRepository } from './plan.repository';
import { lessonService } from '@/modules/lesson/lesson.service';
import { classService } from '@/modules/class/class.service';
import { Lesson } from '@/modules/lesson/lesson.types';
import { Plan, CreatePlanInput } from './plan.types';
import { Role } from '@/modules/user/user.types';
import { AppError } from '@/lib/errors';

function assertAdmin(actingRole: Role) {
  if (actingRole !== 'ADMIN') {
    throw new AppError('Apenas administradores podem gerenciar planos de ensino.');
  }
}

/**
 * Service do módulo de Planos de Ensino.
 */
export const planService = {
  async getActivePlansForSelect(): Promise<Plan[]> {
    return await planRepository.findActivePlans();
  },

  async getAllPlans(actingRole: Role): Promise<Plan[]> {
    assertAdmin(actingRole);
    return await planRepository.findAll();
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

  async createPlan(actingRole: Role, data: CreatePlanInput): Promise<Plan> {
    assertAdmin(actingRole);
    return await planRepository.create({
      name: data.name,
      description: data.description ?? null,
      status: 'DRAFT',
    });
  },

  async updatePlan(
    actingRole: Role,
    planId: string,
    data: Partial<Pick<Plan, 'name' | 'description' | 'status'>>
  ): Promise<Plan> {
    assertAdmin(actingRole);
    return await planRepository.update(planId, data);
  },

  /** Cria a lição (via lessonService) e a anexa ao final da ordem deste plano. */
  async addLessonToPlan(
    actingRole: Role,
    planId: string,
    lessonData: { title: string; level: string }
  ): Promise<Lesson> {
    assertAdmin(actingRole);

    const plan = await planRepository.findById(planId);
    if (!plan) {
      throw new AppError('Plano não encontrado.');
    }

    const lesson = await lessonService.createLessonInPlan(actingRole, lessonData);
    const nextOrder = await planRepository.getNextOrder(planId);
    await planRepository.addLessonToPlan(planId, lesson.id, nextOrder);

    // Turmas que já usam este plano não devem esperar uma reatribuição manual
    // pra enxergar a lição nova — ela é encaixada no fim da grade de cada uma.
    await classService.propagateLessonToAssignedClasses(lesson.id, planId);

    return lesson;
  },

  async removeLessonFromPlan(actingRole: Role, planId: string, lessonId: string): Promise<void> {
    assertAdmin(actingRole);
    await planRepository.removeLessonFromPlan(planId, lessonId);
  },

  /**
   * Reescreve a ordem das lições de um plano na sequência recebida (0..n-1).
   * Aceita a lista completa (não só um par trocado) para já vir pronta pra um
   * futuro drag-and-drop real, mesmo a UI atual só reordenando por pares.
   */
  async reorderPlanLessons(actingRole: Role, planId: string, orderedLessonIds: string[]): Promise<void> {
    assertAdmin(actingRole);
    await Promise.all(
      orderedLessonIds.map((lessonId, index) => planRepository.updateLessonOrder(planId, lessonId, index))
    );
  },
};
