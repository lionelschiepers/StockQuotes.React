import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { useAuth0 } from '@auth0/auth0-react';
import App from '../App';

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: vi.fn(),
  withAuthenticationRequired: (Component) => Component
}));

// Mirrors the GitHub Pages deployment, which serves the app under a base path.
const renderAt = (path) => {
  globalThis.history.pushState({}, '', path);
  return render(
    <BrowserRouter basename="/StockQuotes.React/">
      <App />
    </BrowserRouter>
  );
};

describe('App routing', () => {
  it('renders the profile page for a deep link with a trailing slash', () => {
    useAuth0.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { name: 'Ada Lovelace', email: 'ada@example.com' }
    });

    renderAt('/StockQuotes.React/profile/');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Ada Lovelace' })
    ).toBeInTheDocument();
  });

  it('redirects unknown paths to the home page', () => {
    useAuth0.mockReturnValue({ isAuthenticated: false, isLoading: false });

    renderAt('/StockQuotes.React/missing');

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'See how your portfolio moved today'
      })
    ).toBeInTheDocument();
    expect(globalThis.location.pathname).toBe('/StockQuotes.React/');
  });
});
