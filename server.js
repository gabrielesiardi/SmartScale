import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());

// Original proxy endpoint for frontend
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

// ✅ SINGLE listen call
app.listen(port, () => {
  console.log(`✅ Scale proxy running on http://localhost:${port}`);
});
