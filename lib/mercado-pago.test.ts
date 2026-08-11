import crypto from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildSignatureManifest } from './mercado-pago';

const SECRET = 'segredo-de-teste';
const TS = '1704908010000';
const DATA_ID = 'ABC123';
const REQUEST_ID = 'req-42';

/**
 * `verifyMercadoPagoSignature` lê o secret no carregamento do módulo (padrão dos
 * outros singletons do projeto), então cada teste reimporta o módulo com a env
 * já preparada.
 */
async function importVerifier() {
  vi.resetModules();
  const mod = await import('./mercado-pago');
  return mod.verifyMercadoPagoSignature;
}

function sign(manifest: string, secret = SECRET): string {
  return crypto.createHmac('sha256', secret).update(manifest).digest('hex');
}

function validHeader(overrides?: { ts?: string; v1?: string }) {
  const ts = overrides?.ts ?? TS;
  const v1 = overrides?.v1 ?? sign(buildSignatureManifest({ dataId: DATA_ID, requestId: REQUEST_ID, ts }));
  return `ts=${ts},v1=${v1}`;
}

describe('buildSignatureManifest', () => {
  it('monta o manifest na ordem exata da doc, com ponto-e-vírgula final', () => {
    expect(buildSignatureManifest({ dataId: 'abc', requestId: 'req', ts: '123' })).toBe(
      'id:abc;request-id:req;ts:123;'
    );
  });

  it('minusculiza o data.id (o MP assina o id em minúsculas)', () => {
    expect(buildSignatureManifest({ dataId: 'ABC123', requestId: 'req', ts: '123' })).toBe(
      'id:abc123;request-id:req;ts:123;'
    );
  });

  it('omite as partes ausentes em vez de deixá-las vazias', () => {
    expect(buildSignatureManifest({ dataId: null, requestId: null, ts: '123' })).toBe('ts:123;');
    expect(buildSignatureManifest({ dataId: 'abc', requestId: null, ts: '123' })).toBe('id:abc;ts:123;');
  });
});

describe('verifyMercadoPagoSignature', () => {
  beforeEach(() => {
    vi.stubEnv('MERCADO_PAGO_WEBHOOK_SECRET', SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('aceita uma assinatura válida', async () => {
    const verify = await importVerifier();
    expect(
      verify({ signature: validHeader(), requestId: REQUEST_ID, dataId: DATA_ID, now: Number(TS) })
    ).toBe(true);
  });

  it('aceita o data.id em maiúsculas vindo da query (assinado em minúsculas)', async () => {
    const verify = await importVerifier();
    const signature = `ts=${TS},v1=${sign(buildSignatureManifest({ dataId: 'abc123', requestId: REQUEST_ID, ts: TS }))}`;
    expect(verify({ signature, requestId: REQUEST_ID, dataId: 'ABC123', now: Number(TS) })).toBe(true);
  });

  it('rejeita v1 adulterado', async () => {
    const verify = await importVerifier();
    const signature = validHeader({ v1: sign('manifest:errado;') });
    expect(verify({ signature, requestId: REQUEST_ID, dataId: DATA_ID, now: Number(TS) })).toBe(false);
  });

  it('rejeita assinatura feita com outro secret', async () => {
    const verify = await importVerifier();
    const manifest = buildSignatureManifest({ dataId: DATA_ID, requestId: REQUEST_ID, ts: TS });
    const signature = `ts=${TS},v1=${sign(manifest, 'outro-secret')}`;
    expect(verify({ signature, requestId: REQUEST_ID, dataId: DATA_ID, now: Number(TS) })).toBe(false);
  });

  it('rejeita replay: ts fora da janela de 5 minutos', async () => {
    const verify = await importVerifier();
    const sixMinutesLater = Number(TS) + 6 * 60 * 1000;
    expect(
      verify({ signature: validHeader(), requestId: REQUEST_ID, dataId: DATA_ID, now: sixMinutesLater })
    ).toBe(false);
  });

  it('rejeita quando o request-id não bate com o assinado', async () => {
    const verify = await importVerifier();
    expect(
      verify({ signature: validHeader(), requestId: 'outro-request', dataId: DATA_ID, now: Number(TS) })
    ).toBe(false);
  });

  it('rejeita header ausente ou malformado sem lançar', async () => {
    const verify = await importVerifier();
    const base = { requestId: REQUEST_ID, dataId: DATA_ID, now: Number(TS) };
    expect(verify({ signature: null, ...base })).toBe(false);
    expect(verify({ signature: 'lixo', ...base })).toBe(false);
    expect(verify({ signature: `ts=${TS}`, ...base })).toBe(false);
    // v1 com número ímpar de nibbles: Buffer.from(hex) trunca em vez de lançar.
    expect(verify({ signature: `ts=${TS},v1=abc`, ...base })).toBe(false);
  });

  it('rejeita tudo quando o secret não está configurado', async () => {
    vi.stubEnv('MERCADO_PAGO_WEBHOOK_SECRET', '');
    const verify = await importVerifier();
    expect(
      verify({ signature: validHeader(), requestId: REQUEST_ID, dataId: DATA_ID, now: Number(TS) })
    ).toBe(false);
  });
});
