import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useId
} from 'react';
import PropTypes from 'prop-types';
import { fetchStockOptions } from './YahooFinanceLoader';
import Loading from '../ui/Loading';
import {
  formatNumber,
  formatPercent,
  getLocale,
  moneyTone
} from '../../lib/format';

const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;
const RISK_FREE_RATE = 0.045;
// Bid/ask spreads this wide (as a share of the mid price) are flagged.
const WIDE_SPREAD = 0.2;

const erf = (x) => {
  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1 / (1 + p * absX);
  const y =
    1 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return sign * y;
};

const normalCDF = (x) => 0.5 * (1 + erf(x / Math.sqrt(2)));

// Estimates delta and probability-of-profit for an option contract using a
// Black-Scholes approximation. `fallbackExpiration` is used when the
// contract itself doesn't carry an expiration date.
export function calculateGreeksAndPOP(
  opt,
  isCall,
  currentPrice,
  fallbackExpiration,
  now = Date.now()
) {
  if (!currentPrice || !opt.strike) return { delta: null, pop: null };

  const S = currentPrice;
  const K = opt.strike;
  const iv = opt.impliedVolatility || 0.3;
  const expiryDateString = opt.expiration || fallbackExpiration;
  if (!expiryDateString) return { delta: null, pop: null };

  const expiry = new Date(expiryDateString).getTime();
  if (Number.isNaN(expiry)) return { delta: null, pop: null };

  let T = (expiry - now) / MS_PER_YEAR;
  if (T <= 0) T = 1 / (365 * 24 * 60);

  const q = 0; // Dividend yield
  const sigmaSqrtT = iv * Math.sqrt(T);
  if (sigmaSqrtT <= 0) return { delta: null, pop: null };

  const d2 =
    (Math.log(S / K) + (RISK_FREE_RATE - q - 0.5 * (iv * iv)) * T) / sigmaSqrtT;
  const d1 = d2 + sigmaSqrtT;

  const delta = isCall
    ? Math.exp(-q * T) * normalCDF(d1)
    : -Math.exp(-q * T) * normalCDF(-d1);

  const pop = isCall ? normalCDF(-d2) : normalCDF(d2);

  return { delta, pop };
}

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleDateString(getLocale(), {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

const dash = (text) => text || '–';

const COLUMNS = [
  'Strike',
  'Last',
  'Bid',
  'Ask',
  'Spread',
  'Change',
  'Volume',
  'Open interest',
  'Implied vol.',
  'Delta',
  'Prob. of profit'
];

function OptionRow({ opt, isCall, currentPrice, selectedExpiration }) {
  const isITM =
    currentPrice != null &&
    (isCall ? opt.strike < currentPrice : opt.strike > currentPrice);

  const { delta, pop } = calculateGreeksAndPOP(
    opt,
    isCall,
    currentPrice,
    selectedExpiration
  );

  const bid = opt.bid || 0;
  const ask = opt.ask || 0;
  const mid = (bid + ask) / 2;
  const spread = mid > 0 ? (ask - bid) / mid : null;
  const change = opt.percentChange == null ? null : opt.percentChange / 100;

  const shade = isITM ? 'bg-shade' : '';
  const cell = `border-b border-rule px-3 py-2 text-right ${shade}`;

  return (
    <tr>
      <th
        scope="row"
        className={`sticky left-0 z-[5] border-b border-rule px-3 py-2 text-left shadow-[inset_-1px_0_0_var(--color-rule)] ${
          isITM ? 'bg-shade font-semibold' : 'bg-sheet font-normal'
        }`}
      >
        {formatNumber(opt.strike, { min: 2, max: 2 })}
      </th>
      <td className={cell}>
        {dash(formatNumber(opt.lastPrice, { min: 2, max: 2 }))}
      </td>
      <td className={cell}>
        {dash(formatNumber(opt.bid, { min: 2, max: 2 }))}
      </td>
      <td className={cell}>
        {dash(formatNumber(opt.ask, { min: 2, max: 2 }))}
      </td>
      <td
        className={`${cell} ${spread != null && spread >= WIDE_SPREAD ? 'text-loss' : ''}`}
      >
        {dash(formatPercent(spread, { digits: 1 }))}
      </td>
      <td className={`${cell} ${moneyTone(change)}`}>
        {dash(formatPercent(change, { signed: true }))}
      </td>
      <td className={cell}>{dash(formatNumber(opt.volume, { max: 0 }))}</td>
      <td className={cell}>
        {dash(formatNumber(opt.openInterest, { max: 0 }))}
      </td>
      <td className={cell}>
        {dash(formatPercent(opt.impliedVolatility, { digits: 1 }))}
      </td>
      <td className={cell}>{dash(formatNumber(delta, { min: 2, max: 2 }))}</td>
      <td className={cell}>{dash(formatPercent(pop, { digits: 1 }))}</td>
    </tr>
  );
}

OptionRow.propTypes = {
  opt: PropTypes.shape({
    contractSymbol: PropTypes.string,
    strike: PropTypes.number,
    expiration: PropTypes.string,
    lastPrice: PropTypes.number,
    bid: PropTypes.number,
    ask: PropTypes.number,
    percentChange: PropTypes.number,
    volume: PropTypes.number,
    openInterest: PropTypes.number,
    impliedVolatility: PropTypes.number
  }).isRequired,
  isCall: PropTypes.bool.isRequired,
  currentPrice: PropTypes.number,
  selectedExpiration: PropTypes.string
};

const segmentClass =
  'cursor-pointer rounded px-3 py-1.5 text-sm aria-pressed:bg-ink aria-pressed:text-paper';

const YahooFinanceOptionsModal = ({
  isOpen,
  onClose,
  symbol,
  name,
  currentPrice
}) => {
  const dialogRef = useRef(null);
  const titleId = useId();
  const selectId = useId();
  const [request, setRequest] = useState({
    status: 'loading',
    data: null,
    error: null
  });
  const [attempt, setAttempt] = useState(0);
  const [activeTab, setActiveTab] = useState('calls');
  const [selectedExpiration, setSelectedExpiration] = useState('');

  // Open as a modal (focus moves inside, the page goes inert) and give focus
  // back to whatever opened it when the dialog goes away.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return undefined;

    const opener = document.activeElement;
    if (dialog.showModal) {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }

    return () => {
      if (dialog.open && dialog.close) dialog.close();
      opener?.focus?.();
    };
  }, [isOpen]);

  // A click whose target is the dialog itself landed on the backdrop. Escape
  // is the keyboard equivalent and is handled through onCancel.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return undefined;

    const closeOnBackdropClick = (event) => {
      if (event.target === dialog) onClose();
    };
    dialog.addEventListener('click', closeOnBackdropClick);
    return () => dialog.removeEventListener('click', closeOnBackdropClick);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !symbol) return undefined;

    let cancelled = false;
    const loadOptions = async () => {
      setRequest({ status: 'loading', data: null, error: null });
      try {
        const data = await fetchStockOptions(symbol);
        if (cancelled) return;
        setRequest({ status: 'ready', data, error: null });
        setSelectedExpiration(data?.options?.[0]?.expirationDate ?? '');
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setRequest({ status: 'error', data: null, error });
        }
      }
    };

    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, [isOpen, symbol, attempt]);

  if (!isOpen) return null;

  const groups = request.data?.options ?? [];
  const selectedGroup =
    groups.find((group) => group.expirationDate === selectedExpiration) ||
    groups[0];
  const calls = Array.isArray(selectedGroup?.calls) ? selectedGroup.calls : [];
  const puts = Array.isArray(selectedGroup?.puts) ? selectedGroup.puts : [];
  const list = activeTab === 'calls' ? calls : puts;

  let content;
  if (request.status === 'loading') {
    content = (
      <div className="flex h-full flex-col items-center justify-center">
        <Loading label={`Loading the option chain for ${symbol}`} />
      </div>
    );
  } else if (request.status === 'error') {
    const detail = request.error?.message ? ` (${request.error.message})` : '';
    content = (
      <div role="alert" className="max-w-[60ch] py-6">
        <p className="text-lg">
          The option chain for {symbol} couldn&apos;t be loaded{detail}.
        </p>
        <button
          type="button"
          onClick={() => setAttempt((count) => count + 1)}
          className="mt-5 h-10 cursor-pointer rounded-md bg-ink px-4 font-medium text-paper hover:opacity-90"
        >
          Try again
        </button>
      </div>
    );
  } else if (groups.length === 0) {
    content = (
      <p className="py-6 text-lg">
        No option contracts are listed for {symbol}.
      </p>
    );
  } else {
    content = (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
          <div className="inline-flex rounded-md border border-rule p-0.5">
            <button
              type="button"
              aria-pressed={activeTab === 'calls'}
              onClick={() => setActiveTab('calls')}
              className={segmentClass}
            >
              Calls <span className="opacity-70">{calls.length}</span>
            </button>
            <button
              type="button"
              aria-pressed={activeTab === 'puts'}
              onClick={() => setActiveTab('puts')}
              className={segmentClass}
            >
              Puts <span className="opacity-70">{puts.length}</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor={selectId} className="text-sm text-pencil">
              Expiry
            </label>
            <select
              id={selectId}
              value={selectedGroup?.expirationDate ?? ''}
              onChange={(event) => setSelectedExpiration(event.target.value)}
              className="h-9 cursor-pointer rounded-md border border-rule bg-sheet px-2 text-sm"
            >
              {groups.map((group) => (
                <option key={group.expirationDate} value={group.expirationDate}>
                  {formatDate(group.expirationDate)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto border-t-2 border-ink">
          <table className="w-full min-w-[52rem] border-separate border-spacing-0 text-sm font-narrow">
            <caption className="sr-only">
              {activeTab === 'calls' ? 'Calls' : 'Puts'} expiring{' '}
              {formatDate(selectedGroup?.expirationDate)}
            </caption>
            <thead>
              <tr>
                {COLUMNS.map((column, index) => (
                  <th
                    key={column}
                    scope="col"
                    className={`sticky top-0 whitespace-nowrap border-b border-rule bg-sheet px-3 py-2 font-semibold ${
                      index === 0
                        ? 'left-0 z-20 text-left shadow-[inset_-1px_0_0_var(--color-rule)]'
                        : 'z-10 text-right'
                    }`}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((opt, index) => (
                <OptionRow
                  key={opt.contractSymbol || index}
                  opt={opt}
                  isCall={activeTab === 'calls'}
                  currentPrice={currentPrice}
                  selectedExpiration={selectedGroup?.expirationDate}
                />
              ))}
            </tbody>
          </table>
        </div>
        <p className="pt-3 text-sm text-pencil">
          Shaded rows are in the money. Delta and probability of profit are
          Black-Scholes estimates at a{' '}
          {formatPercent(RISK_FREE_RATE, { digits: 1 })} risk-free rate.
        </p>
      </div>
    );
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-sheet p-0 text-ink md:m-auto md:h-[85vh] md:max-w-5xl md:rounded-lg md:border md:border-rule"
    >
      <div className="flex h-full flex-col px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-start justify-between gap-4 pb-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-2xl font-bold font-wide">
              {symbol} option chain
            </h2>
            <p className="truncate text-pencil">
              {name}
              {currentPrice != null &&
                `${name ? ', ' : ''}last at ${formatNumber(currentPrice, { min: 2, max: 2 })}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close option chain"
            className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-pencil hover:bg-shade hover:text-ink"
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
            >
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1">{content}</div>
      </div>
    </dialog>
  );
};

YahooFinanceOptionsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  symbol: PropTypes.string,
  name: PropTypes.string,
  currentPrice: PropTypes.number
};

export default YahooFinanceOptionsModal;
