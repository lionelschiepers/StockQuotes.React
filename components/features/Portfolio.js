import papa from 'papaparse';
import axios from 'axios';
import { GetRate } from './ExchangeRates';
import { YahooFinanceLoader, YahooFinanceFields } from './YahooFinanceLoader';

export class SecurityPosition {
  Ticker;
  Market;
  NumberOfShares = 0;
  MarketCost = 0;
  MarketCostEUR = 0;
  MarketPrice = 0;
  MarketPriceEUR = 0;
  Currency;
  Name;
  Transactions = [];
  PastGain = 0;
  PastGainEUR = 0;
  RateToEUR = 1;
  Security; // price of one share

  // Withholding-tax retention rate applied to dividends, keyed by ticker suffix
  // (foreign exchange withholding combined with the 30% Belgian tax on the remainder).
  static #TAX_RATE_BY_SUFFIX = {
    '.BR': 0.7,
    '.VX': 0.65 * 0.7,
    '.ST': 0.7 * 0.7,
    '.DE': 0.7362 * 0.7,
    '.CA': 0.75 * 0.7,
    '.HE': 0.8 * 0.7,
    '.LU': 0.85 * 0.7,
    '.AS': 0.85 * 0.7,
    '.PA': 0.872 * 0.7,
    '.L': 0.7,
    '.MC': 0.81 * 0.7
  };

  getTaxeRate() {
    if (!this.Ticker.includes('.')) return 0.85 * 0.7;

    const suffix = Object.keys(SecurityPosition.#TAX_RATE_BY_SUFFIX).find(
      (candidate) => this.Ticker.endsWith(candidate)
    );
    // Default to Belgian taxes when the suffix isn't recognized.
    return suffix ? SecurityPosition.#TAX_RATE_BY_SUFFIX[suffix] : 0.7;
  }

  getDividendYield(inEur = false) {
    let dividend =
      this.Security == null ? 0 : this.Security.trailingAnnualDividendRate;
    dividend *= this.NumberOfShares;

    if (Number.isNaN(dividend)) return 0;

    dividend *= this.getTaxeRate();

    return inEur === false ? dividend : dividend * this.RateToEUR;
  }

  getGain(inEur = false) {
    if (this.MarketPrice == null || this.MarketCost == null) return null;
    if (this.NumberOfShares === 0) return null;

    if (inEur) return this.MarketPriceEUR - this.MarketCostEUR;

    return this.MarketPrice - this.MarketCost;
  }

  getGainDiff() {
    if (this.MarketPrice == null || this.MarketCost == null) return 0;
    if (this.NumberOfShares === 0) return 0;

    return (100 * this.MarketPrice) / this.MarketCost - 100;
  }

  getDayGain(inEUR) {
    let price = this.Security == null ? null : this.Security.regularMarketPrice;
    let previousPrice =
      this.Security == null ? null : this.Security.regularMarketPreviousClose;
    if (price == null || previousPrice == null) return 0;

    let gain = (price - previousPrice) * this.NumberOfShares;

    return inEUR ? gain * this.RateToEUR : gain;
  }

  getDayDiff() {
    let price = this.Security == null ? null : this.Security.regularMarketPrice;
    let previousPrice =
      this.Security == null ? null : this.Security.regularMarketPreviousClose;
    if (price == null || previousPrice == null) return null;

    return 100 * (price / previousPrice - 1);
  }
}

export class CurrencyHelper {
  static getCurrencyFromTicker(ticker) {
    if (!ticker.includes('.')) return 'USD';
    if (ticker.endsWith('.SW')) return 'CHF';
    if (ticker.endsWith('.L')) return 'GBp';
    if (ticker.endsWith('.OL')) return 'NOK';
    return 'EUR';
  }

  // sets currency of positions using market.
  static async updateCurrency(positions) {
    const currencies = new Set();

    positions.forEach((position) => {
      const currency = CurrencyHelper.getCurrencyFromTicker(position.Ticker);
      position.Currency = currency;
      currencies.add(currency);
    });

    const rates = await Promise.all(
      Array.from(currencies).map(async (currency) => {
        const rate = await GetRate(currency, 'EUR');
        return [currency, rate];
      })
    );

    const ratesByCurrency = new Map(rates);
    positions.forEach((position) => {
      position.RateToEUR = ratesByCurrency.get(position.Currency);
    });
  }
}

export class Portfolio {
  static getDividendRatio(positions) {
    let marketPrice = 0;
    let dividend = 0;

    positions
      .filter((position) => position.NumberOfShares > 0)
      .forEach((position) => {
        marketPrice += position.MarketPriceEUR;
        dividend += position.getDividendYield(true);
      });

    return (100 * dividend) / marketPrice;
  }

