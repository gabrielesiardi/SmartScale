import React, { useEffect, useState, useCallback } from "react";
import { 
  submitWeightRegistration, 
  loginToDataverse, 
  isAuthenticated
} from "../utils/dataverseAuth";
import { useAuth } from "../context/AuthContext"; // Add this import

const WeightDisplay = ({ name, endpoint, refreshRate = 2 }) => {
  const [weight, setWeight] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [lastRegistration, setLastRegistration] = useState(null);
  const [inputError, setInputError] = useState('');

  // Use global auth state instead of local state
  const { isUserAuthenticated, updateAuthState } = useAuth();

  // Validate SSCC input (20 digits only)
  const validateSSCC = useCallback((value) => {
    const digitsOnly = value.replace(/\D/g, '');
    
    if (value === '') {
      return { isValid: false, error: '' };
    } else if (digitsOnly.length < 20) {
      return { 
        isValid: false, 
        error: `SSCC must be exactly 20 digits (${digitsOnly.length}/20)` 
      };
    } else if (digitsOnly.length > 20) {
      return { 
        isValid: false, 
        error: 'SSCC cannot exceed 20 digits' 
      };
    } else if (digitsOnly.length === 20) {
      return { isValid: true, error: '' };
    }
    return { isValid: false, error: '' };
  }, []);

  // Handle SSCC input change
  const handleSSCCChange = useCallback((e) => {
    const value = e.target.value;
    const digitsOnly = value.replace(/\D/g, '').slice(0, 20);
    setTextInput(digitsOnly);
    const validation = validateSSCC(digitsOnly);
    setInputError(validation.error);
  }, [validateSSCC]);

  // Check if registration button should be enabled
  const isRegistrationEnabled = useCallback(() => {
    if (!weight || isRegistering) return false;
    const validation = validateSSCC(textInput);
    return validation.isValid && textInput.length === 20;
  }, [weight, isRegistering, textInput, validateSSCC]);

  // Check for dark mode changes
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    
    checkDarkMode();
    
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  const fetchWeight = useCallback(async () => {
    try {
      setIsUpdating(true);
      setError(null);
      
      console.log("Fetching from", endpoint);
      const res = await fetch(endpoint, {
        timeout: 5000,
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log("Received weight:", data);
      
      const weightValue = data.weight ?? data.data?.weight ?? data;
      
      if (weightValue !== null && weightValue !== undefined) {
        setWeight(Number(weightValue).toFixed(1));
        setStatus('online');
        setLastUpdate(new Date());
      } else {
        throw new Error('Invalid weight data received');
      }
      
    } catch (err) {
      console.error("Error fetching weight:", err);
      setWeight(null);
      setStatus('offline');
      setError(err.message);
    } finally {
      setIsUpdating(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchWeight();
    
    const intervalMs = refreshRate * 1000;
    console.log(`Setting up interval for ${name} with ${refreshRate}s (${intervalMs}ms) refresh rate`);
    
    const interval = setInterval(() => {
      console.log(`Auto-refreshing ${name} at ${refreshRate}s interval`);
      fetchWeight();
    }, intervalMs);
    
    return () => {
      console.log(`Clearing interval for ${name}`);
      clearInterval(interval);
    };
  }, [fetchWeight, refreshRate, name]);

  const getStatusStyles = () => {
    switch (status) {
      case 'online':
        return 'bg-green-50 dark:bg-green-900/20 border-l-4 border-l-green-500';
      case 'offline':
        return 'bg-red-50 dark:bg-red-900/20 border-l-4 border-l-red-500';
      case 'connecting':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-l-yellow-500';
      default:
        return 'bg-gray-50 dark:bg-gray-800 border-l-4 border-l-gray-300';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'online':
        return (
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        );
      case 'offline':
        return (
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
        );
      case 'connecting':
        return (
          <div className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce"></div>
        );
      default:
        return (
          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
        );
    }
  };

  const formatLastUpdate = () => {
    if (!lastUpdate) return '';
    return lastUpdate.toLocaleTimeString('en-GB', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleRegistraWeight = async () => {
    const validation = validateSSCC(textInput);
    
    if (!weight || !validation.isValid) {
      alert('Please ensure there is a weight reading and enter a valid 20-digit SSCC number before registering.');
      return;
    }

    setIsRegistering(true);
    
    try {
      if (!isAuthenticated()) {
        console.log('User not authenticated, starting login process...');
        
        try {
          await loginToDataverse();
          // Update global auth state after successful login
          updateAuthState();
          console.log('Login successful');
        } catch (loginError) {
          console.error('Login failed:', loginError);
          setIsRegistering(false);
          
          if (loginError.message.includes('Popup was blocked')) {
            alert('❌ Login failed: Popup was blocked. Please allow popups for this site and try again.');
          } else if (loginError.message.includes('cancelled')) {
            alert('❌ Login was cancelled. Please try again.');
          } else {
            alert(`❌ Login failed: ${loginError.message}`);
          }
          return;
        }
      }
      
      console.log('Registering weight to Dataverse:', {
        scaleName: name,
        weight: weight,
        ssccNumber: textInput.trim()
      });
      
      const result = await submitWeightRegistration(
        name,
        weight,
        textInput.trim()
      );
      
      console.log('Registration successful:', result);
      
      setLastRegistration({
        id: result.id,
        weight: weight,
        ssccNumber: textInput.trim(),
        timestamp: new Date()
      });
      
      setTextInput('');
      setInputError('');
      
      alert(`✅ Weight registered successfully to Dataverse!
      
Scale: ${name}
Weight: ${weight} kg
SSCC Number: ${textInput.trim()}
Record ID: ${result.id || 'Generated'}`);
      
    } catch (error) {
      console.error('Error registering weight:', error);
      
      if (error.message.includes('No valid authentication token') || 
          error.message.includes('Authentication expired') ||
          error.message.includes('HTTP 401')) {
        // Update global auth state on auth failure
        updateAuthState();
        alert('❌ Authentication expired. Please try again to re-login.');
      } else if (error.message.includes('HTTP 403')) {
        alert('❌ Permission denied. Please check your Dataverse permissions.');
      } else if (error.message.includes('CORS')) {
        alert('❌ CORS error. Please check your Dataverse CORS configuration.');
      } else {
        alert(`❌ Failed to register weight: ${error.message}`);
      }
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className={`
      bg-white dark:bg-gray-800 overflow-hidden transform transition-all duration-300 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700
      hover:scale-[1.02] hover:shadow-xl
      ${isUpdating ? 'animate-data-refresh' : ''}
      ${weight !== null ? 'animate-weight-update' : ''}
      ${getStatusStyles()}
    `}>
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <h2 
            className="font-semibold text-gray-800 dark:text-gray-100 truncate text-lg flex-1 mr-2"
            title={name}
          >
            {name}
          </h2>
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300 capitalize">
              {status}
            </span>
          </div>
        </div>
        
        {lastUpdate && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Last update: {formatLastUpdate()}
          </p>
        )}
      </div>

      {/* Weight Display */}
      <div className="px-6 py-12 text-center">
        {weight !== null ? (
          <div className="weight-display">
            <div className="relative">
              <span className={`text-[clamp(4rem,12vw,20rem)] tracking-tight leading-none font-black ${isDarkMode ? 'text-white' : 'text-black'}`}>
                {weight}
              </span>
              <span className={`text-[clamp(2rem,6vw,8rem)] font-bold ml-2 align-bottom ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                kg
              </span>
              
              {status === 'online' && (
                <div className="absolute inset-0 bg-green-100 dark:bg-green-900/20 rounded-lg opacity-30 blur-xl -z-10"></div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[12rem]">
            {status === 'connecting' ? (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 dark:border-blue-400 mb-4"></div>
                <span className="text-xl text-gray-600 dark:text-gray-400">Connecting...</span>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 14.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <span className="text-xl text-red-600 dark:text-red-400 font-medium">Connection Failed</span>
                {error && (
                  <span className="text-sm text-red-500 dark:text-red-400 mt-2 text-center px-2">
                    {error}
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer with actions */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={fetchWeight}
            disabled={isUpdating}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUpdating ? 'Refreshing...' : 'Refresh'}
          </button>
          
          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Auto-refresh: {refreshRate}s</span>
            <div className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
          </div>
        </div>

        {/* Registration Section */}
        <div className="space-y-3">
          {/* Text Input */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              SSCC Number (20 digits):
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Enter 20-digit SSCC number..."
              value={textInput}
              onChange={handleSSCCChange}
              maxLength={20}
              className={`w-full px-3 py-2 border rounded-lg text-sm font-mono
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors
                         placeholder-gray-500 dark:placeholder-gray-400
                         ${inputError 
                           ? 'border-red-500 dark:border-red-400' 
                           : textInput.length === 20 
                             ? 'border-green-500 dark:border-green-400' 
                             : 'border-gray-300 dark:border-gray-600'
                         }`}
              disabled={isRegistering || !weight}
            />
            
            {/* Input validation feedback */}
            <div className="mt-1 min-h-[20px]">
              {inputError && (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 14.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  {inputError}
                </p>
              )}
              {!inputError && textInput.length === 20 && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Valid SSCC number
                </p>
              )}
              {!inputError && textInput.length > 0 && textInput.length < 20 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {textInput.length}/20 digits entered
                </p>
              )}
            </div>
          </div>

          {/* Login Status - Updated to use global auth state */}
          {!isUserAuthenticated && (
            <div className="text-xs bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border-l-2 border-yellow-500">
              <p className="font-medium text-yellow-700 dark:text-yellow-400">
                ⚠️ Not logged in to Dataverse
              </p>
              <p className="text-yellow-600 dark:text-yellow-500">
                You'll be prompted to login when registering weight
              </p>
            </div>
          )}

          {/* Show logged in status */}
          {isUserAuthenticated && (
            <div className="text-xs bg-green-50 dark:bg-green-900/20 p-2 rounded border-l-2 border-green-500">
              <p className="font-medium text-green-700 dark:text-green-400">
                ✅ Logged in to Dataverse
              </p>
              <p className="text-green-600 dark:text-green-500">
                Ready to register weights
              </p>
            </div>
          )}

          {/* Registra Peso Button */}
          <button
            onClick={handleRegistraWeight}
            disabled={!isRegistrationEnabled()}
            className={`w-full py-3 font-bold text-lg rounded-lg transition-colors duration-200
                       flex items-center justify-center space-x-2
                       shadow-lg hover:shadow-xl disabled:shadow-none
                       ${isRegistrationEnabled()
                         ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                         : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                       }`}
          >
            {isRegistering ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Registrando...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Registra Peso</span>
              </>
            )}
          </button>

          {/* Last Registration Info */}
          {lastRegistration && (
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-green-50 dark:bg-green-900/20 p-2 rounded border-l-2 border-green-500">
              <p className="font-medium text-green-700 dark:text-green-400">✅ Last Registration:</p>
              <p>Weight: {lastRegistration.weight} kg</p>
              <p>SSCC: {lastRegistration.ssccNumber}</p>
              <p>Time: {lastRegistration.timestamp.toLocaleString()}</p>
              {lastRegistration.id && (
                <p className="text-xs text-green-600 dark:text-green-500">ID: {lastRegistration.id}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeightDisplay;