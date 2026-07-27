import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { fetchStockOptions } from './YahooFinanceLoader';
import Loading from '../ui/Loading';

const YahooFinanceOptionsModal = ({ isOpen, onClose, symbol, currentPrice }) => {
  const [optionsData, setOptionsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('calls');
  const [selectedExpiration, setSelectedExpiration] = useState('');

  useEffect(() => {
    if (!isOpen || !symbol) {
      return;
    }

    let isMounted = true;
    const loadOptions = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchStockOptions(symbol);
        if (isMounted) {
          setOptionsData(data);
          if (data.options && data.options.length > 0) {
            setSelectedExpiration(data.options[0].expirationDate);
          } else {
            setSelectedExpiration('');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to fetch options data.');
          console.error(err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadOptions();

    return () => {
      isMounted = false;
    };
  }, [isOpen, symbol]);

  if (!isOpen) return null;

  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';

  const formatNum = (val, minDec = 2, maxDec = 2) => {
    if (val == null || Number.isNaN(val)) return '-';
    return val.toLocaleString(locale, {
      minimumFractionDigits: minDec,
      maximumFractionDigits: maxDec
    });
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const calculateGreeksAndPOP = (opt, isCall, currentPrice) => {
    if (!currentPrice || !opt.strike) return { delta: null, pop: null };

    const S = currentPrice;
    const K = opt.strike;
    const iv = opt.impliedVolatility || 0.30;
    const expiryDateString = opt.expiration || selectedExpiration;
    if (!expiryDateString) return { delta: null, pop: null };

    try {
      const expiryDate = new Date(expiryDateString);
      const today = new Date('2026-05-26'); // Reference date matching standard context
      
      const msPerYear = 365.0 * 24 * 60 * 60 * 1000;
      let T = (expiryDate - today) / msPerYear;
      if (T <= 0) T = 1.0 / (365.0 * 24.0 * 60.0);

      const r = 0.045; // 4.5% Risk Free Rate from OptionsWheel
      const q = 0.0;   // Dividend yield

      const sigmaSqrtT = iv * Math.sqrt(T);
      if (sigmaSqrtT <= 0) return { delta: null, pop: null };

      const d2 = (Math.log(S / K) + (r - q - 0.5 * (iv * iv)) * T) / sigmaSqrtT;
      const d1 = d2 + sigmaSqrtT;

      const erf = (x) => {
        const sign = x >= 0 ? 1 : -1;
        x = Math.abs(x);
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;

        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        return sign * y;
      };

      const normalCDF = (x) => {
        return 0.5 * (1.0 + erf(x / Math.sqrt(2.0)));
      };

      let delta;
      if (isCall) {
        delta = Math.exp(-q * T) * normalCDF(d1);
      } else {
        delta = -Math.exp(-q * T) * normalCDF(-d1);
      }

      let pop;
      if (isCall) {
        pop = normalCDF(-d2);
      } else {
        pop = normalCDF(d2);
      }

      return { delta, pop };
    } catch {
      return { delta: null, pop: null };
    }
  };

  const getSelectedExpirationData = () => {
    if (!optionsData || !optionsData.options) return null;
    return optionsData.options.find(
      (optGroup) => optGroup.expirationDate === selectedExpiration
    ) || optionsData.options[0];
  };

  const selectedGroup = getSelectedExpirationData();

  const getOptionsList = () => {
    if (!selectedGroup) return [];
    const rawList = activeTab === 'calls' ? selectedGroup.calls : selectedGroup.puts;
    return Array.isArray(rawList) ? rawList : [];
  };

  const list = getOptionsList();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-5xl h-[85vh] flex flex-col border border-gray-200 dark:border-gray-700">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Option Chain — {symbol}
            </h3>
            {currentPrice != null && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Underlying Price: <span className="font-semibold text-gray-700 dark:text-gray-300">{formatNum(currentPrice)}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-semibold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loading />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading options contract data...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <span className="text-rose-500 text-3xl mb-2">⚠️</span>
              <p className="text-sm font-semibold text-rose-600 dark:text-rose-450">{error}</p>
              <button 
                onClick={onClose}
                className="mt-4 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-md text-sm transition"
              >
                Close
              </button>
            </div>
          ) : !optionsData || !optionsData.options || optionsData.options.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No options contracts available for {symbol}.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Expiration Dropdown & Option Type Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800 pb-3 mb-4">
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('calls')}
                    className={`px-4 py-2 rounded-md font-medium text-sm transition ${
                      activeTab === 'calls'
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    Calls ({selectedGroup?.calls?.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('puts')}
                    className={`px-4 py-2 rounded-md font-medium text-sm transition ${
                      activeTab === 'puts'
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    Puts ({selectedGroup?.puts?.length || 0})
                  </button>
                </div>

                {optionsData.options && optionsData.options.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <label htmlFor="expiration-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Expiration:
                    </label>
                    <select
                      id="expiration-select"
                      value={selectedExpiration}
                      onChange={(e) => setSelectedExpiration(e.target.value)}
                      className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 p-1.5 focus:outline-none font-sans font-semibold"
                    >
                      {optionsData.options.map((grp) => (
                        <option key={grp.expirationDate} value={grp.expirationDate} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                          {formatDate(grp.expirationDate)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Table Container */}
              <div className="flex-1 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs font-mono">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 sticky top-0">
                    <tr>
                      <th scope="col" className="py-2.5 px-3 text-left font-semibold">Expiry</th>
                      <th scope="col" className="py-2.5 px-3 text-left font-semibold">Strike</th>
                      <th scope="col" className="py-2.5 px-3 text-right font-semibold">Last Price</th>
                      <th scope="col" className="py-2.5 px-3 text-right font-semibold">Bid</th>
                      <th scope="col" className="py-2.5 px-3 text-right font-semibold">Ask</th>
                      <th scope="col" className="py-2.5 px-3 text-right font-semibold">Spread %</th>
                      <th scope="col" className="py-2.5 px-3 text-right font-semibold">Change %</th>
                      <th scope="col" className="py-2.5 px-3 text-right font-semibold">Volume</th>
                      <th scope="col" className="py-2.5 px-3 text-right font-semibold">Open Interest</th>
                      <th scope="col" className="py-2.5 px-3 text-right font-semibold">Implied Vol.</th>
                      <th scope="col" className="py-2.5 px-3 text-right font-semibold">Delta (Δ)</th>
                      <th scope="col" className="py-2.5 px-3 text-right font-semibold">Prob. Profit</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                    {list.map((opt, idx) => {
                      const strike = opt.strike;
                      const isITM = activeTab === 'calls'
                        ? currentPrice != null && strike < currentPrice
                        : currentPrice != null && strike > currentPrice;

                      const isPositiveChange = opt.percentChange > 0;
                      const isNegativeChange = opt.percentChange < 0;

                      const { delta, pop } = calculateGreeksAndPOP(opt, activeTab === 'calls', currentPrice);

                      const bid = opt.bid || 0;
                      const ask = opt.ask || 0;
                      const mid = (bid + ask) / 2;
                      const spreadPct = mid > 0 ? ((ask - bid) / mid) * 100 : null;

                      return (
                        <tr
                          key={`${opt.contractSymbol || idx}`}
                          className={`hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-colors ${
                            isITM ? 'bg-amber-500/5 dark:bg-amber-500/10' : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-gray-900 dark:text-gray-300">
                            {opt.expiration ? formatDate(opt.expiration) : '-'}
                          </td>
                          <td className={`py-2 px-3 font-semibold ${
                            isITM ? 'text-amber-600 dark:text-amber-400' : 'text-gray-950 dark:text-white'
                          }`}>
                            {formatNum(strike)}
                          </td>
                          <td className="py-2 px-3 text-right text-gray-900 dark:text-gray-300">
                            {formatNum(opt.lastPrice)}
                          </td>
                          <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                            {formatNum(opt.bid)}
                          </td>
                          <td className="py-2 px-3 text-right text-rose-600 dark:text-rose-450 font-semibold">
                            {formatNum(opt.ask)}
                          </td>
                          <td className={`py-2 px-3 text-right font-semibold ${
                            spreadPct == null
                              ? 'text-gray-600 dark:text-gray-400'
                              : spreadPct < 20
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-450'
                          }`}>
                            {spreadPct != null ? `${formatNum(spreadPct, 1, 1)}%` : '-'}
                          </td>
                          <td className={`py-2 px-3 text-right font-medium ${
                            isPositiveChange
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isNegativeChange
                                ? 'text-rose-600 dark:text-rose-450'
                                : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {opt.percentChange != null ? `${opt.percentChange > 0 ? '+' : ''}${formatNum(opt.percentChange)}%` : '-'}
                          </td>
                          <td className="py-2 px-3 text-right text-gray-900 dark:text-gray-300">
                            {opt.volume != null ? formatNum(opt.volume, 0, 0) : '-'}
                          </td>
                          <td className="py-2 px-3 text-right text-gray-900 dark:text-gray-300">
                            {opt.openInterest != null ? formatNum(opt.openInterest, 0, 0) : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-purple-650 dark:text-purple-400">
                            {opt.impliedVolatility != null ? `${formatNum(opt.impliedVolatility * 100, 1, 1)}%` : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-blue-600 dark:text-blue-400">
                            {delta != null ? formatNum(delta, 2, 2) : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-teal-600 dark:text-teal-400">
                            {pop != null ? `${formatNum(pop * 100, 1, 1)}%` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md font-semibold text-sm shadow transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

YahooFinanceOptionsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  symbol: PropTypes.string,
  currentPrice: PropTypes.number
};

export default YahooFinanceOptionsModal;
