import React, { useState, useEffect, useSyncExternalStore } from 'react';
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
      globalThis.window === undefined ? '' : globalThis.window.location.origin
  }
};

import Head from 'next/head';
import PropTypes from 'prop-types';

// Subscribe-style helpers for useSyncExternalStore: read the `dark` class
// that the inline boot script in _document.js already applied to <html>
// before hydration, so React state matches the actual DOM without
// recomputing localStorage / prefers-color-scheme on the client.
const subscribeDarkClass = () => () => {};
const getDarkSnapshot = () =>
  document.documentElement.classList.contains('dark');
const getDarkServerSnapshot = () => false;

function MyApp({ Component, pageProps }) {
  const initialDark = useSyncExternalStore(
    subscribeDarkClass,
    getDarkSnapshot,
    getDarkServerSnapshot
  );
  const [darkMode, setDarkMode] = useState(initialDark);

  // Apply dark mode class and persist preference whenever the user toggles.
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
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
