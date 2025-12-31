import React from 'react';
import { render, screen, act } from '@testing-library/react';
import Content from '../Content';
import { useAuth0 } from '@auth0/auth0-react';
import { Portfolio } from '../Portfolio';

jest.mock('@auth0/auth0-react');
jest.mock('../Portfolio');

describe('Content', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers(); // Ensure real timers are restored after each test
  });

  beforeEach(() => {
    // Mock general return values for useAuth0
    useAuth0.mockReturnValue({
      isAuthenticated: true,
      user: { email: 'test@test.com' }
    });
    // Mock Portfolio methods
    Portfolio.getDayDiff = jest.fn().mockReturnValue(0);
    Portfolio.getDividendRatio = jest.fn().mockReturnValue(0);
    Portfolio.getDividendRate = jest.fn().mockReturnValue(0);
  });

  it('renders the skeleton loader initially and then the portfolio content', async () => {
    // Mock Portfolio.Load to resolve after a delay
    Portfolio.Load.mockResolvedValue([]);

    jest.useFakeTimers();

    const { container } = render(<Content />);

    // Initially, the skeleton loader should be visible
    expect(screen.getByText('Loading portfolio data')).toBeInTheDocument();

    // Advance timers past the minimum loading time (2000ms)
    await act(async () => {
      jest.advanceTimersByTime(2000);
      // Ensure all microtasks are resolved after timer advancement
      await Promise.resolve();
    });

    // After loading, the portfolio content should be visible
    expect(screen.getByText('Market Price:')).toBeInTheDocument();
    // The skeleton loader should no longer be in the document
    expect(
      screen.queryByText('Loading portfolio data')
    ).not.toBeInTheDocument();
  });

  it('renders the skeleton loader when portfolio data is still loading', () => {
    // Mock Portfolio.Load to return a pending promise
    Portfolio.Load.mockReturnValue(new Promise(() => {}));
    render(<Content />);
    expect(screen.getByText('Loading portfolio data')).toBeInTheDocument();
  });
});
