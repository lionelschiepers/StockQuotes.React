export function getConfig() {
  // Configure the audience here. By default, it will take whatever is in the environment
  // variables. If this resolves to `null`, the API page changes to show some helpful info
  // about what to do with the audience.
  const audienceValue = import.meta.env.VITE_AUTH0_AUDIENCE;
  const audience =
    audienceValue &&
    audienceValue !== 'YOUR_API_IDENTIFIER' &&
    audienceValue !== 'null'
      ? audienceValue
      : null;

  return {
    domain: import.meta.env.VITE_AUTH0_DOMAIN,
    clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
    ...(audience ? { audience } : null)
  };
}
