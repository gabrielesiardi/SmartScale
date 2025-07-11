// src/App.jsx - Updated to include AuthProvider
import React, { useState, useEffect } from "react";
import WeightDisplay from "./components/WeightDisplay";
import AdminPanel from "./components/AdminPanel";
import { defaultScales } from "./state/session";
import { initializeMsal } from "./utils/dataverseAuth";
import { AuthProvider } from "./context/AuthContext"; // Add this import

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedScales, setSelectedScales] = useState(defaultScales);
  const [refreshRate, setRefreshRate] = useState(2);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initializeMsal();
        console.log('MSAL initialized successfully');
      } catch (error) {
        console.error('MSAL initialization failed:', error);
      }

      const savedScales = localStorage.getItem("selectedScales");
      const savedAdmin = localStorage.getItem("isAdmin");
      const savedDarkMode = localStorage.getItem("darkMode");
      const savedRefreshRate = localStorage.getItem("refreshRate");

      if (savedScales) setSelectedScales(JSON.parse(savedScales));
      if (savedAdmin === "true") {
        setIsAdmin(true);
        setShowAdminPanel(true);
      }
      if (savedDarkMode === "true") {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
      }
      if (savedRefreshRate) {
        setRefreshRate(Number(savedRefreshRate));
      }
    };

    initializeApp();
  }, []);

  const handleLoginSuccess = () => {
    setIsAdmin(true);
    setShowAdminPanel(true);
    localStorage.setItem("isAdmin", "true");
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setShowAdminPanel(false);
    localStorage.removeItem("isAdmin");
  };

  const handleConfigSaved = (scales, newRefreshRate) => {
    setSelectedScales(scales);
    setRefreshRate(newRefreshRate);
    localStorage.setItem("selectedScales", JSON.stringify(scales));
    localStorage.setItem("refreshRate", newRefreshRate.toString());
    setIsAdmin(false);
    setShowAdminPanel(false);
    localStorage.removeItem("isAdmin");
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem("darkMode", newDarkMode.toString());
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const refreshAllScales = () => {
    setSelectedScales(prev => [...prev]);
  };

  const getGridColumns = () => {
    const count = selectedScales.length;
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 lg:grid-cols-2';
    if (count === 3) return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
    return 'grid-cols-scales';
  };

  return (
    // Wrap the entire app with AuthProvider
    <AuthProvider>
      <div className={`min-h-screen transition-colors duration-300 ${
        isDarkMode 
          ? 'dark bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
          : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'
      } ${isFullscreen ? 'p-2' : 'p-4'}`}>

        {/* Header */}
        <header className={`${
          isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
        } rounded-lg shadow-lg mb-6 transition-all duration-300`}>
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                {/* Replace the scale icon with your logo */}
                <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
                  <img 
                    src="/logo.png" 
                    alt="Scale APP Logo" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      // Fallback to the original scale icon if logo.png doesn't load
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  {/* Fallback scale icon (hidden by default) */}
                  <div className={`w-10 h-10 rounded-lg items-center justify-center hidden ${
                    isDarkMode ? 'bg-primary-600' : 'bg-gradient-to-br from-primary-500 to-primary-600'
                  }`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h1 className={`text-2xl font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Scale APP
                  </h1>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Smart Weight Monitor • {selectedScales.length} scale{selectedScales.length !== 1 ? 's' : ''} connected • {refreshRate}s refresh
                  </p>
                </div>
              </div>

              {/* Rest of the header remains the same */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={refreshAllScales}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'hover:bg-gray-700 text-gray-300 hover:text-white' 
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-800'
                  }`}
                  title="Refresh all scales"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>

                <button
                  onClick={toggleDarkMode}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'hover:bg-gray-700 text-gray-300 hover:text-white' 
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-800'
                  }`}
                  title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
                >
                  {isDarkMode ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>

                <button
                  onClick={toggleFullscreen}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'hover:bg-gray-700 text-gray-300 hover:text-white' 
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-800'
                  }`}
                  title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  {isFullscreen ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9V4.5M15 9h4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15v4.5M15 15h4.5m0 0l5.5 5.5" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  )}
                </button>

                <button
                  onClick={() => {
                    if (isAdmin) handleLogout();
                    else setShowAdminPanel(true);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md ${
                    isAdmin
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isAdmin ? 'Logout' : 'Admin'}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        {showAdminPanel ? (
          <AdminPanel 
            onLogin={handleLoginSuccess} 
            onConfigSaved={handleConfigSaved} 
          />
        ) : (
          <main className="animate-fade-in">
            {selectedScales.length === 0 ? (
              <div className={`text-center py-16 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
                  isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-gray-200 border border-gray-300'
                }`}>
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold mb-2">No Scales Configured</h2>
                <p className="mb-6">Configure your scale endpoints to start monitoring weights.</p>
                <button
                  onClick={() => setShowAdminPanel(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Configure Scales
                </button>
              </div>
            ) : (
              <div className={`grid gap-6 ${getGridColumns()}`}>
                {selectedScales.map((scale, index) => (
                  <div
                    key={`${scale.name}-${scale.endpoint}-${index}-${refreshRate}`}
                    className="animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <WeightDisplay 
                      name={scale.name} 
                      endpoint={scale.endpoint}
                      refreshRate={refreshRate}
                    />
                  </div>
                ))}
              </div>
            )}

            <footer className={`mt-12 text-center text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <div className="flex items-center justify-center space-x-4">
                <span>Scale APP • Smart Weight Monitor</span>  {/* Changed from "SmartScale Monitor v1.0" */}
                <span>•</span>
                <span>Auto-refresh every {refreshRate} second{refreshRate !== 1 ? 's' : ''}</span>
                <span>•</span>
                <span>
                  Last updated: {new Date().toLocaleTimeString('en-GB', { 
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </footer>
          </main>
        )}
      </div>
    </AuthProvider>
  );
}

export default App;