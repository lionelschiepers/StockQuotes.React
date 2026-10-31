import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useAuth0 } from '@auth0/auth0-react';
import { Portfolio } from './Portfolio';
import SkeletonLoader from '../ui/SkeletonLoader';
import PortfolioSummary from './PortfolioSummary';
import PortfolioTable from './PortfolioTable';
import YahooFinanceOptionsModal from './YahooFinanceOptionsModal';

const PORTFOLIO_BASE_URL =
  'https://raw.githubusercontent.com/lionelschiepers/StockQuote.Portfolio/main/Portfolio/';

function describeLoadError(error, email) {
  if (error?.response?.status === 404) {
    return `No portfolio file was found for ${email}. Add ${email}.csv to the StockQuote.Portfolio repository, then try again.`;
  }
  const detail = error?.message ? ` (${error.message})` : '';
  return `The portfolio file or the price service couldn't be reached${detail}. Check your connection, then try again.`;
}

function Notice({ title, children, role }) {
  return (
    <section role={role} className="max-w-[60ch] pt-14">
      <h1 className="text-display font-bold font-wide">{title}</h1>
      <div className="mt-4 text-lg leading-relaxed">{children}</div>
    </section>
  );
}

Notice.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  role: PropTypes.string
};

const YahooFinance = () => {
  const { isAuthenticated, user } = useAuth0();
  const email = user?.email;

  const [load, setLoad] = useState({
    status: 'loading',
    positions: [],
    error: null
  });
  const [attempt, setAttempt] = useState(0);
  const [optionTarget, setOptionTarget] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !email) return undefined;

    let cancelled = false;
    const loadPortfolio = async () => {
      setLoad((previous) => ({ ...previous, status: 'loading', error: null }));
      try {
        const positions = await Portfolio.Load(
          `${PORTFOLIO_BASE_URL}${encodeURIComponent(email)}.csv`
        );
        if (!cancelled) {
          setLoad({ status: 'ready', positions, error: null });
        }
      } catch (error) {
        console.error('Failed to load portfolio:', error);
        if (!cancelled) {
          setLoad({ status: 'error', positions: [], error });
        }
      }
    };

    void loadPortfolio();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, email, attempt]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  const openOptions = useCallback((position) => {
    setOptionTarget({
      symbol: position.Ticker,
      name: position.Name,
      price: position.Security?.regularMarketPrice ?? null
    });
  }, []);

  let content;
  if (load.status === 'loading') {
    content = <SkeletonLoader />;
  } else if (load.status === 'error') {
    content = (
      <Notice title="Your portfolio didn't load" role="alert">
        <p>{describeLoadError(load.error, email)}</p>
        <button
          type="button"
          onClick={retry}
          className="mt-6 h-10 cursor-pointer rounded-md bg-ink px-4 font-medium text-paper hover:opacity-90"
        >
          Try again
        </button>
      </Notice>
    );
  } else if (load.positions.length === 0) {
    content = (
      <Notice title="No transactions yet">
        <p>
          Your portfolio file ({email}.csv) has no buy or sell rows. Add a
          transaction to it and your holdings will appear here.
        </p>
      </Notice>
    );
  } else {
    content = (
      <>
        <PortfolioSummary positions={load.positions} />
        <PortfolioTable
          positions={load.positions}
          onOpenOptions={openOptions}
        />
      </>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
      {content}
      <YahooFinanceOptionsModal
        key={optionTarget?.symbol ?? 'closed'}
        isOpen={optionTarget !== null}
        symbol={optionTarget?.symbol}
        name={optionTarget?.name}
        currentPrice={optionTarget?.price ?? undefined}
        onClose={() => setOptionTarget(null)}
      />
    </main>
  );
};

export default YahooFinance;
