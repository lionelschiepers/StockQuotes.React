import React from 'react';
import Image from 'next/image';
import Loading from '../components/ui/Loading';
import { useAuth0, withAuthenticationRequired } from '@auth0/auth0-react';

function Profile() {
  const { user, isLoading } = useAuth0();

  if (isLoading) {
    return <Loading />;
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 lg:px-8">
      <div className="flex items-center gap-6">
        <Image
          src={user?.picture || '/favicon.svg'}
          alt=""
          className="h-24 w-24 rounded-full object-cover ring-1 ring-rule"
          width={96}
          height={96}
        />
        <div className="min-w-0">
          <h1 className="truncate text-display font-bold font-wide">
            {user?.name}
          </h1>
          <p className="truncate text-lg text-pencil">{user?.email}</p>
        </div>
      </div>
      <details className="mt-12 max-w-4xl">
        <summary className="cursor-pointer text-pencil hover:text-ink">
          Account data from Auth0
        </summary>
        <pre className="mt-3 overflow-x-auto rounded-md border border-rule bg-sheet p-4 text-sm">
          <code>{JSON.stringify(user, null, 2)}</code>
        </pre>
      </details>
    </main>
  );
}

export default withAuthenticationRequired(Profile, {
  onRedirecting: () => <Loading />
});
