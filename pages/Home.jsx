import React, { lazy, Suspense } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import Loading from '../components/ui/Loading';

const YahooFinance = lazy(() => import('../components/features/YahooFinance'));

export default function Home() {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

  if (isLoading) {
    return <Loading label="Checking your session" />;
  }

  if (isAuthenticated) {
    return (
      <Suspense fallback={<Loading label="Loading your portfolio" />}>
        <YahooFinance />
      </Suspense>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
      <section className="pt-14 sm:pt-24">
        <h1 className="max-w-3xl text-display font-bold font-wide">
          See how your portfolio moved today
        </h1>
        <p className="mt-5 max-w-[60ch] text-lg leading-relaxed">
          Log in to price every holding, follow your gains and dividends after
          tax, and check option chains for the stocks you own.
        </p>
        <button
          type="button"
          onClick={() => loginWithRedirect()}
          className="mt-8 h-11 cursor-pointer rounded-md bg-ink px-5 font-medium text-paper hover:opacity-90"
        >
          Log in
        </button>
      </section>
    </main>
  );
}
