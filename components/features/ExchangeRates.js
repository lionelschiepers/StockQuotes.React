import axios from 'axios';

// 5 minute TTL, matches YahooFinanceLoader.
const RATES_TTL_MS = 5 * 60 * 1000;

class Cache {
  static Rates;
  static FetchedAt;
}

// i.e: let rate = await GetRate('USD', 'EUR')
export async function GetRate(from, to) {
  const url = process.env.NEXT_PUBLIC_EXCHANGE_RATES_URL;

  const isStale =
    Cache.FetchedAt == null || Date.now() - Cache.FetchedAt >= RATES_TTL_MS;

  if (Cache.Rates == null || isStale) {
    await axios.get(url).then((res) => {
      let parser = new DOMParser();
      let doc = parser.parseFromString(res.data, 'text/xml');

      let nodes = doc.evaluate(
        "/gesmes:Envelope/*[name()='Cube']/*[name()='Cube']/*[name()='Cube']",
        doc.documentElement,
        doc.documentElement,
        XPathResult.ANY_TYPE,
        null
      );
      let result = [];
      let node;
      while ((node = nodes.iterateNext()) != null) {
        let currency = node.getAttribute('currency');
        let rate = node.getAttribute('rate');

        result.push({
          currency: currency.toUpperCase(),
          rate: Number.parseFloat(rate)
        });
        if (currency === 'GBP') {
          result.push({
            currency: 'GBp',
            rate: 100 * Number.parseFloat(rate)
          });
        }
      }

      // EUR => EUR
      result.push({ currency: 'EUR', rate: 1 });

      Cache.Rates = result;
      Cache.FetchedAt = Date.now();
    });
  }

  let fromRate = Cache.Rates.find((o) => o.currency === from);
  if (fromRate == null)
    throw new Error(`Failed to retrieve a rate for ${from}`);

  let toRate = Cache.Rates.find((o) => o.currency === to);
  if (toRate == null) throw new Error(`Failed to retrieve a rate for ${to}`);

  let rate = (1 / fromRate.rate) * toRate.rate;
  return rate;
}

export { Cache };
