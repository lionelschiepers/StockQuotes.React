import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import YahooFinance from '../components/features/YahooFinance';

export default function Home() {
  const { isAuthenticated } = useAuth0();

  return isAuthenticated ? <YahooFinance /> : null;
}
