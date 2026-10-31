import React from 'react';
import PropTypes from 'prop-types';
import { Portfolio } from './Portfolio';
import { formatEur, formatPercent, moneyTone } from '../../lib/format';
import { yahooQuoteUrl } from '../../lib/links';

// Day move at which a band block reaches full ink.
const FULL_SHADE_MOVE = 0.03;
// Blocks narrower than this share of the portfolio get no ticker label.
const LABEL_MIN_WEIGHT = 0.045;
// On narrow screens only blocks at least this wide keep their label.
const LABEL_MIN_WEIGHT_NARROW = 0.09;

const sumOf = (values) =>
  values.reduce(
    (total, value) => (Number.isFinite(value) ? total + value : total),
    0
  );

export function summarize(positions) {
  const open = positions.filter((position) => position.NumberOfShares > 0);

  const value = sumOf(positions.map((position) => position.MarketPriceEUR));
  const cost = sumOf(positions.map((position) => position.MarketCostEUR));
  const realized = sumOf(positions.map((position) => position.PastGainEUR));
  const dayGain = sumOf(open.map((position) => position.getDayGain(true)));

  const holdings = open
    .filter((position) => position.MarketPriceEUR > 0)
    .map((position) => {
      const dayDiff = position.getDayDiff();
      return {
        ticker: position.Ticker,
        name: position.Name || position.Ticker,
        weight: value === 0 ? 0 : position.MarketPriceEUR / value,
        dayRatio: dayDiff == null ? null : dayDiff / 100,
        dayGain: position.getDayGain(true)
      };
    })
    .sort((a, b) => b.weight - a.weight);

  return {
    value,
    cost,
    gain: value - cost,
    gainRatio: cost === 0 ? 0 : value / cost - 1,
    realized,
    dayGain,
    dayRatio: Portfolio.getDayDiff(positions),
    dividends: Portfolio.getDividendRate(positions),
    dividendYield: Portfolio.getDividendRatio(positions) / 100,
    holdings
  };
}

function headlineFor(dayGain) {
  const rounded = Math.round(dayGain);
  if (rounded > 0) return `Up ${formatEur(rounded)} today`;
  if (rounded < 0) return `Down ${formatEur(-rounded)} today`;
  return 'Unchanged today';
}

function Amount({ value }) {
  return (
    <span className={`whitespace-nowrap ${moneyTone(value)}`}>
      {formatEur(value, { signed: true })}
    </span>
  );
}

Amount.propTypes = {
  value: PropTypes.number.isRequired
};

function Movers({ holdings, dayGain }) {
  const gainers = holdings
    .filter((holding) => holding.dayGain > 0)
    .sort((a, b) => b.dayGain - a.dayGain);
  const losers = holdings
    .filter((holding) => holding.dayGain < 0)
    .sort((a, b) => a.dayGain - b.dayGain);

  const isDown = dayGain < 0;
  const leading = isDown ? losers : gainers;
  const opposing = isDown ? gainers : losers;
  if (leading.length === 0) return null;

  const [first, second] = leading;
  const counter = opposing[0];

  return (
    <>
      {' '}
      {isDown ? 'Pulled down by' : 'Led by'} {first.name} (
      <Amount value={first.dayGain} />)
      {second && (
        <>
          {' '}
          and {second.name} (<Amount value={second.dayGain} />)
        </>
      )}
      {counter && (
        <>
          ; {counter.name} {isDown ? 'held up best' : 'held it back'} (
          <Amount value={counter.dayGain} />)
        </>
      )}
      .
    </>
  );
}

const holdingShape = PropTypes.shape({
  ticker: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  weight: PropTypes.number.isRequired,
  dayRatio: PropTypes.number,
  dayGain: PropTypes.number.isRequired
});

Movers.propTypes = {
  holdings: PropTypes.arrayOf(holdingShape).isRequired,
  dayGain: PropTypes.number.isRequired
};

function blockColor(dayRatio) {
  if (dayRatio == null || !Number.isFinite(dayRatio))
    return 'var(--color-rule)';
  const depth = Math.min(Math.abs(dayRatio) / FULL_SHADE_MOVE, 1);
  const mix = Math.round(16 + 84 * depth);
  const base = dayRatio < 0 ? 'var(--color-loss)' : 'var(--color-ink)';
  return `color-mix(in srgb, ${base} ${mix}%, var(--color-paper))`;
}

function describeHolding(holding) {
  const move = formatPercent(holding.dayRatio, { signed: true });
  if (!move) return `${holding.name}: no price today`;
  return `${holding.name}: ${move} today (${formatEur(holding.dayGain, { signed: true })})`;
}

