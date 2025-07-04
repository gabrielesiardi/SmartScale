// Create: src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { isAuthenticated } from '../utils/dataverseAuth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);

  // Check authentication status on mount and periodically
  useEffect(() => {
    const checkAuth = () => {
      setIsUserAuthenticated(isAuthenticated());
    };

    // Initial check
    checkAuth();

    // Check every 30 seconds in case token expires
    const interval = setInterval(checkAuth, 30000);

    // Listen for storage events (when auth state changes in other tabs)
    const handleStorageChange = (e) => {
      if (e.key && e.key.includes('msal')) {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Function to update auth state (call this after successful login)
  const updateAuthState = () => {
    setIsUserAuthenticated(isAuthenticated());
  };

  const value = {
    isUserAuthenticated,
    updateAuthState,
    setIsUserAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};