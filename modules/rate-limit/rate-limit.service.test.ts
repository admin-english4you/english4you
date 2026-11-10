import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./rate-limit.repository', () => ({
  rateLimitRepository: {
    increment: vi.fn(),
    deleteExpired: vi.fn().mockResolvedValue(undefined),
  },
}));

import { rateLimitService } from './rate-limit.service';
import { rateLimitRepository } from './rate-limit.repository';

const rule = { limit: 3, windowSeconds: 900 };

describe('rateLimitService.allow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('libera até o limite e bloqueia a partir da ocorrência seguinte', async () => {
    const increment = vi.mocked(rateLimitRepository.increment);
    increment.mockResolvedValueOnce(1).mockResolvedValueOnce(3).mockResolvedValueOnce(4);

    expect(await rateLimitService.allow('x', 'a@b.com', rule)).toBe(true);
    expect(await rateLimitService.allow('x', 'a@b.com', rule)).toBe(true);
    expect(await rateLimitService.allow('x', 'a@b.com', rule)).toBe(false);
  });

  it('usa chaves distintas por nome e por identificador', async () => {
    const increment = vi.mocked(rateLimitRepository.increment);
    increment.mockResolvedValue(1);

    await rateLimitService.allow('pwd-reset-email', 'a@b.com', rule);
    await rateLimitService.allow('pwd-reset-ip', 'a@b.com', rule);
    await rateLimitService.allow('pwd-reset-email', 'c@d.com', rule);

    const keys = increment.mock.calls.map(([key]) => key);
    expect(new Set(keys).size).toBe(3);
  });

  it('é fail-open: se o banco falhar, não bloqueia o usuário', async () => {
    vi.mocked(rateLimitRepository.increment).mockRejectedValue(new Error('relation "rate_limit_hits" does not exist'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(await rateLimitService.allow('x', 'a@b.com', rule)).toBe(true);
  });
});
