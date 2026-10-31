import React, { useState, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import NavBar from './NavBar';
import Home from '../../pages/Home';
import Profile from '../../pages/Profile';

const getInitialDarkMode = () => {
  const savedTheme = localStorage.getItem('theme');

  if (savedTheme === 'dark') {
    return true;
  }

  if (savedTheme === 'light') {
    return false;
  }

  return document.documentElement.classList.contains('dark');
};

function App() {
  const [darkMode, setDarkMode] = useState(getInitialDarkMode);

  // Apply dark mode class and persist preference whenever the user toggles.
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <div
      id="app"
      className="font-sans flex flex-col min-h-screen bg-paper text-ink"
    >
      <NavBar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      <div className="grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
