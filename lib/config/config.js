export function getConfig() {
  // Configure the audience here. By default, it will take whatever is in the environment
  // variables. If this resolves to `null`, the API page changes to show some helpful info
  // about what to do with the audience.
  const audienceValue = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE;
  const audience =
    audienceValue &&
    audienceValue !== 'YOUR_API_IDENTIFIER' &&
    audienceValue !== 'null'
      ? audienceValue
      : null;

  return {
    domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
    clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
    ...(audience ? { audience } : null)
  };
}
