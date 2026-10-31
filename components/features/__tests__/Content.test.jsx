import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import YahooFinance from '../YahooFinance';
import { useAuth0 } from '@auth0/auth0-react';
import { Portfolio } from '../Portfolio';

vi.mock('@auth0/auth0-react');
vi.mock('../Portfolio');

const makePosition = (overrides = {}) => ({
  Ticker: 'AAA',
  Name: 'Alpha',
  Currency: 'EUR',
  NumberOfShares: 10,
  MarketCost: 900,
  MarketCostEUR: 900,
  MarketPrice: 1000,
  MarketPriceEUR: 1000,
  PastGain: 0,
  PastGainEUR: 0,
  Security: { regularMarketPrice: 100 },
  getDayGain: () => 20,
  getDayDiff: () => 2,
  getGain: () => 100,
  getGainDiff: () => 11,
  ...overrides
});

const positions = [
  makePosition(),
  makePosition({
    Ticker: 'BBB',
    Name: 'Beta',
    MarketPrice: 3000,
    MarketPriceEUR: 3000,
    getDayGain: () => -5,
    getDayDiff: () => -0.2
  })
];

describe('YahooFinance', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  beforeEach(() => {
    useAuth0.mockReturnValue({
      isAuthenticated: true,
      user: { email: 'test@test.com' }
    });
    Portfolio.getDayDiff = vi.fn().mockReturnValue(0.004);
    Portfolio.getDividendRatio = vi.fn().mockReturnValue(0);
    Portfolio.getDividendRate = vi.fn().mockReturnValue(0);
  });

  it('renders the skeleton loader initially and then the empty state', async () => {
    Portfolio.Load.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 50))
    );

    vi.useFakeTimers();

    render(<YahooFinance />);

    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(screen.getByText('No transactions yet')).toBeInTheDocument();
    expect(document.querySelector('.animate-pulse')).not.toBeInTheDocument();
  });

  it('renders the skeleton loader when portfolio data is still loading', () => {
    Portfolio.Load.mockReturnValue(new Promise(() => {}));
    render(<YahooFinance />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('explains a failed load and retries on request', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    Portfolio.Load.mockRejectedValueOnce(new Error('Network Error'));
    Portfolio.Load.mockResolvedValueOnce([]);

    render(<YahooFinance />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Your portfolio didn't load"
    );

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('No transactions yet')).toBeInTheDocument();
    expect(Portfolio.Load).toHaveBeenCalledTimes(2);
    console.error.mockRestore();
  });

  it("headlines today's move and the holding that led it", async () => {
    Portfolio.Load.mockResolvedValue(positions);

    render(<YahooFinance />);

    const headline = await screen.findByRole('heading', { level: 1 });
    expect(headline).toHaveTextContent(/^Up .*15.* today$/);
    expect(headline.parentElement).toHaveTextContent(
      /Led by Alpha .*; Beta held it back/
    );
  });

  it('links each band block to the holding on Yahoo Finance', async () => {
    Portfolio.Load.mockResolvedValue(positions);

    render(<YahooFinance />);

    const block = await screen.findByRole('link', { name: /^Beta: .* today/ });
    expect(block).toHaveAttribute(
      'href',
      'https://finance.yahoo.com/quote/BBB'
    );
    expect(block).toHaveAttribute('target', '_blank');
  });

  it('sorts figure columns largest first and toggles on a second click', async () => {
    Portfolio.Load.mockResolvedValue(positions);

    render(<YahooFinance />);

    const valueButton = await screen.findByRole('button', { name: 'Value' });
    const valueHeader = valueButton.closest('th');
    const rowNames = () =>
      screen
        .getAllByRole('rowheader')
        .map((cell) => cell.querySelector('a').textContent);

    expect(valueHeader).not.toHaveAttribute('aria-sort');

    fireEvent.click(valueButton);
    expect(valueHeader).toHaveAttribute('aria-sort', 'descending');
    expect(rowNames()).toEqual(['Beta', 'Alpha']);

    fireEvent.click(valueButton);
    expect(valueHeader).toHaveAttribute('aria-sort', 'ascending');
    expect(rowNames()).toEqual(['Alpha', 'Beta']);
  });
});
