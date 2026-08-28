import { describe, expect, it } from 'vitest';
import {
  buildPlaceholderValues,
  findPlaceholderKeys,
  findUnknownPlaceholderKeys,
  normalizeName,
  renderContractTemplate,
  type PlaceholderUser,
} from './contract.utils';

const baseUser: PlaceholderUser = {
  name: 'Maria Souza',
  email: 'maria@exemplo.com',
  phone: '(11) 90000-0000',
  document: '52998224725',
  addressStreet: 'Rua A',
  addressNumber: '10',
  addressComplement: 'Apto 52',
  addressDistrict: 'Centro',
  addressCity: 'São Paulo',
  addressState: 'SP',
  addressZipCode: '01310100',
};

const basePackage = {
  name: 'Semestral',
  installmentValueCents: 15000,
  durationInMonths: 6,
  classesPerWeek: 2,
};

describe('findPlaceholderKeys', () => {
  it('encontra chaves e tolera espaço e caixa', () => {
    const keys = findPlaceholderKeys('<p>{{nome}} e {{ Documento }} e {{CIDADE}}</p>');
    expect(keys).toEqual(['nome', 'documento', 'cidade']);
  });

  it('não duplica a mesma chave', () => {
    expect(findPlaceholderKeys('{{nome}} {{nome}}')).toEqual(['nome']);
  });

  it('devolve vazio quando não há variáveis', () => {
    expect(findPlaceholderKeys('<p>Contrato simples</p>')).toEqual([]);
  });

  it('NÃO casa placeholder partido por tag do editor (limitação conhecida)', () => {
    // Se o admin negrita metade do token, o TipTap gera isto e a variável
    // silenciosamente não seria substituída — por isso o editor mostra um
    // painel de detecção ao vivo para o admin perceber na hora.
    expect(findPlaceholderKeys('{{<strong>nome</strong>}}')).toEqual([]);
  });
});

describe('findUnknownPlaceholderKeys', () => {
  it('aponta variável inventada', () => {
    expect(findUnknownPlaceholderKeys('{{nome}} {{foo}}')).toEqual(['foo']);
  });

  it('aceita o alias cpf', () => {
    expect(findUnknownPlaceholderKeys('{{cpf}}')).toEqual([]);
  });
});

describe('buildPlaceholderValues', () => {
  it('formata CPF, CEP e dinheiro', () => {
    const values = buildPlaceholderValues({
      user: baseUser,
      pkg: basePackage,
      startDate: new Date('2026-03-01T12:00:00Z'),
    });

    expect(values.documento).toBe('529.982.247-25');
    expect(values.cpf).toBe('529.982.247-25');
    expect(values.cep).toBe('01310-100');
    expect(values.valor_mensalidade).toBe(formatBRL(150));
    expect(values.duracao_meses).toBe('6');
    expect(values.aulas_por_semana).toBe('2');
    expect(values.data_inicio).toBe('01/03/2026');
  });

  it('compõe o endereço numa linha', () => {
    const values = buildPlaceholderValues({ user: baseUser, startDate: new Date() });
    expect(values.endereco).toBe('Rua A, 10, Apto 52 — Centro — São Paulo/SP — CEP 01310-100');
  });

  it('pula partes do endereço não preenchidas', () => {
    const values = buildPlaceholderValues({
      user: { ...baseUser, addressComplement: null, addressZipCode: null },
      startDate: new Date(),
    });
    expect(values.endereco).toBe('Rua A, 10 — Centro — São Paulo/SP');
  });

  it('deixa campos de pacote vazios quando não há pacote (contrato de professor)', () => {
    const values = buildPlaceholderValues({ user: baseUser, pkg: null, startDate: new Date() });
    expect(values.pacote).toBe('');
    expect(values.valor_mensalidade).toBe('');
  });
});

