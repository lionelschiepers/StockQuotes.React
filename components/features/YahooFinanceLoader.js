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

export class YahooFinanceLoader {
  async Load(symbols, fields) {
    const ttl = 300 * 1000;

    const now = Date.now();

    let result = [];

    for (let i = symbols.length - 1; i >= 0; i--) {
      let symbol = symbols[i];
      let cacheItem = localStorage.getItem(symbol);
      if (cacheItem != null) {
        cacheItem = JSON.parse(cacheItem);
        if (now - cacheItem.Date < ttl) // 5 minutes
        {
          result.push(cacheItem);
          symbols.splice(i, 1);
        } else {
          localStorage.removeItem(symbol);
        }
      }
    }

    let chunks = chunk(symbols, 50);
    let urls = [];
    chunks.forEach((item, index, array) => {
      let url = getUrl(chunks[index], fields);
      urls.push(fetchWithRetry(url));
    });

    const responses = await Promise.all(urls);
    responses.forEach((response) => {
      let chunkData = response.data;
      chunkData.forEach((o) => {
        o.Date = now;
        localStorage.setItem(o.symbol, JSON.stringify(o));
        result.push(o);
      });
    });

    return result;
  }
}
