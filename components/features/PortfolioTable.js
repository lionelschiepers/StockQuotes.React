import React, { useState, useMemo, useCallback, useId } from 'react';
import PropTypes from 'prop-types';
import { CSVLink } from 'react-csv';
import YahooFinanceRow from './YahooFinanceRow';

const COLUMNS = [
  { key: 'Name', label: 'Position', numeric: false },
  { key: 'Security.regularMarketPrice', label: 'Price', numeric: true },
  { key: 'Diff', label: 'Today', numeric: true },
  { key: 'NumberOfShares', label: 'Shares', numeric: true },
  { key: 'MarketCost', label: 'Cost', numeric: true },
  { key: 'MarketPrice', label: 'Value', numeric: true },
  { key: 'Gain', label: 'Gain', numeric: true },
  { key: 'GainPercent', label: 'Gain %', numeric: true },
  { key: 'PastGain', label: 'Realized', numeric: true }
];

const ARIA_SORT = { ASC: 'ascending', DESC: 'descending' };
const SORT_GLYPH = { ASC: '▲', DESC: '▼' };

const firstSortDirection = (field) => (field === 'Name' ? 'ASC' : 'DESC');

function getSortValue(item, field, displayInEUR) {
  switch (field) {
    case 'Security.regularMarketPrice':
      return item.Security?.regularMarketPrice ?? null;
    case 'Diff':
      return item.getDayDiff();
    case 'GainPercent':
      return item.getGainDiff();
    case 'Gain':
      return item.getGain(displayInEUR);
    case 'MarketCost':
    case 'MarketPrice':
    case 'PastGain':
      return displayInEUR ? item[`${field}EUR`] : item[field];
    default:
      return item[field];
  }
}

export function sortPositions(list, field, direction, displayInEUR) {
  const factor = direction === 'ASC' ? 1 : -1;
  const compareNames = (a, b) =>
    factor * a.Name.toLowerCase().localeCompare(b.Name.toLowerCase());

  return [...list].sort((a, b) => {
    if (field === 'Name') return compareNames(a, b);

    // Closed positions always sink to the bottom, alphabetically.
    const aClosed = a.NumberOfShares === 0;
    const bClosed = b.NumberOfShares === 0;
    if (aClosed && bClosed) return compareNames(a, b);
    if (aClosed !== bClosed) return aClosed ? 1 : -1;

    const aValue = getSortValue(a, field, displayInEUR);
    const bValue = getSortValue(b, field, displayInEUR);
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;
    return factor * (aValue - bValue);
  });
}

function SortHeader({ column, sort, onSort }) {
  const direction = sort.field === column.key ? sort.direction : null;
  // Unsorted columns preview the direction a click would apply.
  const glyph = (
    <span
      aria-hidden="true"
      className={`inline-block w-2.5 text-[0.625rem] ${
        direction
          ? ''
          : 'invisible text-pencil group-hover:visible group-focus-visible:visible'
      }`}
    >
      {SORT_GLYPH[direction ?? firstSortDirection(column.key)]}
    </span>
  );

  const stickyColumn = column.numeric
    ? 'z-10 border-l border-rule text-right shadow-[inset_0_-2px_0_var(--color-ink)] nth-2:border-l-0'
    : 'sticky left-0 z-20 text-left shadow-[inset_0_-2px_0_var(--color-ink),inset_-1px_0_0_var(--color-rule)]';

  return (
    <th
      scope="col"
      aria-sort={direction ? ARIA_SORT[direction] : undefined}
      className={`whitespace-nowrap bg-paper p-0 font-semibold xl:sticky xl:top-0 ${stickyColumn}`}
    >
      <button
        type="button"
        onClick={() => onSort(column.key)}
        className={`group flex w-full cursor-pointer items-center gap-1 px-3 pb-2.5 pt-2 ${
          column.numeric ? 'justify-end' : 'justify-start'
        }`}
      >
        {column.numeric && glyph}
        {column.label}
        {!column.numeric && glyph}
      </button>
    </th>
  );
}

