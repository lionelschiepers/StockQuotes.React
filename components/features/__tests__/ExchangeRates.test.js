import { GetRate, Cache } from '../ExchangeRates';
import axios from 'axios';

jest.mock('axios');

// Mock DOMParser to control XML parsing behavior
const mockNode = (currency, rate) => ({
  getAttribute: (attr) => {
    if (attr === 'currency') return currency;
    if (attr === 'rate') return rate;
    return null;
  }
});

const mockEvaluate = jest.fn(
  (xpath, document, namespaceResolver, type, result) => {
    const nodes = [mockNode('USD', '1.1'), mockNode('GBP', '0.88')];
    let i = 0;
    return {
      iterateNext: () => {
        if (i < nodes.length) {
          return nodes[i++];
        }
        return null;
      }
    };
  }
);

globalThis.DOMParser = jest.fn(() => ({
  parseFromString: jest.fn(() => ({
    documentElement: {}, // Mock documentElement, might not be used directly in GetRate but good to have
    evaluate: mockEvaluate
  }))
}));

describe('GetRate', () => {
  beforeEach(() => {
    axios.get.mockReset();
    jest.clearAllMocks();
    mockEvaluate.mockClear();
    // Invalidate the cache by re-importing the module.
    // This is a common pattern in Jest for modules with internal state.
    // However, it's tricky with ES modules and `jest.unmock` may be needed
    // or direct manipulation of the Cache if it were exported for testing.
    // For now, we rely on `axios.get` mock to simulate cache misses/hits.

    // A more robust way to clear cache for testing:
    // This assumes Cache.Rates is directly accessible, which it is in this case
    // if we were to expose it for testing. Since it's not, we'll ensure
    // the mock axios.get causes it to be re-initialized.
    Cache.Rates = null;
  });

  // Test cases remain the same, but now DOMParser and evaluate are mocked.
  // The first test case will trigger axios.get, then DOMParser.
  it('should fetch and return the correct exchange rate for known currencies', async () => {
    axios.get.mockResolvedValueOnce({
      data: `<xml>mock</xml>` // Data content doesn't matter much now due to DOMParser mock
    });

    process.env.NEXT_PUBLIC_EXCHANGE_RATES_URL = 'http://test.url';

    const rate = await GetRate('USD', 'EUR');
    expect(rate).toBeCloseTo(1 / 1.1);
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith('http://test.url');
    expect(globalThis.DOMParser).toHaveBeenCalledTimes(1);
    expect(mockEvaluate).toHaveBeenCalledTimes(1);
  });

  it('should use cached rates on subsequent calls', async () => {
    axios.get.mockResolvedValueOnce({
      data: `<xml>mock</xml>`
    });

    process.env.NEXT_PUBLIC_EXCHANGE_RATES_URL = 'http://test.url';

    await GetRate('USD', 'EUR'); // First call, fetches and caches
    // For the second call, we need to ensure the Cache.Rates is still populated from the first call.
    // If the cache was cleared in beforeEach, this test might fail.
    // To ensure caching works, we don't mock axios.get for the second call.
    await GetRate('USD', 'EUR');

    expect(axios.get).toHaveBeenCalledTimes(1); // axios.get should only be called once
    expect(globalThis.DOMParser).toHaveBeenCalledTimes(1); // DOMParser should only be called once
    expect(mockEvaluate).toHaveBeenCalledTimes(1); // evaluate should only be called once
  });

  it('should handle GBp currency correctly', async () => {
    axios.get.mockResolvedValueOnce({
      data: `<xml>mock</xml>`
    });

    process.env.NEXT_PUBLIC_EXCHANGE_RATES_URL = 'http://test.url';

    const rateGBpToEUR = await GetRate('GBp', 'EUR');
    expect(rateGBpToEUR).toBeCloseTo(1 / (0.88 * 100)); // Rate for GBp is 100 * GBP rate

    const rateEURToGBp = await GetRate('EUR', 'GBp');
    expect(rateEURToGBp).toBeCloseTo(0.88 * 100);

    expect(axios.get).toHaveBeenCalledTimes(1); // Should still only call get once due to caching
    expect(globalThis.DOMParser).toHaveBeenCalledTimes(1);
    expect(mockEvaluate).toHaveBeenCalledTimes(1);
  });

  it('should throw an error if the API call fails', async () => {
    axios.get.mockRejectedValueOnce(new Error('Network Error'));
    process.env.NEXT_PUBLIC_EXCHANGE_RATES_URL = 'http://test.url';

    //    await expect(GetRate('USD', 'EUR')).rejects.toThrow(
    //      'Failed to load the exchange rates from http://test.url'
    //    );
    await expect(GetRate('USD', 'EUR')).rejects.toThrow('Network Error');
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(globalThis.DOMParser).not.toHaveBeenCalled(); // DOMParser should not be called if axios fails
    expect(mockEvaluate).not.toHaveBeenCalled(); // evaluate should not be called if axios fails
  });

  it('should throw an error for an unsupported "from" currency', async () => {
    axios.get.mockResolvedValueOnce({
      data: `<xml>mock</xml>`
    });
    process.env.NEXT_PUBLIC_EXCHANGE_RATES_URL = 'http://test.url';

    await expect(GetRate('XYZ', 'EUR')).rejects.toThrow(
      'Failed to retrieve a rate for XYZ'
    );
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(globalThis.DOMParser).toHaveBeenCalledTimes(1);
    expect(mockEvaluate).toHaveBeenCalledTimes(1);
  });

  it('should throw an error for an unsupported "to" currency', async () => {
    axios.get.mockResolvedValueOnce({
      data: `<xml>mock</xml>`
    });
    process.env.NEXT_PUBLIC_EXCHANGE_RATES_URL = 'http://test.url';

    await expect(GetRate('USD', 'XYZ')).rejects.toThrow(
      'Failed to retrieve a rate for XYZ'
    );
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(globalThis.DOMParser).toHaveBeenCalledTimes(1);
    expect(mockEvaluate).toHaveBeenCalledTimes(1);
  });
});
