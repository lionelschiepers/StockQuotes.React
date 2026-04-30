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
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col items-center profile-header text-center mb-8">
        <div className="mb-4">
          <Image
            src={user?.picture || '/favicon.svg'}
            alt="Profile"
            className="rounded-full w-32 h-32 object-cover profile-picture"
            width={128}
            height={128}
          />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {user?.name || 'Loading...'}
          </h2>
          <p className="text-gray-600">{user?.email || 'Loading...'}</p>
        </div>
      </div>
      <div>
        <pre className="rounded bg-gray-900 text-gray-100 p-4 overflow-x-auto text-sm">
          <code>{JSON.stringify(user, null, 2)}</code>
        </pre>
      </div>
    </main>
  );
}

export default withAuthenticationRequired(Profile, {
  onRedirecting: () => <Loading />
});
