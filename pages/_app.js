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

import Head from 'next/head';
import PropTypes from 'prop-types';

function MyApp({ Component, pageProps }) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const useDark =
      localStorage.getItem('theme') === 'dark' ||
      (!('theme' in localStorage) &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDarkMode(useDark);
  }, []);

  // Apply dark mode class and save preference when the state changes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <Auth0Provider {...providerConfig}>
      <Head>
        <title>Stock Portfolio</title>
      </Head>
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

MyApp.propTypes = {
  Component: PropTypes.elementType.isRequired,
  pageProps: PropTypes.object.isRequired
};

export default MyApp;
