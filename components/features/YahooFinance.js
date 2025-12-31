import React, { useState, useEffect, useCallback } from 'react';
import { List } from 'react-window';
import { useAuth0 } from '@auth0/auth0-react';
import { Portfolio } from './Portfolio';
import { CSVLink } from 'react-csv';
import SkeletonLoader from '../ui/SkeletonLoader';
import PropTypes from 'prop-types';

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

  // Load portfolio data when component mounts or user changes
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadPortfolio = async () => {
      setIsLoading(true);
      const startTime = Date.now(); // Track when loading started
      try {
        const portfolioUri = `https://raw.githubusercontent.com/lionelschiepers/StockQuote.Portfolio/main/Portfolio/${encodeURIComponent(
          user.email
        )}.csv`;

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
          totalMarketCost === 0 ? 0 : totalMarketPrice / totalMarketCost - 1;
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
        const loadTime = Date.now() - startTime;
        if (loadTime < 2000) {
          setTimeout(() => setIsLoading(false), 2000 - loadTime);
        } else {
          setIsLoading(false);
        }
      }
    };

    loadPortfolio();
  }, [isAuthenticated, user]);

  // Sort functionality
  const getSortValue = useCallback(
    (item, sortByField) => {
      switch (sortByField) {
        case 'Security.regularMarketPrice':
          return item.Security?.regularMarketPrice || 0;
        case 'Diff':
          return item.getDayDiff();
        case 'GainPercent':
          return item.getGainDiff();
        case 'Gain':
          return item.getGain(displayInEUR);
        default:
          return item[sortByField];
      }
    },
    [displayInEUR]
  );

  const internalSort = useCallback(
    (list, sortByField, direction) => {
      const sortedList = [...list].sort((a, b) => {
        // Special handling for 'Name' field (no zero shares consideration)
        if (sortByField === 'Name') {
          const aName = a.Name.toLowerCase();
          const bName = b.Name.toLowerCase();
          return direction === 'ASC'
            ? aName.localeCompare(bName)
            : bName.localeCompare(aName);
        }

        // Handle positions with zero shares: they should always appear at the end
        const aHasZeroShares = a.NumberOfShares === 0;
        const bHasZeroShares = b.NumberOfShares === 0;

        if (aHasZeroShares && !bHasZeroShares) {
          return 1; // 'a' (zero shares) goes after 'b'
        }
        if (!aHasZeroShares && bHasZeroShares) {
          return -1; // 'a' goes before 'b' (zero shares)
        }
        if (aHasZeroShares && bHasZeroShares) {
          // If both have zero shares, sort them by name for stable ordering among themselves
          const aName = a.Name.toLowerCase();
          const bName = b.Name.toLowerCase();
          return direction === 'ASC'
            ? aName.localeCompare(bName)
            : bName.localeCompare(aName);
        }

        // Get comparison values using the helper
        let aValue = getSortValue(a, sortByField, displayInEUR);
        let bValue = getSortValue(b, sortByField, displayInEUR);

        // Handle potential null/undefined values after getSortValue
        // Null/undefined values should go to the end
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1; // a is null, goes after b
        if (bValue == null) return -1; // b is null, goes after a

        // Handle string comparisons
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return direction === 'ASC'
            ? aValue.toLowerCase().localeCompare(bValue.toLowerCase())
            : bValue.toLowerCase().localeCompare(aValue.toLowerCase());
        }

        // Numeric comparison
        return direction === 'ASC' ? aValue - bValue : bValue - aValue;
      });

      return sortedList;
    },
    [displayInEUR, getSortValue]
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
    if (value == null || Number.isNaN(value)) return '';
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

  // Helper function to calculate cell data and post data
  const calculateCellDataAndPostData = useCallback(
    (initialCellData, dataKey, rowData) => {
      let cellData = initialCellData;
      let postData = '';

      if (
        dataKey === 'Security.regularMarketPrice' &&
        rowData.Security != null &&
        cellData != null
      ) {
        postData = rowData.Currency;
      } else if (dataKey === 'Diff') {
        const price = rowData.Security?.regularMarketPrice;
        const previousPrice = rowData.Security?.regularMarketPreviousClose;
        if (price == null || previousPrice == null) {
          return { cellData: NaN, postData: '' };
        }
        cellData = 100 * (price / previousPrice - 1);
        postData = '%';
      } else if (dataKey === 'GainPercent') {
        postData = '%';
      } else if (dataKey === 'MarketCost' && displayInEUR) {
        cellData = rowData.MarketCostEUR;
      } else if (dataKey === 'MarketPrice' && displayInEUR) {
        cellData = rowData.MarketPriceEUR;
      } else if (dataKey === 'PastGain' && displayInEUR) {
        cellData = rowData.PastGainEUR;
      }

      if (
        (dataKey === 'MarketCost' || dataKey === 'MarketPrice') &&
        cellData === 0
      ) {
        cellData = null;
      }

      return { cellData, postData };
    },
    [displayInEUR]
  );

  // Helper function to format display value
  const formatDisplayValue = useCallback((value, dataKey) => {
    if (value == null) return '';

    const shouldRemoveDecimals =
      dataKey === 'MarketCost' ||
      dataKey === 'MarketPrice' ||
      dataKey === 'Gain';

    if (shouldRemoveDecimals) {
      return Math.round(value).toLocaleString('fr-FR');
    } else {
      return value.toLocaleString('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      });
    }
  }, []);

  // Price rendering function
  const renderPrice = useCallback(
    (initialCellData, dataKey, rowData) => {
      if (Number.isNaN(initialCellData)) return <div />;

      // Handle NumberOfShares early as it has a distinct rendering format
      if (dataKey === 'NumberOfShares') {
        return (
          <div>{initialCellData == null ? '' : initialCellData.toFixed(0)}</div>
        );
      }

      const { cellData, postData } = calculateCellDataAndPostData(
        initialCellData,
        dataKey,
        rowData,
        displayInEUR
      );

      if (Number.isNaN(cellData)) return <div />; // If calculation resulted in NaN (e.g., price data missing for 'Diff')

      const displayValue = formatDisplayValue(cellData, dataKey);

      return (
        <div>
          {displayValue} {postData}
        </div>
      );
    },
    [displayInEUR, calculateCellDataAndPostData, formatDisplayValue]
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
      if (portfolioProp === undefined || index >= portfolioProp.length)
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
          role="listitem"
          style={{
            ...style,
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

  RowComponent.propTypes = {
    index: PropTypes.number.isRequired,
    style: PropTypes.object, // style can be optional based on React Window's usage
    portfolio: PropTypes.arrayOf(
      PropTypes.shape({
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
        RateToEUR: PropTypes.number,
        Security: PropTypes.shape({
          regularMarketPrice: PropTypes.number,
          regularMarketPreviousClose: PropTypes.number,
          trailingAnnualDividendRate: PropTypes.number
        }),
        getGain: PropTypes.func,
        getGainDiff: PropTypes.func,
        getDayDiff: PropTypes.func,
        getDividendYield: PropTypes.func,
        getTaxeRate: PropTypes.func
      })
    ).isRequired,
    displayInEUR: PropTypes.bool.isRequired
  };

  // Memoized sort indicator
  const getSortIndicator = useCallback(
    (field) => {
      if (sortBy === field && sortDirection === 'ASC') return '↑';
      if (sortBy === field && sortDirection === 'DESC') return '↓';
      return '';
    },
    [sortBy, sortDirection]
  );

  const handleKeyDown = (onClick) => (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      onClick();
    }
  };

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
    <main className="yahoo-finance-container bg-white dark:bg-gray-800 p-4 rounded-lg">
      <div className="text-left mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-gray-900 dark:text-white">
              Market Price:&nbsp;{/* prettier-ignore */}
              <span className="font-semibold">{formatInKEur(marketPrice)}</span>
            </div>
            <div className="text-gray-900 dark:text-white">
              Market Cost:&nbsp;{/* prettier-ignore */}
              <span className="font-semibold">{formatInKEur(marketCost)}</span>
            </div>
            <div className="text-gray-900 dark:text-white">
              Total Gain:&nbsp;{/* prettier-ignore */}
              <span className="font-semibold">
                {(gain * 100).toLocaleString('fr-FR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
                %
              </span>
            </div>
            <div className="text-gray-900 dark:text-white">
              Day diff:&nbsp;{/* prettier-ignore */}
              <span className="font-semibold">
                {(dayDiff * 100).toLocaleString('fr-FR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
                %
              </span>
            </div>
            <div className="text-gray-900 dark:text-white">
              {/* prettier-ignore */}
              Past Gain:&nbsp;
              <span className="font-semibold">{formatInKEur(pastGain)}</span>
            </div>
            <div className="text-gray-900 dark:text-white">
              {/* prettier-ignore */}
              Dividend Yield:&nbsp;
              <span className="font-semibold">
                {dividendYield.toLocaleString('fr-FR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
                %
              </span>
              ({/* prettier-ignore */}
              <span className="font-semibold">
                {formatInKEur(dividendRate)}
              </span>
              {/* prettier-ignore */})
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
          <button
            type="button"
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1"
            style={{ flex: '0 0 350px', minWidth: '200px' }}
            onClick={createSortHandler('Name')}
            onKeyDown={handleKeyDown(createSortHandler('Name'))}
          >
            Name {getSortIndicator('Name')}
          </button>
          <button
            type="button"
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1"
            style={{ flex: '0 0 110px', minWidth: '70px' }}
            onClick={createSortHandler('Security.regularMarketPrice')}
            onKeyDown={handleKeyDown(
              createSortHandler('Security.regularMarketPrice')
            )}
          >
            Price {getSortIndicator('Security.regularMarketPrice')}
          </button>
          <button
            type="button"
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1"
            style={{ flex: '0 0 80px', minWidth: '70px' }}
            onClick={createSortHandler('Diff')}
            onKeyDown={handleKeyDown(createSortHandler('Diff'))}
          >
            Diff {getSortIndicator('Diff')}
          </button>
          <button
            type="button"
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1"
            style={{ flex: '0 0 80px', minWidth: '70px' }}
            onClick={createSortHandler('NumberOfShares')}
            onKeyDown={handleKeyDown(createSortHandler('NumberOfShares'))}
          >
            Shares {getSortIndicator('NumberOfShares')}
          </button>
          <button
            type="button"
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1"
            style={{ flex: '0 0 120px', minWidth: '100px' }}
            onClick={createSortHandler('MarketCost')}
            onKeyDown={handleKeyDown(createSortHandler('MarketCost'))}
          >
            Market Cost {getSortIndicator('MarketCost')}
          </button>
          <button
            type="button"
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1"
            style={{ flex: '0 0 130px', minWidth: '100px' }}
            onClick={createSortHandler('MarketPrice')}
            onKeyDown={handleKeyDown(createSortHandler('MarketPrice'))}
          >
            Market Price {getSortIndicator('MarketPrice')}
          </button>
          <button
            type="button"
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1"
            style={{ flex: '0 0 90px', minWidth: '90px' }}
            onClick={createSortHandler('Gain')}
            onKeyDown={handleKeyDown(createSortHandler('Gain'))}
          >
            Gain {getSortIndicator('Gain')}
          </button>
          <button
            type="button"
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1"
            style={{ flex: '0 0 90px', minWidth: '90px' }}
            onClick={createSortHandler('GainPercent')}
            onKeyDown={handleKeyDown(createSortHandler('GainPercent'))}
          >
            Gain % {getSortIndicator('GainPercent')}
          </button>
          <button
            type="button"
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1"
            style={{ flex: '0 0 120px', minWidth: '100px' }}
            onClick={createSortHandler('PastGain')}
            onKeyDown={handleKeyDown(createSortHandler('PastGain'))}
          >
            Past Gain {getSortIndicator('PastGain')}
          </button>
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
    </main>
  );
};

export default YahooFinance;
