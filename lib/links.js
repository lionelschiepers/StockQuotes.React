export function yahooQuoteUrl(ticker) {
  return `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}`;
}
