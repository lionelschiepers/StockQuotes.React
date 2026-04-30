import axios from 'axios';
import {
  chunk,
  fetchWithRetry,
  YahooFinanceLoader
} from '../YahooFinanceLoader';

jest.mock('axios');

describe('chunk', () => {
  it('splits an array into chunks of the specified size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('returns an empty array when input is empty', () => {
    expect(chunk([], 5)).toEqual([]);
  });

  it('returns a single chunk when size is larger than array length', () => {
    expect(chunk([1, 2, 3], 10)).toEqual([[1, 2, 3]]);
  });

  it('returns chunks of exactly the specified size when divisible', () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4]
    ]);
  });
});

describe('fetchWithRetry', () => {
  let warnSpy;

  beforeEach(() => {
    jest.useFakeTimers();
    axios.get.mockReset();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    warnSpy.mockRestore();
  });

  // Helper that runs fetchWithRetry with all timers auto-advanced so we don't
  // actually sleep between retries during tests.
  const runWithTimers = async (promise) => {
    let resolved;
    let rejected;
    const wrapped = promise.then(
      (v) => (resolved = v),
      (e) => (rejected = e)
    );
    while (resolved === undefined && rejected === undefined) {
      await Promise.resolve();
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    }
    await wrapped;
    if (rejected !== undefined) throw rejected;
    return resolved;
  };

  it('returns the response on the first successful attempt', async () => {
    axios.get.mockResolvedValueOnce({ data: 'ok' });
    const res = await runWithTimers(fetchWithRetry('http://x'));
    expect(res).toEqual({ data: 'ok' });
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it('retries on HTTP 429 and uses retry-after header when present', async () => {
    axios.get
      .mockRejectedValueOnce({
        response: { status: 429, headers: { 'retry-after': '1' } }
      })
      .mockResolvedValueOnce({ data: 'ok' });

    const res = await runWithTimers(fetchWithRetry('http://x'));
    expect(res).toEqual({ data: 'ok' });
    expect(axios.get).toHaveBeenCalledTimes(2);
  });

  it('retries on 5xx server errors with exponential backoff', async () => {
    axios.get
      .mockRejectedValueOnce({ response: { status: 503, headers: {} } })
      .mockRejectedValueOnce({ response: { status: 502, headers: {} } })
      .mockResolvedValueOnce({ data: 'ok' });

    const res = await runWithTimers(fetchWithRetry('http://x'));
    expect(res).toEqual({ data: 'ok' });
    expect(axios.get).toHaveBeenCalledTimes(3);
  });

  it('retries on network errors (no response)', async () => {
    axios.get
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce({ data: 'ok' });

    const res = await runWithTimers(fetchWithRetry('http://x'));
    expect(res).toEqual({ data: 'ok' });
    expect(axios.get).toHaveBeenCalledTimes(2);
  });

  it('does not retry on 4xx client errors other than 429', async () => {
    const err = { response: { status: 404, headers: {} } };
    axios.get.mockRejectedValueOnce(err);

    await expect(runWithTimers(fetchWithRetry('http://x'))).rejects.toBe(err);
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting maxRetries', async () => {
    const err = { response: { status: 500, headers: {} } };
    axios.get.mockRejectedValue(err);

    await expect(runWithTimers(fetchWithRetry('http://x', 3, 10))).rejects.toBe(
      err
    );
    expect(axios.get).toHaveBeenCalledTimes(3);
  });
});

describe('YahooFinanceLoader.Load (cache)', () => {
  beforeEach(() => {
    axios.get.mockReset();
    localStorage.clear();
    process.env.NEXT_PUBLIC_YAHOO_URL = 'http://api/yahoo';
  });

  it('returns cached entries that are still within the 5-minute TTL without calling the network', async () => {
    const cached = {
      symbol: 'AAPL',
      regularMarketPrice: 100,
      Date: Date.now()
    };
    localStorage.setItem('AAPL', JSON.stringify(cached));

    const loader = new YahooFinanceLoader();
    const result = await loader.Load(['AAPL'], ['regularMarketPrice']);

    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('AAPL');
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('evicts expired cache entries and re-fetches them', async () => {
    const expired = {
      symbol: 'AAPL',
      regularMarketPrice: 100,
      Date: Date.now() - 10 * 60 * 1000 // 10 minutes ago, > 5 min TTL
    };
    localStorage.setItem('AAPL', JSON.stringify(expired));

    axios.get.mockResolvedValueOnce({
      data: [{ symbol: 'AAPL', regularMarketPrice: 150 }]
    });

    const loader = new YahooFinanceLoader();
    const result = await loader.Load(['AAPL'], ['regularMarketPrice']);

    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0].regularMarketPrice).toBe(150);

    // The fresh response was written back to the cache.
    const stored = JSON.parse(localStorage.getItem('AAPL'));
    expect(stored.regularMarketPrice).toBe(150);
    expect(stored.Date).toBeGreaterThan(expired.Date);
  });

  it('chunks symbol lists into groups of 50 and issues one request per chunk', async () => {
    const symbols = Array.from({ length: 120 }, (_, i) => `SYM${i}`);

    axios.get.mockImplementation((url) => {
      const symbolsParam = new URL(url).searchParams.get('symbols');
      const data = symbolsParam.split(',').map((s) => ({ symbol: s }));
      return Promise.resolve({ data });
    });

    const loader = new YahooFinanceLoader();
    const result = await loader.Load(symbols, ['regularMarketPrice']);

    // 120 symbols → chunk size 50 → 3 requests (50 + 50 + 20).
    expect(axios.get).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(120);
  });
});