function ContributionBand({ holdings }) {
  if (holdings.length === 0) return null;

  return (
    <ul
      aria-label="Today's move by holding, largest first"
      className="mt-10 flex gap-px animate-band-reveal"
    >
      {holdings.map((holding) => (
        <li
          key={holding.ticker}
          className="min-w-0.5"
          style={{ flex: `${holding.weight} 1 0` }}
        >
          <a
            href={yahooQuoteUrl(holding.ticker)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={describeHolding(holding)}
            title={describeHolding(holding)}
            className="group block"
          >
            <span
              className="block h-12 group-hover:outline-2 group-hover:outline-offset-1 group-hover:outline-ink sm:h-14"
              style={{ backgroundColor: blockColor(holding.dayRatio) }}
            />
            <span
              className={`mt-1.5 block truncate pr-1 text-xs text-pencil font-narrow group-hover:text-ink ${
                holding.weight < LABEL_MIN_WEIGHT_NARROW
                  ? 'invisible sm:visible'
                  : ''
              }`}
            >
              {holding.weight >= LABEL_MIN_WEIGHT
                ? holding.ticker.split('.')[0]
                : ''}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

ContributionBand.propTypes = {
  holdings: PropTypes.arrayOf(holdingShape).isRequired
};

function LedgerRow({
  label,
  operator = '',
  amount,
  tone = 'text-ink',
  note = '',
  total = false
}) {
  // Accounting rules: a single rule above a result, a double rule below it.
  const ruled = total ? 'border-t border-b-[3px] border-double border-ink' : '';
  return (
    <div className="grid grid-cols-[minmax(7.5rem,auto)_minmax(9rem,auto)] items-baseline gap-x-3 py-1 sm:grid-cols-[minmax(7.5rem,auto)_minmax(9rem,auto)_1fr]">
      <dt className="text-pencil">{label}</dt>
      <dd className={`flex justify-between gap-3 py-0.5 font-medium ${ruled}`}>
        {/* A non-breaking space keeps the row baseline when there is no operator. */}
        <span aria-hidden="true" className="font-normal text-pencil">
          {operator || '\u00a0'}
        </span>
        <span className={tone}>{amount}</span>
      </dd>
      {note && (
        <dd className="col-start-2 text-right text-sm text-pencil sm:col-start-auto sm:text-left">
          {note}
        </dd>
      )}
    </div>
  );
}

LedgerRow.propTypes = {
  label: PropTypes.string.isRequired,
  operator: PropTypes.string,
  amount: PropTypes.string.isRequired,
  tone: PropTypes.string,
  note: PropTypes.string,
  total: PropTypes.bool
};

const PortfolioSummary = ({ positions }) => {
  const totals = summarize(positions);
  const isDown = Math.round(totals.dayGain) < 0;
  const dividendNote = [
    'a year after tax',
    formatPercent(totals.dividendYield) &&
      `${formatPercent(totals.dividendYield)} yield`
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <section aria-labelledby="today-heading" className="pt-10 sm:pt-14">
      <h1
        id="today-heading"
        className={`font-wide text-display font-bold ${
          isDown ? 'text-loss' : 'text-ink'
        }`}
      >
        {headlineFor(totals.dayGain)}
      </h1>
      <p className="mt-4 max-w-[65ch] text-lg leading-relaxed">
        {formatPercent(totals.dayRatio, { signed: true })} on a portfolio worth{' '}
        {formatEur(totals.value)}.
        <Movers holdings={totals.holdings} dayGain={totals.dayGain} />
      </p>

      <ContributionBand holdings={totals.holdings} />

      <div className="mt-10 grid gap-x-16 gap-y-6 text-lg lg:grid-cols-[auto_auto] lg:justify-start">
        <dl>
          <LedgerRow label="Value" amount={formatEur(totals.value)} />
          <LedgerRow
            label="Cost"
            operator="−"
            amount={formatEur(totals.cost)}
          />
          <LedgerRow
            label="Gain"
            amount={formatEur(totals.gain, { signed: true })}
            tone={moneyTone(totals.gain)}
            note={formatPercent(totals.gainRatio, { signed: true })}
            total
          />
        </dl>
        <dl>
          <LedgerRow
            label="Realized gain"
            amount={formatEur(totals.realized, { signed: true })}
            tone={moneyTone(totals.realized)}
          />
          <LedgerRow
            label="Dividends"
            amount={formatEur(totals.dividends)}
            note={dividendNote}
          />
        </dl>
      </div>
    </section>
  );
};

PortfolioSummary.propTypes = {
  positions: PropTypes.arrayOf(PropTypes.object).isRequired
};

export default PortfolioSummary;
