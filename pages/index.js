import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import Content from '../components/features/Content';

export default function Home() {
  const { isAuthenticated } = useAuth0();

  return isAuthenticated ? <Content /> : null;
}
