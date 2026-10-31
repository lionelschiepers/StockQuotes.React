import React, { useState, useEffect, useRef, useId } from 'react';
import { Link } from 'react-router';
import { useAuth0 } from '@auth0/auth0-react';
import PropTypes from 'prop-types';

const iconButtonClass =
  'inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-pencil hover:bg-shade hover:text-ink';

function ThemeIcon({ darkMode }) {
  if (darkMode) {
    return (
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <circle cx="12" cy="12" r="4" />
        <path
          strokeLinecap="round"
          d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"
        />
      </svg>
    );
  }
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path
        strokeLinejoin="round"
        d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"
      />
    </svg>
  );
}

ThemeIcon.propTypes = {
  darkMode: PropTypes.bool.isRequired
};

function AccountMenu({ user, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const panelId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex cursor-pointer rounded-full ring-1 ring-rule hover:ring-pencil"
        aria-label="Account"
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        <img
          className="h-9 w-9 rounded-full"
          src={user.picture || `${import.meta.env.BASE_URL}favicon.svg`}
          alt=""
          width={36}
          height={36}
        />
      </button>
      {isOpen && (
        <div
          id={panelId}
          className="absolute right-0 top-full z-30 mt-2 w-64 rounded-md border border-rule bg-sheet py-2 shadow-[0_16px_32px_-16px_rgb(19_27_46/0.45)]"
        >
          <div className="border-b border-rule px-4 pb-3 pt-1">
            <p className="truncate font-medium">{user.name}</p>
            {user.email && (
              <p className="truncate text-sm text-pencil">{user.email}</p>
            )}
          </div>
          <Link
            to="/profile"
            onClick={() => setIsOpen(false)}
            className="mt-1 block px-4 py-2 hover:bg-shade"
          >
            Profile
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="block w-full cursor-pointer px-4 py-2 text-left hover:bg-shade"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

AccountMenu.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
    picture: PropTypes.string
  }).isRequired,
  onLogout: PropTypes.func.isRequired
};

const NavBar = ({ darkMode, toggleDarkMode }) => {
  const { user, isAuthenticated, isLoading, loginWithRedirect, logout } =
    useAuth0();

  const logoutWithRedirect = () =>
    logout({
      returnTo: globalThis.window.location.origin
    });

  const themeLabel = darkMode
    ? 'Switch to light theme'
    : 'Switch to dark theme';

  let account = null;
  if (isAuthenticated && user) {
    account = <AccountMenu user={user} onLogout={logoutWithRedirect} />;
  } else if (!isLoading) {
    account = (
      <button
        type="button"
        onClick={() => loginWithRedirect()}
        className="h-10 cursor-pointer rounded-md border border-ink px-4 font-medium hover:bg-ink hover:text-paper"
      >
        Log in
      </button>
    );
  }

  return (
    <nav className="border-b border-rule">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-lg font-semibold font-wide"
        >
          <svg
            aria-hidden="true"
            width="22"
            height="22"
            viewBox="0 0 512 512"
            className="fill-current"
          >
            <polygon points="204.344,155.188 249.469,200.297 409.344,40.422 268.031,40.422 316.063,88.453 249.469,155.031 204.953,110.516 41.906,264.969 63.906,288.219" />
            <polygon points="512,102.313 276.031,330.281 212.656,266.906 0,471.578 512,471.578" />
          </svg>
          Stock Quotes
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleDarkMode}
            className={iconButtonClass}
            title={themeLabel}
            aria-label={themeLabel}
          >
            <ThemeIcon darkMode={darkMode} />
          </button>
          {account}
        </div>
      </div>
    </nav>
  );
};

NavBar.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  toggleDarkMode: PropTypes.func.isRequired
};

export default NavBar;
