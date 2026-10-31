import React from 'react';
import PropTypes from 'prop-types';
import { formatNumber, formatPercent, moneyTone } from '../../lib/format';
import { yahooQuoteUrl } from '../../lib/links';

const cellClass =
  'whitespace-nowrap border-b border-l border-rule bg-paper px-3 py-2.5 text-right group-hover:bg-shade nth-2:border-l-0';

function amountOrBlank(value) {
  return value === 0 ? null : value;
}

const YahooFinanceRow = React.memo(function YahooFinanceRow({
  item,
  displayInEUR,
  onOpenOptions
}) {
  const isClosed = item.NumberOfShares === 0;
  const price = item.Security?.regularMarketPrice;
  const dayDiff = item.getDayDiff();
  const dayRatio = dayDiff == null ? null : dayDiff / 100;
  const cost = amountOrBlank(
    displayInEUR ? item.MarketCostEUR : item.MarketCost
  );
  const value = amountOrBlank(
    displayInEUR ? item.MarketPriceEUR : item.MarketPrice
  );
  const gain = item.getGain(displayInEUR);
  const gainRatio = isClosed ? null : item.getGainDiff() / 100;
  const realized = amountOrBlank(
    displayInEUR ? item.PastGainEUR : item.PastGain
  );

  return (
    <tr className={`group ${isClosed ? 'text-pencil' : ''}`}>
      <th
        scope="row"
        className="sticky left-0 z-[5] border-b border-rule bg-paper px-3 py-2 text-left font-normal shadow-[inset_-1px_0_0_var(--color-rule)] group-hover:bg-shade"
      >
        <a
          className="block max-w-[8rem] truncate font-medium hover:underline sm:max-w-[18rem]"
          target="_blank"
          rel="noopener noreferrer"
          href={yahooQuoteUrl(item.Ticker)}
          title={item.Name}
        >
          {item.Name}
        </a>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-pencil">
          <span>{item.Ticker}</span>
          {!isClosed && (
            <button
              type="button"
              onClick={() => onOpenOptions(item)}
              className="cursor-pointer underline decoration-rule underline-offset-2 hover:text-ink hover:decoration-current"
              aria-label={`Option chain for ${item.Name}`}
            >
              Option chain
            </button>
          )}
        </span>
      </th>
      <td className={cellClass}>
        {formatNumber(price, { min: 2, max: 2 })}
        {price != null && (
          <span className="ml-1 text-xs text-pencil">{item.Currency}</span>
        )}
      </td>
      <td className={`${cellClass} ${moneyTone(dayRatio)}`}>
        {formatPercent(dayRatio, { signed: true })}
      </td>
      <td className={cellClass}>{formatNumber(item.NumberOfShares)}</td>
      <td className={cellClass}>{formatNumber(cost, { max: 0 })}</td>
      <td className={cellClass}>{formatNumber(value, { max: 0 })}</td>
      <td className={`${cellClass} ${moneyTone(gain)}`}>
        {formatNumber(gain, { max: 0, signed: true })}
      </td>
      <td className={`${cellClass} ${moneyTone(gainRatio)}`}>
        {formatPercent(gainRatio, { signed: true })}
      </td>
      <td className={`${cellClass} ${moneyTone(realized)}`}>
        {formatNumber(realized, { max: 0, signed: true })}
      </td>
    </tr>
  );
});

YahooFinanceRow.propTypes = {
  item: PropTypes.shape({
    Ticker: PropTypes.string,
    Name: PropTypes.string,
    NumberOfShares: PropTypes.number,
    MarketCost: PropTypes.number,
    MarketCostEUR: PropTypes.number,
    MarketPrice: PropTypes.number,
    MarketPriceEUR: PropTypes.number,
    PastGain: PropTypes.number,
    PastGainEUR: PropTypes.number,
    Currency: PropTypes.string,
    Security: PropTypes.shape({
      regularMarketPrice: PropTypes.number,
      regularMarketPreviousClose: PropTypes.number
    }),
    getGain: PropTypes.func,
    getGainDiff: PropTypes.func,
    getDayDiff: PropTypes.func
  }).isRequired,
  displayInEUR: PropTypes.bool.isRequired,
  onOpenOptions: PropTypes.func.isRequired
};

export default YahooFinanceRow;
