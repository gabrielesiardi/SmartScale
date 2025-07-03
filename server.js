import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = process.env.PORT || 8080;

// Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, "build"))); // serve frontend

// API route
app.get("/scales/:ip/:scale", async (req, res) => {
  const { ip, scale } = req.params;
  const targetUrl = `http://${ip}:8000/scales/${scale}/weight`;

  try {
    const response = await fetch(targetUrl);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch scale", details: err.message });
  }
});

// Fallback to frontend for unknown routes (React SPA support)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// Start server
app.listen(port, () => {
  console.log(`✅ App running on http://localhost:${port}`);
});
