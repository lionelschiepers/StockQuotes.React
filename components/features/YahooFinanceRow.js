import React from 'react';
import PropTypes from 'prop-types';

const YahooFinanceRow = React.memo(
  function YahooFinanceRow({
    index,
    style,
    portfolio,
    displayInEUR,
    renderName,
    renderPrice
  }) {
    if (portfolio === undefined || index >= portfolio.length) return null;

    const item = portfolio[index];

    // Pre-calculate values that depend on displayInEUR to avoid recalculations
    const marketCostValue = displayInEUR ? item.MarketCostEUR : item.MarketCost;
    const marketPriceValue = displayInEUR
      ? item.MarketPriceEUR
      : item.MarketPrice;
    const pastGainValue = displayInEUR ? item.PastGainEUR : item.PastGain;
    const gainValue = item.getGain(displayInEUR);
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
        className={`
          ${
            index % 2 === 0
              ? 'bg-white dark:bg-gray-900'
              : 'bg-gray-50 dark:bg-gray-800'
          } hover:bg-gray-100 dark:hover:bg-gray-700
        `}
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
        <div style={{ flex: '0 0 80px', minWidth: '70px', padding: '6px 5px' }}>
          {renderPrice(item.getDayDiff(), 'Diff', item)}
        </div>
        <div style={{ flex: '0 0 80px', minWidth: '70px', padding: '6px 5px' }}>
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
        <div style={{ flex: '0 0 90px', minWidth: '90px', padding: '6px 5px' }}>
          {renderPrice(gainValue, 'Gain', item)}
        </div>
        <div style={{ flex: '0 0 90px', minWidth: '90px', padding: '6px 5px' }}>
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

YahooFinanceRow.propTypes = {
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
  displayInEUR: PropTypes.bool.isRequired,
  renderName: PropTypes.func.isRequired,
  renderPrice: PropTypes.func.isRequired
};

export default YahooFinanceRow;
