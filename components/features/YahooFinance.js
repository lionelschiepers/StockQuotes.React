import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { List } from 'react-window';
import { useAuth0 } from '@auth0/auth0-react';
import { Portfolio } from './Portfolio';
import { CSVLink } from 'react-csv';
import SkeletonLoader from '../ui/SkeletonLoader';

const YahooFinance = () => {
  const { isAuthenticated, user } = useAuth0();

  const [portfolio, setPortfolio] = useState([]);
  const [marketCost, setMarketCost] = useState(0);
  const [marketPrice, setMarketPrice] = useState(0);
  const [pastGain, setPastGain] = useState(0);
  const [gain, setGain] = useState(0);
  const [dayDiff, setDayDiff] = useState(0);
  const [dividendYield, setDividendYield] = useState(0);
  const [dividendRate, setDividendRate] = useState(0);
  const [sortBy, setSortBy] = useState(null);
  const [sortDirection, setSortDirection] = useState(null);
  const [displayInEUR, setDisplayInEUR] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [minDisplayTime, setMinDisplayTime] = useState(Date.now()); // Initialize with current time

  // Load portfolio data when component mounts or user changes
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadPortfolio = async () => {
      setIsLoading(true);
      setMinDisplayTime(Date.now()); // Track when loading started
      try {
        const portfolioUri = `https://raw.githubusercontent.com/lionelschiepers/StockQuote.Portfolio/main/Portfolio/${encodeURIComponent(user.email)}.csv`;

        const portfolioData = await Portfolio.Load(portfolioUri);
        setPortfolio(portfolioData);

        let totalMarketCost = 0;
        let totalMarketPrice = 0;
        let totalPastGain = 0;

        portfolioData.forEach((position) => {
          totalPastGain += position.PastGainEUR;

          if (!Number.isNaN(position.MarketCostEUR)) {
            totalMarketCost += position.MarketCostEUR;
          }
          if (!Number.isNaN(position.MarketPriceEUR)) {
            totalMarketPrice += position.MarketPriceEUR;
          }
        });

        const totalGain =
          totalMarketCost === 0 ? 0 : totalMarketPrice / totalMarketCost - 1.0;
        const totalDayDiff = Portfolio.getDayDiff(portfolioData);
        const totalDividendYield = Portfolio.getDividendRatio(portfolioData);
        const totalDividendRate = Portfolio.getDividendRate(portfolioData);

        setMarketCost(totalMarketCost);
        setMarketPrice(totalMarketPrice);
        setGain(totalGain);
        setPastGain(totalPastGain);
        setDayDiff(totalDayDiff);
        setDividendYield(totalDividendYield);
        setDividendRate(totalDividendRate);
      } catch (error) {
        console.error('Failed to load portfolio:', error);
      } finally {
        // Ensure skeleton shows for at least 2 seconds
        const loadTime = Date.now() - minDisplayTime;
        if (loadTime < 2000) {
          setTimeout(() => setIsLoading(false), 2000 - loadTime);
        } else {
          setIsLoading(false);
        }
      }
    };

    loadPortfolio();
  }, [isAuthenticated, user, minDisplayTime]);

  // Sort functionality
  const internalSort = useCallback(
    (list, sortByField, direction) => {
      let orderedList = [...list].sort((a, b) => {
        // For Name sorting, don't apply special handling for zero shares
        if (sortByField === 'Name') {
          const aName = a.Name.toLowerCase();
          const bName = b.Name.toLowerCase();
          return aName.localeCompare(bName);
        }

        // For all other fields, put zero shares at the end
        if (a.NumberOfShares === 0 && sortByField !== 'Name') {
          return direction === 'DESC' ? -Infinity : Infinity;
        }
        if (b.NumberOfShares === 0 && sortByField !== 'Name') {
          return direction === 'DESC' ? Infinity : -Infinity;
        }

        let aValue, bValue;

        if (sortByField === 'Security.regularMarketPrice') {
          aValue = a.Security?.regularMarketPrice || 0;
          bValue = b.Security?.regularMarketPrice || 0;
        } else if (sortByField === 'Diff') {
          aValue = a.getDayDiff();
          bValue = b.getDayDiff();

          if (a.NumberOfShares === 0) aValue = null;
          if (b.NumberOfShares === 0) bValue = null;

          if (aValue == null && direction === 'DESC') {
            aValue = -100000000; // always at the bottom
          }
          if (bValue == null && direction === 'DESC') {
            bValue = -100000000; // always at the bottom
          }
        } else if (sortByField === 'GainPercent') {
          aValue = a.getGainDiff();
          bValue = b.getGainDiff();

          if (a.NumberOfShares === 0) aValue = null;
          if (b.NumberOfShares === 0) bValue = null;

          if (aValue == null && direction === 'DESC') {
            aValue = -100000000; // always at the bottom
          }
          if (bValue == null && direction === 'DESC') {
            bValue = -100000000; // always at the bottom
          }
        } else if (sortByField === 'Gain') {
          aValue = a.getGain(displayInEUR);
          bValue = b.getGain(displayInEUR);
        } else {
          aValue = a[sortByField];
          bValue = b[sortByField];
        }

        // Handle string comparisons
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return aValue.toLowerCase().localeCompare(bValue.toLowerCase());
        }

        // Handle null values
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return direction === 'DESC' ? 1 : -1;
        if (bValue == null) return direction === 'DESC' ? -1 : 1;

        return aValue - bValue;
      });

      if (direction === 'DESC') {
        orderedList = orderedList.reverse();
      }
      return orderedList;
    },
    [displayInEUR]
  );

  const handleSort = useCallback(
    ({ sortBy: sortByField, sortDirection: direction }) => {
      const orderedList = internalSort(portfolio, sortByField, direction);
      setPortfolio(orderedList);
      setSortBy(sortByField);
      setSortDirection(direction);
    },
    [portfolio, internalSort]
  );

  // Helper function to format values in K€ with French dot separators
  const formatInKEur = useCallback((value) => {
    if (value == null || isNaN(value)) return '';
    const kValue = value / 1000;
    // Format with French locale and replace spaces with dots, then add K€
    return (
      kValue
        .toLocaleString('fr-FR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        })
        .replace(' ', '.') + ' K€'
    );
  }, []);

  // Price rendering function
  const renderPrice = useCallback(
    (cellData, dataKey, rowData) => {
      if (isNaN(cellData)) return <div />;
      let postData = '';

      if (
        dataKey === 'Security.regularMarketPrice' &&
        rowData.Security != null
      ) {
        if (cellData != null) postData = rowData.Currency;
      }

      if (dataKey === 'NumberOfShares') {
        return <div>{cellData == null ? '' : cellData.toFixed(0)}</div>;
      }

      if (dataKey === 'Diff') {
        let price =
          rowData.Security == null ? null : rowData.Security.regularMarketPrice;
        let previousPrice =
          rowData.Security == null
            ? null
            : rowData.Security.regularMarketPreviousClose;
        if (price == null || previousPrice == null) return <div />;

        cellData = 100.0 * (price / previousPrice - 1.0);
        postData = '%';
      }

      if (dataKey === 'GainPercent') {
        postData = '%';
      }

      if (dataKey === 'MarketCost' && displayInEUR) {
        cellData = rowData.MarketCostEUR;
      }
      if (dataKey === 'MarketPrice' && displayInEUR) {
        cellData = rowData.MarketPriceEUR;
      }
      if (dataKey === 'PastGain' && displayInEUR) {
        cellData = rowData.PastGainEUR;
      }

      if (
        (dataKey === 'MarketCost' || dataKey === 'MarketPrice') &&
        cellData === 0
      ) {
        cellData = null;
      }

      // Format Market Cost, Market Price and Gain columns with separators but no decimals
      const shouldRemoveDecimals =
        dataKey === 'MarketCost' ||
        dataKey === 'MarketPrice' ||
        dataKey === 'Gain';

      let displayValue = '';
      if (cellData != null) {
        if (shouldRemoveDecimals) {
          // Use toLocaleString to add separators, then remove any decimal part
          displayValue = Math.round(cellData).toLocaleString('fr-FR');
        } else {
          displayValue = cellData.toFixed(2).replace('.', ','); // French decimal format
        }
      }

      return (
        <div>
          {displayValue} {postData}
        </div>
      );
    },
    [displayInEUR]
  );

  // Name rendering function
  const renderName = useCallback((rowData) => {
    return (
      <a
        className="stockName"
        target="_blank"
        rel="noopener noreferrer"
        href={`https://finance.yahoo.com/quote/${rowData.Ticker}`}
      >
        {rowData.Name}
      </a>
    );
  }, []);

  // Toggle EUR display
  const handleCheck = useCallback(() => {
    setDisplayInEUR((prev) => !prev);
  }, []);

  // Memoized row component
  const RowComponent = React.memo(
    function YahooFinanceRow({
      index,
      style,
      portfolio: portfolioProp,
      displayInEUR: displayEUR
    }) {
      if (typeof portfolioProp === 'undefined' || index >= portfolioProp.length)
        return null;

      const item = portfolioProp[index];

      // Pre-calculate values that depend on displayInEUR to avoid recalculations
      const marketCostValue = displayEUR ? item.MarketCostEUR : item.MarketCost;
      const marketPriceValue = displayEUR
        ? item.MarketPriceEUR
        : item.MarketPrice;
      const pastGainValue = displayEUR ? item.PastGainEUR : item.PastGain;
      const gainValue = item.getGain(displayEUR);
      const gainDiffValue = item.getGainDiff();

      return (
        <div
          style={{
            ...(style || {}),
            display: 'flex',
            alignItems: 'center',
            minWidth: 'max-content'
          }}
          className={index % 2 === 0 ? 'evenRow' : 'oddRow'}
        >
          <div
            style={{ flex: '0 0 350px', minWidth: '200px', padding: '6px 5px' }}
          >
            {renderName(item)}
          </div>
          <div
            style={{ flex: '0 0 110px', minWidth: '70px', padding: '6px 5px' }}
          >
            {renderPrice(
              item.Security?.regularMarketPrice,
              'Security.regularMarketPrice',
              item
            )}
          </div>
          <div
            style={{ flex: '0 0 80px', minWidth: '70px', padding: '6px 5px' }}
          >
            {renderPrice(item.getDayDiff(), 'Diff', item)}
          </div>
          <div
            style={{ flex: '0 0 80px', minWidth: '70px', padding: '6px 5px' }}
          >
            {renderPrice(item.NumberOfShares, 'NumberOfShares', item)}
          </div>
          <div
            style={{ flex: '0 0 120px', minWidth: '100px', padding: '6px 5px' }}
          >
            {renderPrice(marketCostValue, 'MarketCost', item)}
          </div>
          <div
            style={{ flex: '0 0 130px', minWidth: '100px', padding: '6px 5px' }}
          >
            {renderPrice(marketPriceValue, 'MarketPrice', item)}
          </div>
          <div
            style={{ flex: '0 0 90px', minWidth: '90px', padding: '6px 5px' }}
          >
            {renderPrice(gainValue, 'Gain', item)}
          </div>
          <div
            style={{ flex: '0 0 90px', minWidth: '90px', padding: '6px 5px' }}
          >
            {renderPrice(gainDiffValue, 'GainPercent', item)}
          </div>
          <div
            style={{ flex: '0 0 120px', minWidth: '100px', padding: '6px 5px' }}
          >
            {renderPrice(pastGainValue, 'PastGain', item)}
          </div>
        </div>
      );
    },
    (prevProps, nextProps) => {
      // Custom comparison function to prevent unnecessary re-renders
      return (
        prevProps.displayInEUR === nextProps.displayInEUR &&
        prevProps.index === nextProps.index &&
        prevProps.portfolio[prevProps.index] ===
          nextProps.portfolio[nextProps.index] &&
        prevProps.style?.top === nextProps.style?.top
      );
    }
  );

  // Memoized sort indicator
  const getSortIndicator = useCallback(
    (field) => {
      if (sortBy === field && sortDirection === 'ASC') return '↑';
      if (sortBy === field && sortDirection === 'DESC') return '↓';
      return '';
    },
    [sortBy, sortDirection]
  );

  // Create sort handler for each column
  const createSortHandler = useCallback(
    (field) => {
      return () => {
        const newDirection =
          sortBy === field && sortDirection === 'ASC' ? 'DESC' : 'ASC';
        handleSort({ sortBy: field, sortDirection: newDirection });
      };
    },
    [sortBy, sortDirection, handleSort]
  );

  if (isLoading) {
    return <SkeletonLoader />;
  }

  return (
    <div className="yahoo-finance-container bg-white dark:bg-gray-800 p-4 rounded-lg">
      <div className="text-left mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-gray-900 dark:text-white">
              Market Price:{' '}
              <span className="font-semibold">{formatInKEur(marketPrice)}</span>
            </div>
            <div className="text-gray-900 dark:text-white">
              Market Cost:{' '}
              <span className="font-semibold">{formatInKEur(marketCost)}</span>
            </div>
            <div className="text-gray-900 dark:text-white">
              Total Gain:{' '}
              <span className="font-semibold">
                {(gain * 100.0).toFixed(2)}%
              </span>
            </div>
            <div className="text-gray-900 dark:text-white">
              Day diff:{' '}
              <span className="font-semibold">
                {(dayDiff * 100.0).toFixed(2)}%
              </span>
            </div>
            <div className="text-gray-900 dark:text-white">
              Past Gain:{' '}
              <span className="font-semibold">{formatInKEur(pastGain)}</span>
            </div>
            <div className="text-gray-900 dark:text-white">
              Dividend Yield:{' '}
              <span className="font-semibold">{dividendYield.toFixed(2)}%</span>{' '}
              (
              <span className="font-semibold">
                {formatInKEur(dividendRate)}
              </span>
              )
            </div>
          </div>
          <div className="text-right">
            <CSVLink
              data={portfolio}
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Download data
            </CSVLink>
          </div>
        </div>
      </div>
      <div className="text-left mb-4">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            onChange={handleCheck}
            checked={displayInEUR}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          />
          <span className="text-gray-700 dark:text-gray-300">
            Display in EUR
          </span>
        </label>
      </div>
      <div className="yahoo-finance-table-wrapper">
        <div className="flex font-bold border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">
          <div
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1"
            style={{ flex: '0 0 350px', minWidth: '200px' }}
            onClick={createSortHandler('Name')}
          >
            Name {getSortIndicator('Name')}
          </div>
          <div
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1"
            style={{ flex: '0 0 110px', minWidth: '70px' }}
            onClick={createSortHandler('Security.regularMarketPrice')}
          >
            Price {getSortIndicator('Security.regularMarketPrice')}
          </div>
          <div
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1"
            style={{ flex: '0 0 80px', minWidth: '70px' }}
            onClick={createSortHandler('Diff')}
          >
            Diff {getSortIndicator('Diff')}
          </div>
          <div
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1"
            style={{ flex: '0 0 80px', minWidth: '70px' }}
            onClick={createSortHandler('NumberOfShares')}
          >
            Shares {getSortIndicator('NumberOfShares')}
          </div>
          <div
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1"
            style={{ flex: '0 0 120px', minWidth: '100px' }}
            onClick={createSortHandler('MarketCost')}
          >
            Market Cost {getSortIndicator('MarketCost')}
          </div>
          <div
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1"
            style={{ flex: '0 0 130px', minWidth: '100px' }}
            onClick={createSortHandler('MarketPrice')}
          >
            Market Price {getSortIndicator('MarketPrice')}
          </div>
          <div
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1"
            style={{ flex: '0 0 90px', minWidth: '90px' }}
            onClick={createSortHandler('Gain')}
          >
            Gain {getSortIndicator('Gain')}
          </div>
          <div
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1"
            style={{ flex: '0 0 90px', minWidth: '90px' }}
            onClick={createSortHandler('GainPercent')}
          >
            Gain % {getSortIndicator('GainPercent')}
          </div>
          <div
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1"
            style={{ flex: '0 0 120px', minWidth: '100px' }}
            onClick={createSortHandler('PastGain')}
          >
            Past Gain {getSortIndicator('PastGain')}
          </div>
        </div>
      </div>
      <div className="yahoo-finance-table-wrapper">
        <List
          className="react-window-list"
          rowComponent={RowComponent}
          rowCount={portfolio.length}
          rowHeight={32}
          height={600}
          rowProps={{ portfolio, displayInEUR }}
        />
      </div>
    </div>
  );
};

export default YahooFinance;
