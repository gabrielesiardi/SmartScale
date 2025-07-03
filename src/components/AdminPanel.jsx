import React, { useState } from "react";
import { checkCredentials } from "../state/session";

const AdminPanel = ({ onLogin, onConfigSaved }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [scaleA, setScaleA] = useState("");
  const [scaleB, setScaleB] = useState("");
  const [nameA, setNameA] = useState("Scale A");
  const [nameB, setNameB] = useState("Scale B");
  const [isLoggedIn, setIsLoggedIn] = useState(false); // 👈 this controls visibility

  const handleLogin = () => {
    if (!checkCredentials(username, password)) {
      alert("Invalid credentials");
    } else {
      setIsLoggedIn(true);   // now we show scale selection
      onLogin();             // also notify App
    }
  };

  const handleSave = () => {
    const selected = [];
    if (scaleA) selected.push({ name: nameA, endpoint: scaleA });
    if (scaleB) selected.push({ name: nameB, endpoint: scaleB });
    onConfigSaved(selected);
  };

  return (
    <div className="p-6 max-w-lg mx-auto mt-12 bg-white rounded-xl shadow space-y-6">
      <h2 className="text-xl font-semibold">Admin Panel</h2>

      {!isLoggedIn && (
        <>
          <input
            className="w-full border px-4 py-2 rounded"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="w-full border px-4 py-2 rounded"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
          >
            Login
          </button>
        </>
      )}

      {isLoggedIn && (
        <>
          <input
            className="w-full border px-4 py-2 rounded"
            placeholder="Label for Scale A"
            value={nameA}
            onChange={(e) => setNameA(e.target.value)}
          />
          <input
            className="w-full border px-4 py-2 rounded"
            placeholder="Scale A Endpoint"
            value={scaleA}
            onChange={(e) => setScaleA(e.target.value)}
          />
          <input
            className="w-full border px-4 py-2 rounded"
            placeholder="Label for Scale B"
            value={nameB}
            onChange={(e) => setNameB(e.target.value)}
          />
          <input
            className="w-full border px-4 py-2 rounded"
            placeholder="Scale B Endpoint (optional)"
            value={scaleB}
            onChange={(e) => setScaleB(e.target.value)}
          />
          <button
            onClick={handleSave}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded"
          >
            Save Configuration
          </button>
        </>
      )}
    </div>
  );
};

export default AdminPanel;
