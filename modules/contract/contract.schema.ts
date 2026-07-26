import { z } from 'zod';

/**
 * ContractStatusEnum (Status do Contrato)
 * Controla o vínculo legal e o pacote do usuário.
 * 
 * PENDING_SIGNATURE: O usuário entrou na plataforma, mas ainda não assinou o termo.
 * ACTIVE: Contrato assinado e vigente. O aluno está estudando / Professor está lecionando.
 * CANCELED: O usuário desistiu ou foi removido.
 * COMPLETED: O período do contrato acabou. O acesso é encerrado até renovação.
 */
export const ContractStatusEnum = z.enum(['PENDING_SIGNATURE', 'ACTIVE', 'CANCELED', 'COMPLETED']);

/**
 * ContractTemplateSchema
 * Permite que admins criem templates de contrato com variáveis que serão preenchidas.
 * Cada vez que for modificado, o template antigo ganha isActive = false e um novo vira ativo,
 * garantindo que contratos passados continuem referenciando o template que originou suas cláusulas.
 */
export const ContractTemplateSchema = z.object({
  id: z.uuid(),
  name: z.string().min(3, 'Nome do template é obrigatório'),
  content: z.string().min(10, 'O conteúdo do contrato é obrigatório'), // Texto com placeholders como {{nome}}, {{cpf}}, etc.
  isActive: z.boolean().default(true),
  targetRole: z.enum(['STUDENT', 'TEACHER']), // Define quem pode assinar
  version: z.number().int().positive().default(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * ContractSchema
 * O contrato efetivo assinado por um aluno ou professor.
 * Guarda o snapshot do texto no exato momento da assinatura para evitar disputas se o template mudar.
 */
export const ContractSchema = z.object({
  id: z.uuid(),
  templateId: z.uuid(),
  userId: z.uuid(), // Refere-se tanto a alunos quanto a professores
  packageId: z.uuid().optional(), // Professores não têm pacotes, alunos têm.
  status: ContractStatusEnum.default('PENDING_SIGNATURE'),
  contentSnapshot: z.string().optional(), // O HTML/Texto final já com os dados do usuário preenchidos.
  startDate: z.date(),
  signedAt: z.date().nullable().optional(),
  signedByIp: z.string().optional(), // Útil para auditoria de assinatura digital
  documentUrl: z.url().optional(), // PDF gerado e hospedado no S3/Firebase
  createdAt: z.date(),
  updatedAt: z.date(),
});
