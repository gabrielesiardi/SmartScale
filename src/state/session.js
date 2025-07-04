// src/state/session.js
export const defaultScales = [
  { name: "Scale A", endpoint: "http://scale-api-20250702165210.northeurope.azurecontainer.io:3001/api/v1/weight/217.57.87.90/scale_left?port=60080" }
];

export function checkCredentials(username, password) {
  return username === "admin" && password === "admin";
}