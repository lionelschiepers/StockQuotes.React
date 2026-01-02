import React, { useState, useEffect } from 'react';
import '../styles/global.css';
import '../styles/YahooFinance.css';

import { Auth0Provider } from '@auth0/auth0-react';
import { getConfig } from '../lib/config/config';
import NavBar from '../components/layout/NavBar';

const config = getConfig();

const providerConfig = {
  domain: config.domain,
  clientId: config.clientId,
  ...(config.audience ? { audience: config.audience } : null),
  authorizationParams: {
    redirect_uri:
      globalThis.window !== undefined
        ? globalThis.window.location.origin
        : ''
  }
};

import Head from 'next/head';
import PropTypes from 'prop-types';

const getInitialTheme = () => {
  if (globalThis.window === undefined) {
    return false;
  }

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    return savedTheme === 'dark';
  }
  return globalThis.window.matchMedia('(prefers-color-scheme: dark)').matches;
};

function MyApp({ Component, pageProps }) {
  const [darkMode, setDarkMode] = useState(getInitialTheme);

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
        className="flex flex-col min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
      >
        <NavBar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
        <div className="grow bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
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
