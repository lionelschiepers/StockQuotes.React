import '../styles/global.css';
import '../styles/YahooFinance.css';

import { Auth0Provider } from '@auth0/auth0-react';
import { getConfig } from '../lib/config/config';
import NavBar from '../components/layout/NavBar';
import { useState, useEffect } from 'react';

const config = getConfig();

const providerConfig = {
  domain: config.domain,
  clientId: config.clientId,
  ...(config.audience ? { audience: config.audience } : null),
  authorizationParams: {
    redirect_uri: typeof window !== 'undefined' ? window.location.origin : ''
  }
};

function MyApp({ Component, pageProps }) {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('theme') === 'dark';
  });

  // Apply dark mode class to the HTML element when the state changes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');

    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <Auth0Provider {...providerConfig}>
      <div
        id="app"
        className="flex flex-col min-h-screen bg-white dark:bg-gray-900"
      >
        <NavBar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
        <div className="grow bg-white dark:bg-gray-900">
          <Component {...pageProps} />
        </div>
      </div>
    </Auth0Provider>
  );
}

export default MyApp;
