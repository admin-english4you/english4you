import { z } from 'zod';

/**
 * RoleEnum (Papéis do Usuário)
 * Define os tipos de acesso que um usuário pode ter na plataforma. Isso é a base do seu RBAC (Role-Based Access Control).
 * 
 * ADMIN: Coordenadores, donos da escola. Têm acesso total (criar turmas, gerenciar financeiro). Acessam o Hub /admin.
 * TEACHER: Professores. Podem iniciar aulas e registrar notas/presença. Acessam o Hub /teacher.
 * STUDENT: Alunos. Consomem conteúdo e fazem pagamentos. Acessam o Hub /student.
 */
export const RoleEnum = z.enum(['ADMIN', 'TEACHER', 'STUDENT']);

export const UserSchema = z.object({
  id: z.uuid(),
  name: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres'),
  email: z.email('E-mail inválido'),
  role: RoleEnum,
  phone: z.string().optional(),
  avatarUrl: z.url().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
