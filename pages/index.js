import React from 'react';
import dynamic from 'next/dynamic';
import { useAuth0 } from '@auth0/auth0-react';

const YahooFinance = dynamic(
  () => import('../components/features/YahooFinance')
);

export default function Home() {
  const { isAuthenticated } = useAuth0();

  return isAuthenticated ? <YahooFinance /> : null;
}
