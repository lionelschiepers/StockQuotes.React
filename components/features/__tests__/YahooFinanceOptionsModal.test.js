import {
  calculateGreeksAndPOP,
  daysUntil,
  formatExpiryWithDays
} from '../YahooFinanceOptionsModal';

vi.mock('../YahooFinanceLoader');

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

describe('daysUntil', () => {
  const now = new Date(2026, 10, 9, 15, 30).getTime(); // Nov 9, 2026, 15:30 local

  it('counts whole calendar days from today', () => {
    expect(daysUntil('2026-12-18', now)).toBe(39);
    expect(daysUntil('2026-11-09', now)).toBe(0);
    expect(daysUntil('2026-11-10', now)).toBe(1);
  });

  it('goes negative for past dates', () => {
    expect(daysUntil('2026-11-08', now)).toBe(-1);
  });

  it('returns null without a usable date', () => {
    expect(daysUntil('', now)).toBeNull();
    expect(daysUntil('not a date', now)).toBeNull();
  });
});

describe('formatExpiryWithDays', () => {
  const now = new Date(2026, 10, 9, 15, 30).getTime();

  it('appends the time left to the formatted date', () => {
    expect(formatExpiryWithDays('2026-12-18', now)).toMatch(/\(39 days\)$/);
    expect(formatExpiryWithDays('2026-11-10', now)).toMatch(/\(1 day\)$/);
    expect(formatExpiryWithDays('2026-11-09', now)).toMatch(/\(today\)$/);
    expect(formatExpiryWithDays('2026-11-08', now)).toMatch(/\(1 day ago\)$/);
  });
});
