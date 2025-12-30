import papa from 'papaparse';
import axios from 'axios';
import { GetRate } from './ExchangeRates';
import { YahooFinanceLoader, YahooFinanceFields } from './YahooFinanceLoader';

class SecurityPostion {
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

  getTaxeRate() {
    if (!this.Ticker.includes('.')) return 0.85 * 0.7;
    else if (this.Ticker.endsWith('.BR')) return 0.7;
    else if (this.Ticker.endsWith('.VX')) return 0.65 * 0.7;
    else if (this.Ticker.endsWith('.ST')) return 0.7 * 0.7;
    else if (this.Ticker.endsWith('.DE')) return 0.7362 * 0.7;
    else if (this.Ticker.endsWith('.CA')) return 0.75 * 0.7;
    else if (this.Ticker.endsWith('.HE')) return 0.8 * 0.7;
    else if (this.Ticker.endsWith('.LU')) return 0.85 * 0.7;
    else if (this.Ticker.endsWith('.AS')) return 0.85 * 0.7;
    else if (this.Ticker.endsWith('.PA')) return 0.872 * 0.7;
    else if (this.Ticker.endsWith('.L')) return 0.7;
    else if (this.Ticker.endsWith('.MC')) return 0.81 * 0.7;
    else return 0.7; // at least belgian taxes
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

    return inEUR === false ? gain : gain * this.RateToEUR;
  }

  getDayDiff() {
    let price = this.Security == null ? null : this.Security.regularMarketPrice;
    let previousPrice =
      this.Security == null ? null : this.Security.regularMarketPreviousClose;
    if (price == null || previousPrice == null) return null;

    return 100 * (price / previousPrice - 1);
  }
}

class CurrencyHelper {
  // sets currency of positions using market.
  static async updateCurrency(positions) {
    for (const position of positions) {
      if (!position.Ticker.includes('.')) position.Currency = 'USD';
      else if (position.Ticker.endsWith('.SW')) position.Currency = 'CHF';
      else if (position.Ticker.endsWith('.L')) position.Currency = 'GBp';
      else if (position.Ticker.endsWith('.OL')) position.Currency = 'NOK';
      else position.Currency = 'EUR';

      position.RateToEUR = await GetRate(position.Currency, 'EUR');
    }
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

      parsedCsv.forEach((data) => {
        data.Shares = Math.abs(Number.parseFloat(data.Shares));
        data.Price = Number.parseFloat(data.Price);
        data.Commission = Number.parseFloat(data.Commission);

        let item = result.find((o) => o.Ticker === data.Symbol);
        if (item == null) {
          item = new SecurityPostion();
          item.Ticker = data.Symbol;
          item.Name = data.Name;
          result.push(item);
        }

        switch (data.Type.toLowerCase()) {
          case 'buy':
            item.NumberOfShares += data.Shares;
            item.MarketCost += data.Shares * data.Price + data.Commission;
            item.Transactions.push(data);
            break;

          case 'sell':
            // calculate past gain with last transactions.
            while (data.Shares > 0) {
              let lastTransaction =
                item.Transactions[item.Transactions.length - 1];
              let x = Math.min(lastTransaction.Shares, data.Shares);
              item.MarketCost -=
                x * lastTransaction.Price + lastTransaction.Commission;
              item.NumberOfShares -= x;
              lastTransaction.Shares -= x;
              data.Shares -= x;
              item.PastGain += x * (data.Price - lastTransaction.Price);

              if (lastTransaction.Shares === 0) item.Transactions.pop();
            }
            break;

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
