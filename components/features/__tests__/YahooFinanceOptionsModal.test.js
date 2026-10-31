import { calculateGreeksAndPOP } from '../YahooFinanceOptionsModal';

jest.mock('../YahooFinanceLoader');

describe('calculateGreeksAndPOP', () => {
  const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

  it('measures time to expiry from the given date', () => {
    const now = Date.parse('2031-03-01T00:00:00Z');
    const expiration = new Date(now + YEAR_MS).toISOString();
    const opt = { strike: 100, impliedVolatility: 0.3, expiration };

    const { delta, pop } = calculateGreeksAndPOP(opt, true, 100, null, now);

    // At the money, one year out: d1 = (r + σ²/2) / σ = 0.3, d2 = 0.
    expect(delta).toBeCloseTo(0.618, 3);
    expect(pop).toBeCloseTo(0.5, 3);
  });

  it('returns no estimate without a price or expiration', () => {
    expect(calculateGreeksAndPOP({ strike: 100 }, true, null, null)).toEqual({
      delta: null,
      pop: null
    });
    expect(calculateGreeksAndPOP({ strike: 100 }, false, 100, null)).toEqual({
      delta: null,
      pop: null
    });
  });
});