  static getDividendRate(positions) {
    let dividend = 0;

    positions
      .filter((position) => position.NumberOfShares > 0)
      .forEach((position) => (dividend += position.getDividendYield(true)));

    return dividend;
  }

  static getDayDiff(positions) {
    let marketPrice = 0;
    let dayGain = 0;

    positions
      .filter((position) => position.NumberOfShares > 0)
      .forEach((position) => {
        marketPrice += position.MarketPriceEUR;
        dayGain += position.getDayGain(true);
      });

    let previousDayMarketPrice = marketPrice - dayGain;
    if (previousDayMarketPrice === 0) return 0;

    return dayGain / previousDayMarketPrice;
  }

  // Loads specified transactions file
  // sample file: https://raw.githubusercontent.com/lionelschiepers/MyStock/master/MyStockWeb/Data/1.csv
  static async Load(url) {
    const result = [];

    await axios.get(url).then((res) => {
      const parsedCsv = papa.parse(res.data, { header: true }).data;

      parsedCsv.forEach((rawRow) => {
        // Validate the raw row before doing anything with it. A malformed
        // CSV (missing fields, non-numeric Shares/Price, unknown Type) would
        // otherwise produce NaN values that propagate through totals.
        if (
          rawRow == null ||
          typeof rawRow.Symbol !== 'string' ||
          rawRow.Symbol.length === 0 ||
          typeof rawRow.Type !== 'string' ||
          rawRow.Type.length === 0
        ) {
          return;
        }

        const shares = Math.abs(Number.parseFloat(rawRow.Shares));
        const price = Number.parseFloat(rawRow.Price);
        const commission = Number.parseFloat(rawRow.Commission);

        const type = rawRow.Type.toLowerCase();
        // Shares/Price are mandatory for buy & sell. Commission is the only
        // numeric field that matters for "deposit cash" rows.
        if (
          (type === 'buy' || type === 'sell') &&
          (Number.isNaN(shares) || Number.isNaN(price))
        ) {
          return;
        }
        if (type === 'deposit cash' && Number.isNaN(commission)) {
          return;
        }

        // Work on a copy so the parsed input isn't mutated. The 'sell' branch
        // below decrements `Shares`, which would corrupt the source on a
        // re-parse otherwise.
        const data = {
          ...rawRow,
          Shares: shares,
          Price: price,
          Commission: Number.isNaN(commission) ? 0 : commission
        };

        let item = result.find((o) => o.Ticker === data.Symbol);
        if (item == null) {
          item = new SecurityPosition();
          item.Ticker = data.Symbol;
          item.Name = data.Name;
          result.push(item);
        }

        switch (type) {
          case 'buy':
            item.NumberOfShares += data.Shares;
            item.MarketCost += data.Shares * data.Price + data.Commission;
            item.Transactions.push({ ...data });
            break;

          case 'sell': {
            // Track remaining shares to sell locally; do not mutate `data`.
            let remaining = data.Shares;
            while (remaining > 0) {
              let lastTransaction =
                item.Transactions[item.Transactions.length - 1];
              let x = Math.min(lastTransaction.Shares, remaining);
              item.MarketCost -=
                x * lastTransaction.Price + lastTransaction.Commission;
              item.NumberOfShares -= x;
              lastTransaction.Shares -= x;
              remaining -= x;
              item.PastGain += x * (data.Price - lastTransaction.Price);

              if (lastTransaction.Shares === 0) item.Transactions.pop();
            }
            break;
          }

          case 'deposit cash':
            item.PastGain += data.Commission;
            break;

          default:
            break;
        }
      });
    });

    await CurrencyHelper.updateCurrency(result);

    const tickers = result
      .filter((o) => o.NumberOfShares > 0)
      .map((o) => o.Ticker);

    let yahooData = await new YahooFinanceLoader().Load(tickers, [
      YahooFinanceFields.RegularMarketPrice,
      YahooFinanceFields.RegularMarketPreviousClose,
      YahooFinanceFields.TrailingAnnualDividendRate
    ]);
    result.forEach(
      (o) => (o.Security = yahooData.find((y) => y.symbol === o.Ticker))
    );

    result.forEach((position) => {
      position.MarketCostEUR = position.RateToEUR * position.MarketCost;
      position.PastGainEUR = position.RateToEUR * position.PastGain;

      if (position.Security == null) return;
      if (position.Security.regularMarketPrice == null) return;

      position.MarketPrice =
        position.Security.regularMarketPrice * position.NumberOfShares;
      position.MarketPriceEUR = position.RateToEUR * position.MarketPrice;
    });

    return result;
  }
}
