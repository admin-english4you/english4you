import { lessonRepository } from './lesson.repository';
import { Lesson } from './lesson.types';

/**
 * Service do módulo de Lições. Uso interno server-side (sem Actions expostas
 * ainda — CRUD completo de lições é escopo de outra tarefa).
 * TODO: Implementar métodos de criação, atualização e deleção de lições.
 */
export const lessonService = {
  async getLessonsByIds(ids: string[]): Promise<Lesson[]> {
    return await lessonRepository.findByIds(ids);
  },
};
