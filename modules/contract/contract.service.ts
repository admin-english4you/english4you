import { contractRepository } from './contract.repository';
import { userService } from '@/modules/user/user.service';
import { financeService } from '@/modules/finance/finance.service';
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { Role, SigningIdentityInput, User } from '@/modules/user/user.types';
import { Package } from '@/modules/finance/finance.types';
import {
  buildPlaceholderValues,
  findUnknownPlaceholderKeys,
  normalizeName,
  renderContractTemplate,
} from './contract.utils';
import {
  Contract,
  ContractBillingMode,
  ContractDetail,
  ContractGateFields,
  ContractListItem,
  ContractStatus,
  ContractTargetRole,
  ContractTemplate,
  ContractTemplateKind,
  ScholarshipTerms,
  SignContractInput,
  StudentContractView,
} from './contract.types';

function assertAdmin(actingRole: Role) {
  if (actingRole !== 'ADMIN') {
    throw new AppError('Apenas administradores podem gerenciar contratos.');
  }
}

/** Modelo em branco de um contrato novo — o admin edita a partir daqui. */
const STARTER_TEMPLATE_CONTENT = `<h1>Contrato de Prestação de Serviços Educacionais</h1>
<p>Por este instrumento particular, de um lado <strong>{{escola}}</strong>, doravante denominada CONTRATADA, e de outro lado <strong>{{nome}}</strong>, portador(a) do CPF nº {{documento}}, residente em {{endereco}}, doravante denominado(a) CONTRATANTE, têm entre si justo e contratado o seguinte:</p>
<h2>1. Do objeto</h2>
<p>A CONTRATADA prestará serviços de ensino de idiomas ao CONTRATANTE, na modalidade do pacote <strong>{{pacote}}</strong>, com {{aulas_por_semana}} aula(s) por semana.</p>
<h2>2. Do prazo</h2>
<p>O presente contrato vigora pelo prazo de {{duracao_meses}} meses, com início em {{data_inicio}}.</p>
<h2>3. Do valor</h2>
<p>O CONTRATANTE pagará à CONTRATADA a quantia mensal de <strong>{{valor_mensalidade}}</strong>.</p>
<h2>4. Do aceite</h2>
<p>As partes declaram estar de pleno acordo com as cláusulas acima, assinado eletronicamente em {{data_assinatura}}.</p>`;

/**
 * Modelo em branco do contrato de BOLSISTA.
 *
 * Difere do padrão só na cláusula do valor, que é justamente o motivo de ser
 * outro documento: cita o percentual concedido, o valor cheio de referência e
 * a forma de cobrança. `{{valor_bolsista}}` rende "R$ 0,00" numa bolsa
 * integral — valor real, não vazio.
 */
const STARTER_SCHOLARSHIP_CONTENT = `<h1>Contrato de Prestação de Serviços Educacionais — Bolsista</h1>
<p>Por este instrumento particular, de um lado <strong>{{escola}}</strong>, doravante denominada CONTRATADA, e de outro lado <strong>{{nome}}</strong>, portador(a) do CPF nº {{documento}}, residente em {{endereco}}, doravante denominado(a) CONTRATANTE, têm entre si justo e contratado o seguinte:</p>
<h2>1. Do objeto</h2>
<p>A CONTRATADA prestará serviços de ensino de idiomas ao CONTRATANTE, na modalidade do pacote <strong>{{pacote}}</strong>, com {{aulas_por_semana}} aula(s) por semana.</p>
<h2>2. Do prazo</h2>
<p>O presente contrato vigora pelo prazo de {{duracao_meses}} meses, com início em {{data_inicio}}.</p>
<h2>3. Da bolsa de estudos</h2>
<p>A CONTRATADA concede ao CONTRATANTE uma bolsa de estudos de <strong>{{percentual_bolsa}}</strong> sobre o valor da mensalidade, que passa de {{valor_mensalidade}} para <strong>{{valor_bolsista}}</strong> por mês.</p>
<p>A bolsa é pessoal e intransferível, válida exclusivamente para a vigência deste contrato, e não gera direito adquirido para renovações futuras.</p>
<h2>4. Do pagamento</h2>
<p>Forma de cobrança: {{forma_cobranca}}.</p>
<h2>5. Do aceite</h2>
<p>As partes declaram estar de pleno acordo com as cláusulas acima, assinado eletronicamente em {{data_assinatura}}.</p>`;

/**
 * Normaliza os termos de bolsa ANTES de qualquer efeito colateral.
 *
 * Normaliza em vez de lançar: bolsa integral com cobrança automática é um
 * estado que não faz sentido (não há o que cobrar), e corrigi-lo aqui garante
 * que o CHECK do banco nunca seja o mecanismo que reporta o erro ao usuário.
 */
function normalizeScholarshipTerms(terms?: ScholarshipTerms): ScholarshipTerms {
  const scholarshipPercent = terms?.scholarshipPercent ?? 0;
  return {
    scholarshipPercent,
    billingMode: scholarshipPercent === 100 ? 'MANUAL' : terms?.billingMode ?? 'MERCADO_PAGO',
  };
}

/**
 * A mensagem precisa dizer QUAL modelo falta: depois da migração todos os
 * modelos existentes são do tipo padrão, então o primeiro bolsista da escola
 * esbarra aqui, e "nenhum modelo ativo" sozinho não diz o que fazer.
 */
function describeMissingTemplate(targetRole: ContractTargetRole, isScholarship: boolean): string {
  if (isScholarship) {
    return 'Nenhum modelo de contrato ativo para alunos bolsistas. Crie e ative um modelo do tipo Bolsista em Financeiro → Modelos.';
  }
  return `Nenhum modelo de contrato ativo para ${targetRole === 'STUDENT' ? 'alunos' : 'professores'}. Crie e ative um modelo em Financeiro → Modelos.`;
}

/** Soma meses preservando o fim de mês (31/01 + 1 mês = 28/02, não 03/03). */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const targetDay = result.getDate();
  result.setMonth(result.getMonth() + months);
  if (result.getDate() < targetDay) {
    result.setDate(0);
  }
  return result;
}

/** Só faz sentido pedir contrato para quem assina — admin não tem contrato. */
function toTargetRole(role: Role): ContractTargetRole | null {
  return role === 'STUDENT' || role === 'TEACHER' ? role : null;
}

/**
 * Renderiza o texto do contrato com os dados atuais do usuário.
 * Usado para (a) a PRÉVIA que o aluno lê antes de assinar e (b) o
 * `contentSnapshot` gravado na assinatura — sempre o mesmo caminho, para que
 * o que foi lido e o que foi assinado sejam byte a byte idênticos.
 */
function renderForUser(input: {
  templateContent: string;
  user: User;
  pkg: Package | null;
  startDate: Date;
  signedAt?: Date;
  /** Termos do contrato sendo renderizado — alimentam `{{percentual_bolsa}}` e cia. */
  scholarship?: { percent: number; billingMode: ContractBillingMode } | null;
}): { html: string; unresolved: string[] } {
  const values = buildPlaceholderValues({
    user: input.user,
    pkg: input.pkg,
    startDate: input.startDate,
    signedAt: input.signedAt,
    scholarship: input.scholarship,
  });
  return renderContractTemplate(input.templateContent, values);
}

/** Extrai os termos de bolsa de um contrato para o `renderForUser`. */
function scholarshipOf(contract: Contract): { percent: number; billingMode: ContractBillingMode } {
  return { percent: contract.scholarshipPercent, billingMode: contract.billingMode };
}