describe('renderContractTemplate', () => {
  it('substitui as variáveis', () => {
    const values = buildPlaceholderValues({
      user: baseUser,
      pkg: basePackage,
      startDate: new Date('2026-03-01T12:00:00Z'),
    });
    const { html, unresolved } = renderContractTemplate(
      '<p>Eu, {{nome}}, CPF {{documento}}, contrato o pacote {{pacote}}.</p>',
      values
    );

    expect(html).toBe('<p>Eu, Maria Souza, CPF 529.982.247-25, contrato o pacote Semestral.</p>');
    expect(unresolved).toEqual([]);
  });

  it('nunca deixa {{...}} cru no documento assinado', () => {
    const { html, unresolved } = renderContractTemplate(
      '<p>{{nome}} — {{telefone}}</p>',
      buildPlaceholderValues({ user: { ...baseUser, phone: null }, startDate: new Date() })
    );

    expect(html).not.toContain('{{');
    expect(html).toBe('<p>Maria Souza — —</p>');
    expect(unresolved).toEqual(['telefone']);
  });

  it('ESCAPA HTML do valor — sem isto o aluno injeta script no documento legal', () => {
    const values = buildPlaceholderValues({
      user: { ...baseUser, addressComplement: '<img src=x onerror=alert(1)>' },
      startDate: new Date(),
    });
    const { html } = renderContractTemplate('<p>{{complemento}}</p>', values);

    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('escapa & e aspas', () => {
    const { html } = renderContractTemplate('<p>{{nome}}</p>', { nome: `A & B "C" 'D'` });
    expect(html).toBe('<p>A &amp; B &quot;C&quot; &#39;D&#39;</p>');
  });

  it('substitui todas as ocorrências da mesma variável', () => {
    const { html } = renderContractTemplate('{{nome}} / {{nome}}', { nome: 'Ana' });
    expect(html).toBe('Ana / Ana');
  });
});

describe('normalizeName', () => {
  it('ignora acento, caixa e espaço extra — é a checagem da assinatura', () => {
    expect(normalizeName('JOÃO  DA Silva')).toBe('joao da silva');
    expect(normalizeName('joao da silva')).toBe('joao da silva');
    expect(normalizeName('  María  José  ')).toBe('maria jose');
  });

  it('mantém nomes diferentes diferentes', () => {
    expect(normalizeName('Ana Paula')).not.toBe(normalizeName('Ana Paulo'));
  });

  it('remove toda a faixa de acentuação do português', () => {
    expect(normalizeName('áàâãä éê íï óôõ úü ç ñ')).toBe('aaaaa ee ii ooo uu c n');
  });
});

describe('buildPlaceholderValues — bolsa de estudos', () => {
  const startDate = new Date('2026-03-01T12:00:00Z');

  function values(scholarship?: { percent: number; billingMode: 'MERCADO_PAGO' | 'MANUAL' }) {
    return buildPlaceholderValues({
      user: baseUser,
      pkg: basePackage,
      startDate,
      scholarship,
    });
  }

  it('sem bolsa, as variáveis de bolsa ficam vazias', () => {
    const v = values();
    expect(v.percentual_bolsa).toBe('');
    expect(v.valor_bolsista).toBe('');
    expect(v.valor_desconto).toBe('');
  });

  /**
   * Um modelo PADRÃO que use `{{percentual_bolsa}}` por engano precisa cair em
   * `unresolved` — é esse aviso que impede um contrato sair com um travessão
   * no lugar de uma cláusula.
   */
  it('variável de bolsa num contrato sem bolsa vira travessão e é reportada', () => {
    const { html, unresolved } = renderContractTemplate(
      '<p>Bolsa de {{percentual_bolsa}}.</p>',
      values()
    );
    expect(html).toContain('—');
    expect(unresolved).toContain('percentual_bolsa');
  });

  it('bolsa parcial calcula o valor pago e o abatimento', () => {
    const v = values({ percent: 50, billingMode: 'MERCADO_PAGO' });
    expect(v.percentual_bolsa).toBe('50%');
    expect(v.valor_bolsista).toBe(formatBRL(75));
    expect(v.valor_desconto).toBe(formatBRL(75));
  });

  /**
   * REGRESSÃO: "R$ 0,00" é um valor REAL numa bolsa integral. Se
   * `valor_bolsista` devolvesse '' aqui, o contrato do bolsista sairia com um
   * travessão no lugar do valor e ainda acusaria variável não resolvida.
   */
  it('bolsa integral rende "R$ 0,00" e NÃO entra em unresolved', () => {
    const v = values({ percent: 100, billingMode: 'MANUAL' });
    expect(v.valor_bolsista).toBe(formatBRL(0));

    const { html, unresolved } = renderContractTemplate(
      '<p>Mensalidade: {{valor_bolsista}}.</p>',
      v
    );
    expect(html).toContain(formatBRL(0));
    expect(unresolved).not.toContain('valor_bolsista');
  });

  it('forma_cobranca distingue os três casos', () => {
    expect(values({ percent: 100, billingMode: 'MANUAL' }).forma_cobranca).toContain('Isento');
    expect(values({ percent: 40, billingMode: 'MANUAL' }).forma_cobranca).toContain('secretaria');
    expect(values({ percent: 40, billingMode: 'MERCADO_PAGO' }).forma_cobranca).toContain('Cartão');
  });

  it('as quatro variáveis novas são reconhecidas pelo editor de modelos', () => {
    const template =
      '<p>{{percentual_bolsa}} {{valor_bolsista}} {{valor_desconto}} {{forma_cobranca}}</p>';
    expect(findUnknownPlaceholderKeys(template)).toEqual([]);
  });
});

/** O separador de milhar/moeda do Intl varia com a versão do ICU; monta o esperado do mesmo jeito. */
function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
