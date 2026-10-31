import React from 'react';
import { Auth0Provider } from '@auth0/auth0-react';
import { useNavigate } from 'react-router';
import PropTypes from 'prop-types';
import { getConfig } from '../../lib/config/config';

const config = getConfig();

const providerConfig = {
  domain: config.domain,
  clientId: config.clientId,
  ...(config.audience ? { audience: config.audience } : null),
  cacheLocation: 'localstorage',
  authorizationParams: {
    redirect_uri: globalThis.location.origin
  }
};

// Routes the post-login redirect through React Router so the matching page
// renders instead of only the address bar changing.
function AuthProvider({ children }) {
  const navigate = useNavigate();

  const onRedirectCallback = (appState) => {
    navigate(appState?.returnTo ?? '/', { replace: true });
  };

  return (
    <Auth0Provider {...providerConfig} onRedirectCallback={onRedirectCallback}>
      {children}
    </Auth0Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default AuthProvider;
