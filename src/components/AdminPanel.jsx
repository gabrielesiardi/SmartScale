import React, { useState, useEffect } from "react";
import { checkCredentials } from "../state/session";

const AdminPanel = ({ onLogin, onConfigSaved }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [scales, setScales] = useState([
    { id: 1, name: "Scale A", endpoint: "", enabled: true },
    { id: 2, name: "Scale B", endpoint: "", enabled: false }
  ]);
  const [refreshRate, setRefreshRate] = useState(2); // Default 2 seconds
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Load existing configuration
  useEffect(() => {
    const savedScales = localStorage.getItem("selectedScales");
    const savedRefreshRate = localStorage.getItem("refreshRate");
    
    if (savedScales) {
      try {
        const parsed = JSON.parse(savedScales);
        const updatedScales = scales.map((scale, index) => {
          if (parsed[index]) {
            return {
              ...scale,
              name: parsed[index].name || scale.name,
              endpoint: parsed[index].endpoint || "",
              enabled: Boolean(parsed[index].endpoint)
            };
          }
          return scale;
        });
        setScales(updatedScales);
      } catch (error) {
        console.error("Failed to load saved scales:", error);
      }
    }
    
    if (savedRefreshRate) {
      setRefreshRate(Number(savedRefreshRate));
    }
  }, []);

  const handleLogin = async () => {
    setLoginError("");
    setIsLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (!checkCredentials(username, password)) {
      setLoginError("Invalid username or password");
      setIsLoading(false);
      return;
    }
    
    setIsLoggedIn(true);
    setIsLoading(false);
    onLogin();
  };

  const validateEndpoint = (endpoint) => {
    if (!endpoint.trim()) return "";
    
    try {
      // Basic URL validation
      if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
        new URL(endpoint);
        return "";
      } else {
        return "Endpoint must be a valid URL starting with http:// or https://";
      }
    } catch {
      return "Invalid URL format";
    }
  };

  const updateScale = (id, field, value) => {
    setScales(prev => prev.map(scale => 
      scale.id === id ? { ...scale, [field]: value } : scale
    ));
    
    // Clear validation error when user starts typing
    if (field === 'endpoint' && validationErrors[`scale-${id}`]) {
      setValidationErrors(prev => ({
        ...prev,
        [`scale-${id}`]: ""
      }));
    }
  };

  const addScale = () => {
    const newId = Math.max(...scales.map(s => s.id)) + 1;
    setScales(prev => [...prev, {
      id: newId,
      name: `Scale ${String.fromCharCode(64 + newId)}`,
      endpoint: "",
      enabled: true
    }]);
  };

  const removeScale = (id) => {
    if (scales.length > 1) {
      setScales(prev => prev.filter(scale => scale.id !== id));
    }
  };

  const [testingConnections, setTestingConnections] = useState({});
  
  const testConnection = async (scaleId, endpoint) => {
    if (!endpoint.trim()) return;
    
    setTestingConnections(prev => ({ ...prev, [scaleId]: true }));
    
    try {
      const response = await fetch(endpoint, { 
        method: 'GET',
        timeout: 3000 
      });
      
      if (response.ok) {
        // Show success message
        const scale = scales.find(s => s.id === scaleId);
        alert(`✅ Connection successful to ${scale?.name || 'scale'}!`);
      } else {
        alert(`❌ Connection failed: HTTP ${response.status}`);
      }
    } catch (error) {
      alert(`❌ Connection failed: ${error.message}`);
    } finally {
      setTestingConnections(prev => ({ ...prev, [scaleId]: false }));
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    const errors = {};
    
    // Validate all enabled scales
    const enabledScales = scales.filter(scale => scale.enabled);
    
    for (const scale of enabledScales) {
      const error = validateEndpoint(scale.endpoint);
      if (error) {
        errors[`scale-${scale.id}`] = error;
      }
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setIsLoading(false);
      return;
    }
    
    // Save configuration
    const configToSave = enabledScales
      .filter(scale => scale.endpoint.trim())
      .map(scale => ({
        name: scale.name,
        endpoint: scale.endpoint
      }));
    
    // Save refresh rate
    localStorage.setItem("refreshRate", refreshRate.toString());
    
    setIsLoading(false);
    onConfigSaved(configToSave, refreshRate);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoggedIn) {
      handleLogin();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-4">
      <div className="admin-panel-base bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-primary-100">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-primary-900">
              {isLoggedIn ? 'Scale Configuration' : 'Admin Login'}
            </h2>
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-6">
          {!isLoggedIn ? (
            /* Login Form */
            <div className="space-y-6 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={handleKeyPress}
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
              </div>

              {loginError && (
                <div className="bg-danger-50 border border-danger-200 rounded-lg p-3 flex items-center space-x-2">
                  <svg className="w-5 h-5 text-danger-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 14.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-danger-700 text-sm">{loginError}</span>
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={isLoading || !username || !password}
                className="w-full py-3 text-lg bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Logging in...</span>
                  </>
                ) : (
                  <span>Login</span>
                )}
              </button>
            </div>
          ) : (
            /* Configuration Form */
            <div className="space-y-6 animate-slide-up">
              <div className="flex items-center justify-between">
                <p className="text-gray-600">Configure your scale endpoints below:</p>
                <button
                  onClick={addScale}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded-lg font-medium flex items-center space-x-1 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Add Scale</span>
                </button>
              </div>

              {/* Refresh Rate Setting */}
              <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-800">Auto-Refresh Settings</h3>
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div className="flex items-center space-x-3">
                  <label className="text-sm text-gray-700 font-medium">Refresh every:</label>
                  <select
                    value={refreshRate}
                    onChange={(e) => setRefreshRate(Number(e.target.value))}
                    className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={0.5}>0.5 seconds</option>
                    <option value={1}>1 second</option>
                    <option value={2}>2 seconds</option>
                    <option value={3}>3 seconds</option>
                    <option value={5}>5 seconds</option>
                    <option value={10}>10 seconds</option>
                    <option value={30}>30 seconds</option>
                  </select>
                  <span className="text-xs text-gray-500">Higher rates may impact performance</span>
                </div>
              </div>

              <div className="space-y-4">
                {scales.map((scale) => (
                  <div key={scale.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={scale.enabled}
                          onChange={(e) => updateScale(scale.id, 'enabled', e.target.checked)}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <input
                          type="text"
                          placeholder="Scale Name"
                          value={scale.name}
                          onChange={(e) => updateScale(scale.id, 'name', e.target.value)}
                          className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      
                      {scales.length > 1 && (
                        <button
                          onClick={() => removeScale(scale.id)}
                          className="text-danger-600 hover:text-danger-700 p-1"
                          title="Remove scale"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                    
                    {scale.enabled && (
                      <div className="space-y-2">
                        <div className="flex space-x-2">
                          <input
                            type="url"
                            placeholder="https://example.com/api/v1/weight/..."
                            value={scale.endpoint}
                            onChange={(e) => updateScale(scale.id, 'endpoint', e.target.value)}
                            className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                              validationErrors[`scale-${scale.id}`] ? 'border-danger-300' : 'border-gray-300'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => testConnection(scale.id, scale.endpoint)}
                            disabled={!scale.endpoint.trim() || testingConnections[scale.id]}
                            className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                            title="Test connection"
                          >
                            {testingConnections[scale.id] ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                                <span>Testing...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <span>Test</span>
                              </>
                            )}
                          </button>
                        </div>
                        {validationErrors[`scale-${scale.id}`] && (
                          <p className="text-danger-600 text-xs">
                            {validationErrors[`scale-${scale.id}`]}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Save Configuration</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;