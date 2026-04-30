import axios from 'axios';

export function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchWithRetry(url, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.get(url);
      return response;
    } catch (error) {
      lastError = error;
      const status = error.response?.status;
      const isRateLimit = status === 429;
      const isServerError = status >= 500 && status < 600;
      // No `response` typically means a network error (DNS failure, ECONNRESET,
      // timeout, etc.) — those are worth retrying too.
      const isNetworkError = error.response === undefined;
      const shouldRetry = isRateLimit || isServerError || isNetworkError;

      if (!shouldRetry || attempt === maxRetries - 1) {
        throw error;
      }

      let delay;
      if (isRateLimit) {
        const retryAfter = error.response.headers['retry-after'];
        delay = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : baseDelay * Math.pow(2, attempt);
      } else {
        delay = baseDelay * Math.pow(2, attempt);
      }

      const reason = isRateLimit
        ? `Rate limited (429)`
        : isServerError
          ? `Server error (${status})`
          : `Network error`;
      console.warn(
        `${reason}. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`
      );
      await sleep(delay);
    }
  }
  throw lastError;
}

// const anyCorsHttp = axios.create();

function getUrl(quotes, fields) {
  if (!Array.isArray(quotes)) quotes = [quotes];

  let url = process.env.NEXT_PUBLIC_YAHOO_URL + '?symbols=' + quotes.join(',');
  if (fields == null) return url;

  return url + '&fields=' + fields.join(',');
}

export const YahooFinanceFields = {
  /*
    Ask : 'ask',
    AskSize,
    AverageDailyVolume10Day,
    AverageDailyVolume3Month,
    Bid,
    BidSize,
    BookValue,
    */
  Currency: 'currency',
  /*
    DividendDate,
    EarningsTimestamp,
    EarningsTimestampEnd,
    EarningsTimestampStart,
    EpsForward,
    EpsTrailingTwelveMonths,
    */
  Exchange: 'exchange',
  /*
    ExchangeDataDelayedBy,
    ExchangeTimezoneName,
    ExchangeTimezoneShortName,
    FiftyDayAverage,
    FiftyDayAverageChange,
    FiftyDayAverageChangePercent,
    FiftyTwoWeekHigh,
    FiftyTwoWeekHighChange,
    FiftyTwoWeekHighChangePercent,
    FiftyTwoWeekLow,
    FiftyTwoWeekLowChange,
    FiftyTwoWeekLowChangePercent,
    FinancialCurrency,
    ForwardPE,
    FullExchangeName,
    GmtOffSetMilliseconds,
    Language,
    LongName,
    */
  Market: 'market',
  /*
    MarketCap,
    MarketState,
    MessageBoardId,
    PriceHint,
    PriceToBook,
    QuoteSourceName,
    QuoteType,
    RegularMarketChange,
    RegularMarketChangePercent,
    RegularMarketDayHigh,
    RegularMarketDayLow,
    */
  RegularMarketOpen: 'regularMarketOpen',
  RegularMarketPreviousClose: 'regularMarketPreviousClose',
  RegularMarketPrice: 'regularMarketPrice',
  /*
    RegularMarketTime,
    RegularMarketVolume,
    PostMarketChange,
    PostMarketChangePercent,
    PostMarketPrice,
    PostMarketTime,
    SharesOutstanding,
    ShortName,
    SourceInterval,
    */
  Symbol: 'symbol',
  /*
    Tradeable,
    */
  TrailingAnnualDividendRate: 'trailingAnnualDividendRate',
  TrailingAnnualDividendYield: 'trailingAnnualDividendYield'
  /*
    TrailingPE,
    TwoHundredDayAverage,
    TwoHundredDayAverageChange,
    TwoHundredDayAverageChangePercent
    */
};

// Namespaced cache key prefix so we can identify (and prune) our own entries
// in localStorage without colliding with anything else the SPA stores.
const CACHE_PREFIX = 'yh:';
const CACHE_TTL_MS = 5 * 60 * 1000;

function pruneExpired(now) {
  if (typeof localStorage === 'undefined') return;
  // Snapshot the keys first because we mutate localStorage inside the loop.
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CACHE_PREFIX)) keys.push(key);
  }
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) continue;
      const parsed = JSON.parse(raw);
      if (parsed?.Date == null || now - parsed.Date >= CACHE_TTL_MS) {
        localStorage.removeItem(key);
      }
    } catch {
      // Corrupt entry — drop it.
      localStorage.removeItem(key);
    }
  }
}

export class YahooFinanceLoader {
  async Load(symbols, fields) {
    const now = Date.now();

    // Sweep stale / delisted symbols on every load so the cache stays bounded.
    pruneExpired(now);

    let result = [];

    for (let i = symbols.length - 1; i >= 0; i--) {
      let symbol = symbols[i];
      const cacheKey = CACHE_PREFIX + symbol;
      let cacheItem = localStorage.getItem(cacheKey);
      if (cacheItem != null) {
        cacheItem = JSON.parse(cacheItem);
        if (now - cacheItem.Date < CACHE_TTL_MS) {
          result.push(cacheItem);
          symbols.splice(i, 1);
        } else {
          localStorage.removeItem(cacheKey);
        }
      }
    }

    let chunks = chunk(symbols, 50);
    let urls = [];
    chunks.forEach((item, index) => {
      let url = getUrl(chunks[index], fields);
      urls.push(fetchWithRetry(url));
    });

    const responses = await Promise.all(urls);
    responses.forEach((response) => {
      let chunkData = response.data;
      chunkData.forEach((o) => {
        o.Date = now;
        localStorage.setItem(CACHE_PREFIX + o.symbol, JSON.stringify(o));
        result.push(o);
      });
    });

    return result;
  }
}
