// src/state/session.js
const isProduction = import.meta.env.PROD;

// In production, use the API Container App URL directly
const API_BASE_URL = isProduction 
  ? "https://scale-api.internal.yellowground-93caf07b.northeurope.azurecontainerapps.io"  // Replace with your API URL
  : "http://localhost:3001";

export const defaultScales = [
  { 
    name: "Raspberry Pi 1 - Scale Left", 
    endpoint: isProduction 
      ? "/api/v1/weight/217.57.87.90/scale_left?port=60080"  // NAT -> raspberry1:8000
      : "http://localhost:3001/api/v1/weight/217.57.87.90/scale_left?port=60080"
  },
  { 
    name: "Raspberry Pi 1 - Scale Right", 
    endpoint: isProduction 
      ? "/api/v1/weight/217.57.87.90/scale_right?port=60080"  // NAT -> raspberry1:8000
      : "http://localhost:3001/api/v1/weight/217.57.87.90/scale_right?port=60080"
  },
  { 
    name: "Raspberry Pi 2 - Scale A", 
    endpoint: isProduction 
      ? "/api/v1/weight/217.57.87.90/scale_a?port=60081"  // NAT -> raspberry2:8000
      : "http://localhost:3001/api/v1/weight/217.57.87.90/scale_a?port=60081"
  },
  { 
    name: "Raspberry Pi 2 - Scale B", 
    endpoint: isProduction 
      ? "/api/v1/weight/217.57.87.90/scale_b?port=60081"  // NAT -> raspberry2:8000
      : "http://localhost:3001/api/v1/weight/217.57.87.90/scale_b?port=60081"
  }
];

export function checkCredentials(username, password) {
  return username === "admin" && password === "admin";
}