/**
 * Service do módulo de Contratos.
 *
 * Depende de `userService` e `financeService` — e NUNCA o contrário. É este
 * módulo que orquestra "criar aluno + emitir contrato" (`registerUserWithContract`),
 * mantendo `user` como folha e evitando o primeiro ciclo de imports do projeto.
 */
export const contractService = {
  // ---------------------------------------------------------------------------
  // Dashboard (admin)
  // ---------------------------------------------------------------------------

  async countByStatus(actingRole: Role): Promise<Record<ContractStatus, number>> {
    assertAdmin(actingRole);

    const rows = await contractRepository.countByStatus();
    const totals: Record<ContractStatus, number> = {
      PENDING_SIGNATURE: 0,
      ACTIVE: 0,
      CANCELED: 0,
      COMPLETED: 0,
    };
    for (const row of rows) totals[row.status] = row.count;
    return totals;
  },

  async getRecentSignedContracts(actingRole: Role, limit: number): Promise<Contract[]> {
    assertAdmin(actingRole);
    return await contractRepository.findRecentSignedContracts(limit);
  },

  // ---------------------------------------------------------------------------
  // Modelos (admin)
  // ---------------------------------------------------------------------------

  async getTemplates(actingRole: Role): Promise<ContractTemplate[]> {
    assertAdmin(actingRole);
    return await contractRepository.findTemplates();
  },

  async getTemplateById(actingRole: Role, templateId: string): Promise<ContractTemplate | undefined> {
    assertAdmin(actingRole);
    return await contractRepository.findTemplateById(templateId);
  },

  async createTemplate(
    actingRole: Role,
    data: { name: string; targetRole: ContractTargetRole; kind?: ContractTemplateKind }
  ): Promise<ContractTemplate> {
    assertAdmin(actingRole);

    const kind = data.kind ?? 'STANDARD';
    const version = await contractRepository.getNextTemplateVersion(data.targetRole);
    return await contractRepository.createTemplate({
      name: data.name,
      targetRole: data.targetRole,
      kind,
      content: kind === 'SCHOLARSHIP' ? STARTER_SCHOLARSHIP_CONTENT : STARTER_TEMPLATE_CONTENT,
      version,
      isActive: false,
    });
  },

  /**
   * Salva o modelo. Se ele JÁ tem contratos vinculados, cria uma nova versão em
   * vez de editar no lugar: um contrato ainda `PENDING_SIGNATURE` lê o texto ao
   * vivo do modelo (o snapshot só existe depois de assinado), então editar
   * mudaria o contrato debaixo de quem já o estava lendo.
   */
  async updateTemplate(
    actingRole: Role,
    templateId: string,
    data: { name?: string; content?: string }
  ): Promise<ContractTemplate> {
    assertAdmin(actingRole);

    const template = await contractRepository.findTemplateById(templateId);
    if (!template) {
      throw new AppError('Modelo de contrato não encontrado.');
    }

    if (data.content !== undefined) {
      const unknown = findUnknownPlaceholderKeys(data.content);
      if (unknown.length > 0) {
        throw new AppError(
          `Variável não reconhecida no contrato: ${unknown.map((k) => `{{${k}}}`).join(', ')}. Use apenas as variáveis da lista lateral.`
        );
      }
    }

    const usageCount = await contractRepository.countContractsByTemplateId(templateId);
    if (usageCount === 0) {
      return await contractRepository.updateTemplate(templateId, data);
    }

    const version = await contractRepository.getNextTemplateVersion(template.targetRole);
    const newTemplate = await contractRepository.createTemplate({
      name: data.name ?? template.name,
      content: data.content ?? template.content,
      targetRole: template.targetRole,
      // Carregar o `kind` é obrigatório: sem isto, cada nova versão de um
      // modelo de bolsista nasceria como STANDARD e a escola ficaria sem
      // modelo de bolsista sem ninguém perceber.
      kind: template.kind,
      version,
      isActive: false,
    });

    // Se o antigo era o ativo, a "ativação" migra para a nova versão. O índice
    // único parcial exige que a desativação e a ativação andem juntas.
    if (template.isActive) {
      await db.batch([
        contractRepository.deactivateTemplatesByRoleQuery(template.targetRole, template.kind),
        contractRepository.activateTemplateQuery(newTemplate.id),
      ]);
      return { ...newTemplate, isActive: true };
    }

    return newTemplate;
  },

  /** Torna este o modelo ativo do seu papel E TIPO, desativando o anterior atomicamente. */
  async setTemplateActive(actingRole: Role, templateId: string): Promise<ContractTemplate> {
    assertAdmin(actingRole);

    const template = await contractRepository.findTemplateById(templateId);
    if (!template) {
      throw new AppError('Modelo de contrato não encontrado.');
    }
    if (template.isActive) return template;

    // `db.batch` e não `db.transaction`: neon-http não tem sessão interativa.
    await db.batch([
      contractRepository.deactivateTemplatesByRoleQuery(template.targetRole, template.kind),
      contractRepository.activateTemplateQuery(templateId),
    ]);

    return { ...template, isActive: true };
  },

  // ---------------------------------------------------------------------------
  // Contratos (admin)
  // ---------------------------------------------------------------------------

  async getContracts(actingRole: Role, filters?: { status?: ContractStatus }): Promise<ContractListItem[]> {
    assertAdmin(actingRole);

    const contracts = await contractRepository.findContracts(filters);
    if (contracts.length === 0) return [];

    const [users, packages] = await Promise.all([
      userService.getUsersByIds(Array.from(new Set(contracts.map((c) => c.userId)))),
      financeService.getPackagesByIds(
        Array.from(new Set(contracts.map((c) => c.packageId).filter((id): id is string => Boolean(id))))
      ),
    ]);

    const usersById = new Map(users.map((u) => [u.id, u]));
    const packagesById = new Map(packages.map((p) => [p.id, p]));

    return contracts.map((contract) => ({
      ...contract,
      userName: usersById.get(contract.userId)?.name ?? 'Usuário removido',
      userEmail: usersById.get(contract.userId)?.email ?? '',
      packageName: contract.packageId ? packagesById.get(contract.packageId)?.name ?? null : null,
    }));
  },

  /**
   * Contratos de UM usuário, para a ficha em /admin/users/[userId].
   *
   * Sem o `html` de propósito — a ficha só mostra status e datas, e renderizar
   * a prévia de cada contrato aqui seria trabalho jogado fora. Quem quer ler ou
   * baixar abre a página do contrato, que já faz isso (`getContractDetail`).
   */
  async getContractsForUser(
    actingRole: Role,
    userId: string
  ): Promise<(Contract & { packageName: string | null })[]> {
    assertAdmin(actingRole);

    const contracts = await contractRepository.findContractsByUserId(userId);
    if (contracts.length === 0) return [];

    const packages = await financeService.getPackagesByIds(
      Array.from(new Set(contracts.map((c) => c.packageId).filter((id): id is string => Boolean(id))))
    );
    const packageById = new Map(packages.map((pkg) => [pkg.id, pkg]));

    return contracts.map((contract) => ({
      ...contract,
      packageName: contract.packageId ? packageById.get(contract.packageId)?.name ?? null : null,
    }));
  },

  async getContractDetail(actingRole: Role, contractId: string): Promise<ContractDetail | null> {
    assertAdmin(actingRole);

    const contract = await contractRepository.findContractById(contractId);
    if (!contract) return null;

    const [user, template, pkg] = await Promise.all([
      userService.getUserById(contract.userId),
      contractRepository.findTemplateById(contract.templateId),
      contract.packageId ? financeService.getPackageById(contract.packageId) : Promise.resolve(undefined),
    ]);

    if (!user || !template) return null;

    // Assinado: mostra o snapshot congelado. Pendente: prévia com os dados de hoje.
    const html = contract.contentSnapshot
      ? contract.contentSnapshot
      : renderForUser({
          templateContent: template.content,
          user,
          pkg: pkg ?? null,
          startDate: contract.startDate,
          scholarship: scholarshipOf(contract),
        }).html;

    return {
      ...contract,
      userName: user.name,
      userEmail: user.email,
      templateName: template.name,
      pkg: pkg ?? null,
      html,
    };
  },

  /**
   * Emite um contrato manualmente — recuperação para um aluno que ficou sem
   * (ex: modelo não estava ativo na época) e caminho normal para professores.
   */
  async createContractForUser(
    actingRole: Role,
    userId: string,
    packageId?: string,
    terms?: ScholarshipTerms
  ): Promise<Contract> {
    assertAdmin(actingRole);

    const user = await userService.getUserById(userId);
    if (!user) {
      throw new AppError('Usuário não encontrado.');
    }

    const targetRole = toTargetRole(user.role);
    if (!targetRole) {
      throw new AppError('Apenas alunos e professores possuem contrato.');
    }

    // Um usuário tem no máximo UM contrato vivo por vez.
    //
    // Quem reemite (troca de pacote, mudança de bolsa) cancela o anterior antes
    // de chegar aqui, então esta trava nunca dispara para eles. Ela existe para
    // o uso avulso: emitir um contrato para quem já tem um deixaria dois
    // válidos ao mesmo tempo, e `getCurrentContractForUser` — que decide o que
    // cobrar e o que o aluno assina — passaria a devolver um dos dois conforme
    // a data de criação, silenciosamente.
    const vigente = await this.getCurrentContractForUser(userId);
    if (vigente) {
      throw new AppError(
        vigente.status === 'ACTIVE'
          ? 'Este usuário já tem um contrato ativo. Cancele-o antes de emitir outro, ou use a troca de pacote.'
          : 'Este usuário já tem um contrato aguardando assinatura.'
      );
    }

    const { scholarshipPercent, billingMode } = normalizeScholarshipTerms(terms);
    const template = await contractRepository.findActiveTemplate(
      targetRole,
      scholarshipPercent > 0 ? 'SCHOLARSHIP' : 'STANDARD'
    );
    if (!template) {
      throw new AppError(describeMissingTemplate(targetRole, scholarshipPercent > 0));
    }

    const pkg = packageId ? await financeService.getPackageById(packageId) : undefined;
    if (packageId && !pkg) {
      throw new AppError('Pacote não encontrado.');
    }

    const startDate = new Date();
    return await contractRepository.create({
      templateId: template.id,
      userId,
      packageId: pkg?.id ?? null,
      status: 'PENDING_SIGNATURE',
      scholarshipPercent,
      billingMode,
      startDate,
      endDate: pkg ? addMonths(startDate, pkg.durationInMonths) : null,
    });
  },

  /**
   * Cadastro de usuário pelo admin + emissão do contrato do aluno, num fluxo só.
   *
   * Substitui o TODO que existia em `userService.createUserByAdmin`. A
   * orquestração mora AQUI (e não lá) para manter `user` como folha na árvore
   * de dependências — `contractService` já precisa de `userService`, e a via
   * contrária fecharia um ciclo de imports.
   *
   * Todas as pré-condições são validadas ANTES de qualquer efeito colateral:
   * o passo seguinte cria usuário no Firebase Auth e no banco, e falhar depois
   * disso deixaria um usuário órfão com convite para uma conta quebrada.
   */
  async registerUserWithContract(
    actingRole: Role,
    data: {
      name: string;
      email: string;
      role: Role;
      packageId?: string;
      scholarshipPercent?: number;
      billingMode?: ContractBillingMode;
      /** Adia a primeira mensalidade — ver `contracts.firstChargeAt`. */
      firstChargeAt?: Date | null;
    }
  ): Promise<{ user: User; contract: Contract | null }> {
    assertAdmin(actingRole);

    if (data.role !== 'STUDENT') {
      const { user } = await userService.createUserByAdmin(actingRole, data);
      return { user, contract: null };
    }

    if (!data.packageId) {
      throw new AppError('Selecione um pacote de aulas para o aluno.');
    }

    const pkg = await financeService.getPackageById(data.packageId);
    if (!pkg) {
      throw new AppError('Pacote não encontrado.');
    }

    // Normalizado ANTES do primeiro efeito colateral, junto das outras
    // pré-condições — ver o docblock acima.
    const { scholarshipPercent, billingMode } = normalizeScholarshipTerms({
      scholarshipPercent: data.scholarshipPercent ?? 0,
      billingMode: data.billingMode ?? 'MERCADO_PAGO',
    });

    const template = await contractRepository.findActiveTemplate(
      'STUDENT',
      scholarshipPercent > 0 ? 'SCHOLARSHIP' : 'STANDARD'
    );
    if (!template) {
      throw new AppError(describeMissingTemplate('STUDENT', scholarshipPercent > 0));
    }

    const { user } = await userService.createUserByAdmin(actingRole, data, { skipInvite: true });

    const startDate = new Date();
    const contract = await contractRepository.create({
      templateId: template.id,
      userId: user.id,
      packageId: pkg.id,
      status: 'PENDING_SIGNATURE',
      scholarshipPercent,
      billingMode,
      firstChargeAt: data.firstChargeAt ?? null,
      startDate,
      endDate: addMonths(startDate, pkg.durationInMonths),
    });

    // Só agora o aluno é convidado: a conta dele está completa.
    await userService.sendInviteForUser(actingRole, user.id);

    return { user, contract };
  },

  async cancelContract(actingRole: Role, contractId: string): Promise<Contract> {
    assertAdmin(actingRole);

    const contract = await contractRepository.findContractById(contractId);
    if (!contract) {
      throw new AppError('Contrato não encontrado.');
    }

    return await contractRepository.updateStatus(contractId, 'CANCELED');
  },

  // ---------------------------------------------------------------------------
  // Área do usuário (aluno/professor)
  // ---------------------------------------------------------------------------

  /**
   * O contrato vigente do usuário — o mais recente que está `ACTIVE` ou
   * `PENDING_SIGNATURE`. É o que o módulo de pagamento consulta para saber qual
   * pacote cobrar, sem precisar renderizar o HTML de `getMyContracts`.
   *
   * Sem RBAC: quem chama já resolveu de quem é o `userId` (o próprio aluno, via
   * sessão, ou um admin que passou pelo `assertAdmin` do seu próprio fluxo).
   */
  /**
   * A fatia do contrato vigente que o PORTÃO DE ACESSO consulta a cada
   * navegação do hub.
   *
   * Separado de `getCurrentContractForUser` por custo, não por permissão: aquele
   * carrega todos os contratos do usuário com `select *`, trazendo junto o
   * `contentSnapshot` (o HTML inteiro do contrato assinado) para ler dois
   * inteiros. Mesma regra de "sem RBAC" do vizinho abaixo.
   */
  async getCurrentContractGateFieldsForUser(userId: string): Promise<ContractGateFields | null> {
    return await contractRepository.findCurrentContractGateFieldsByUserId(userId);
  },

  async getCurrentContractForUser(userId: string): Promise<Contract | null> {
    const contracts = await contractRepository.findContractsByUserId(userId);
    return (
      contracts.find((c) => c.status === 'ACTIVE' || c.status === 'PENDING_SIGNATURE') ?? null
    );
  },

  /** Contratos do próprio usuário, com o texto já pronto para leitura. */
  async getMyContracts(userId: string): Promise<StudentContractView[]> {
    const user = await userService.getUserById(userId);
    if (!user) {
      throw new AppError('Usuário não encontrado.');
    }

    const contracts = await contractRepository.findContractsByUserId(userId);
    if (contracts.length === 0) return [];

    const [templates, packages] = await Promise.all([
      Promise.all(contracts.map((c) => contractRepository.findTemplateById(c.templateId))),
      financeService.getPackagesByIds(
        Array.from(new Set(contracts.map((c) => c.packageId).filter((id): id is string => Boolean(id))))
      ),
    ]);

    const templatesById = new Map(
      templates.filter((t): t is ContractTemplate => Boolean(t)).map((t) => [t.id, t])
    );
    const packagesById = new Map(packages.map((p) => [p.id, p]));

    return contracts.map((contract) => {
      const pkg = contract.packageId ? packagesById.get(contract.packageId) ?? null : null;
      const template = templatesById.get(contract.templateId);

      const preview = contract.contentSnapshot
        ? { html: contract.contentSnapshot, unresolved: [] as string[] }
        : renderForUser({
            templateContent: template?.content ?? '<p>Modelo indisponível.</p>',
            user,
            pkg,
            startDate: contract.startDate,
            scholarship: scholarshipOf(contract),
          });

      return {
        ...contract,
        packageName: pkg?.name ?? null,
        html: preview.html,
        // Enquanto faltar CPF/endereço a prévia sai com "—" no lugar dos dados;
        // o formulário do passo 1 precisa aparecer antes da assinatura.
        needsIdentity: !user.document || !user.addressStreet,
      };
    });
  },

  /** Passo 1 da assinatura: o aluno grava os próprios CPF e endereço. */
  async saveSigningIdentity(userId: string, data: SigningIdentityInput): Promise<User> {
    return await userService.updateSigningIdentity(userId, data);
  },

  /**
   * Passo 3: assina. Congela o texto renderizado em `contentSnapshot` — é ele
   * que vale juridicamente, e editar o modelo depois nunca o altera.
   *
   * `signedByIp` vem da action (que lê os headers do Next); o service
   * permanece agnóstico de framework.
   */
  async signContract(
    userId: string,
    signedByIp: string,
    data: SignContractInput
  ): Promise<Contract> {
    const contract = await contractRepository.findContractById(data.contractId);
    if (!contract) {
      throw new AppError('Contrato não encontrado.');
    }

    // ABAC: o contractId vem do cliente, então a posse é conferida aqui.
    if (contract.userId !== userId) {
      throw new AppError('Você não tem permissão para assinar este contrato.');
    }

    // Idempotência contra duplo submit / reenvio do formulário.
    if (contract.status !== 'PENDING_SIGNATURE') {
      throw new AppError('Este contrato já foi assinado.');
    }

    const user = await userService.getUserById(userId);
    if (!user) {
      throw new AppError('Usuário não encontrado.');
    }

    if (!user.document || !user.addressStreet) {
      throw new AppError('Preencha seus dados pessoais antes de assinar.');
    }

    if (normalizeName(data.signedName) !== normalizeName(user.name)) {
      throw new AppError('O nome digitado não confere com o nome cadastrado.');
    }

    const template = await contractRepository.findTemplateById(contract.templateId);
    if (!template) {
      throw new AppError('Modelo do contrato indisponível.');
    }

    const pkg = contract.packageId ? await financeService.getPackageById(contract.packageId) : null;
    const signedAt = new Date();

    const { html, unresolved } = renderForUser({
      templateContent: template.content,
      user,
      pkg: pkg ?? null,
      startDate: contract.startDate,
      signedAt,
      scholarship: scholarshipOf(contract),
    });

    if (unresolved.length > 0) {
      console.warn(
        `[contract] Variáveis sem valor ao assinar ${contract.id}: ${unresolved.join(', ')}`
      );
    }

    return await contractRepository.markSigned(contract.id, {
      contentSnapshot: html,
      signedName: data.signedName.trim(),
      signedByIp,
      signedAt,
    });
  },
};