SortHeader.propTypes = {
  column: PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    numeric: PropTypes.bool.isRequired
  }).isRequired,
  sort: PropTypes.shape({
    field: PropTypes.string,
    direction: PropTypes.oneOf(['ASC', 'DESC'])
  }).isRequired,
  onSort: PropTypes.func.isRequired
};

function CurrencySwitch({ displayInEUR, onChange }) {
  const id = useId();
  const options = [
    { value: false, label: 'Local currency' },
    { value: true, label: 'EUR' }
  ];

  return (
    <div className="flex items-center gap-3">
      <span id={`${id}-label`} className="text-sm text-pencil">
        Amounts in
      </span>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        className="inline-flex rounded-md border border-rule p-0.5"
      >
        {options.map((option) => (
          <label
            key={option.label}
            className="cursor-pointer rounded px-3 py-1.5 text-sm has-checked:bg-ink has-checked:text-paper has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ledger"
          >
            <input
              type="radio"
              name={`${id}-currency`}
              className="sr-only"
              checked={displayInEUR === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
}

CurrencySwitch.propTypes = {
  displayInEUR: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired
};

const PortfolioTable = ({ positions, onOpenOptions }) => {
  const [displayInEUR, setDisplayInEUR] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [sort, setSort] = useState({ field: null, direction: null });

  const openCount = useMemo(
    () => positions.filter((position) => position.NumberOfShares > 0).length,
    [positions]
  );

  const rows = useMemo(() => {
    const visible = showClosed
      ? positions
      : positions.filter((position) => position.NumberOfShares > 0);
    if (sort.field == null) return visible;
    return sortPositions(visible, sort.field, sort.direction, displayInEUR);
  }, [positions, showClosed, sort, displayInEUR]);

  // Names sort A to Z first; figures sort largest first.
  const handleSort = useCallback((field) => {
    setSort((previous) => {
      if (previous.field === field) {
        return {
          field,
          direction: previous.direction === 'ASC' ? 'DESC' : 'ASC'
        };
      }
      return { field, direction: firstSortDirection(field) };
    });
  }, []);

  const closedCount = positions.length - openCount;

  return (
    <section aria-labelledby="positions-heading" className="mt-16">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <h2
          id="positions-heading"
          className="text-[1.3125rem] font-semibold font-wide"
        >
          Positions{' '}
          <span className="font-normal text-pencil">{openCount} open</span>
        </h2>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <CurrencySwitch
            displayInEUR={displayInEUR}
            onChange={setDisplayInEUR}
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showClosed}
              onChange={() => setShowClosed((previous) => !previous)}
              className="h-4 w-4 accent-ink"
            />
            Show closed positions
            {closedCount > 0 && (
              <span className="text-pencil">({closedCount})</span>
            )}
          </label>
          <CSVLink
            data={positions}
            filename="portfolio.csv"
            className="inline-flex h-9 items-center rounded-md border border-ink px-3 text-sm font-medium hover:bg-ink hover:text-paper"
          >
            Download CSV
          </CSVLink>
        </div>
      </div>

      <div className="-mx-4 mt-5 overflow-x-auto px-4 sm:mx-0 sm:px-0 xl:overflow-visible">
        <table className="w-max min-w-full border-separate border-spacing-0 text-sm font-narrow">
          <caption className="sr-only">
            Positions, amounts in {displayInEUR ? 'EUR' : 'local currency'}
          </caption>
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <SortHeader
                  key={column.key}
                  column={column}
                  sort={sort}
                  onSort={handleSort}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <YahooFinanceRow
                key={item.Ticker}
                item={item}
                displayInEUR={displayInEUR}
                onOpenOptions={onOpenOptions}
              />
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="px-3 py-8 text-base text-pencil [font-stretch:100%]"
                >
                  No open positions. Turn on Show closed positions to see
                  holdings you have sold.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

PortfolioTable.propTypes = {
  positions: PropTypes.arrayOf(PropTypes.object).isRequired,
  onOpenOptions: PropTypes.func.isRequired
};

export default PortfolioTable;
