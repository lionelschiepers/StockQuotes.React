import React, { useState, useEffect } from 'react';
import { Archivo } from 'next/font/google';
import '../styles/global.css';

import { Auth0Provider } from '@auth0/auth0-react';
import { getConfig } from '../lib/config/config';
import NavBar from '../components/layout/NavBar';

const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap'
});

const config = getConfig();

const providerConfig = {
  domain: config.domain,
  clientId: config.clientId,
  ...(config.audience ? { audience: config.audience } : null),
  cacheLocation: 'localstorage',
  authorizationParams: {
    redirect_uri:
      globalThis.window === undefined ? '' : globalThis.window.location.origin
  }
};

import Head from 'next/head';
import PropTypes from 'prop-types';

const getInitialDarkMode = () => {
  if (globalThis.window === undefined) {
    return true;
  }

  const savedTheme = localStorage.getItem('theme');

  if (savedTheme === 'dark') {
    return true;
  }

  if (savedTheme === 'light') {
    return false;
  }

  return document.documentElement.classList.contains('dark');
};

function MyApp({ Component, pageProps }) {
  const [darkMode, setDarkMode] = useState(getInitialDarkMode);

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
        <title>Stock Quotes</title>
      </Head>
      <div
        id="app"
        className={`${archivo.variable} font-sans flex flex-col min-h-screen bg-paper text-ink`}
      >
        <NavBar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
        <div className="grow">
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
