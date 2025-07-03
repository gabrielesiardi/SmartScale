// src/App.jsx
import React, { useState, useEffect } from "react";
import WeightDisplay from "./components/WeightDisplay";
import AdminPanel from "./components/AdminPanel";
import { defaultScales } from "./state/session";

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedScales, setSelectedScales] = useState(defaultScales);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  useEffect(() => {
    const savedScales = localStorage.getItem("selectedScales");
    const savedAdmin = localStorage.getItem("isAdmin");

    if (savedScales) setSelectedScales(JSON.parse(savedScales));
    if (savedAdmin === "true") {
      setIsAdmin(true);
      setShowAdminPanel(true);
    }
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
    // optional: clear selected scale config on logout
    // setSelectedScales(defaultScales);
    // localStorage.removeItem("selectedScales");
  };

  const handleConfigSaved = (scales) => {
    setSelectedScales(scales);
    localStorage.setItem("selectedScales", JSON.stringify(scales));
    setIsAdmin(false);
    setShowAdminPanel(false);
    localStorage.removeItem("isAdmin");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-700">SmartScale V 1.0</h1>
        <button
          onClick={() => {
            if (isAdmin) handleLogout();
            else setShowAdminPanel(true);
          }}
          className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
        >
          {isAdmin ? "Logout" : "Login"}
        </button>
      </div>

      {showAdminPanel ? (
        <AdminPanel onLogin={handleLoginSuccess} onConfigSaved={handleConfigSaved} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {selectedScales.map((scale, index) => (
            <WeightDisplay key={index} name={scale.name} endpoint={scale.endpoint} />
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
