import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    service: "scale-monitor-api"
  });
});

// Get weight reading by IP/FQDN and scale name
app.get("/api/v1/weight/:endpoint/:scaleName", async (req, res) => {
  const { endpoint, scaleName } = req.params;
  const { port = "8000" } = req.query;
  
  // Clean endpoint (remove http/https if present)
  const cleanEndpoint = endpoint.replace(/^https?:\/\//, '');
  const targetUrl = `http://${cleanEndpoint}:${port}/scales/${scaleName}/weight`;

  try {
    const startTime = Date.now();
    const response = await fetch(targetUrl, { 
      timeout: 5000 // 5 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`Scale responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: {
        weight: data.weight || data,
        unit: data.unit || "kg",
        scale_name: scaleName,
        endpoint: cleanEndpoint,
        timestamp: new Date().toISOString(),
        response_time_ms: responseTime
      }
    });
  } catch (err) {
    console.error(`Error fetching from ${targetUrl}:`, err.message);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch scale data", 
      details: err.message,
      scale_name: scaleName,
      endpoint: cleanEndpoint,
      target_url: targetUrl,
      timestamp: new Date().toISOString()
    });
  }
});

// Get weight readings from multiple scales
app.post("/api/v1/weight/batch", async (req, res) => {
  const { scales, port = "8000" } = req.body;
  
  if (!scales || !Array.isArray(scales)) {
    return res.status(400).json({
      success: false,
      error: "Invalid request body. Expected 'scales' array with {endpoint, scaleName} objects"
    });
  }

  const results = await Promise.allSettled(
    scales.map(async ({ endpoint, scaleName, customPort }) => {
      const cleanEndpoint = endpoint.replace(/^https?:\/\//, '');
      const scalePort = customPort || port;
      const targetUrl = `http://${cleanEndpoint}:${scalePort}/scales/${scaleName}/weight`;
      
      try {
        const startTime = Date.now();
        const response = await fetch(targetUrl, { timeout: 5000 });
        
        if (!response.ok) {
          throw new Error(`Scale responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        const responseTime = Date.now() - startTime;
        
        return {
          success: true,
          scale_name: scaleName,
          endpoint: cleanEndpoint,
          weight: data.weight || data,
          unit: data.unit || "kg",
          response_time_ms: responseTime,
          timestamp: new Date().toISOString()
        };
      } catch (err) {
        return {
          success: false,
          scale_name: scaleName,
          endpoint: cleanEndpoint,
          error: err.message,
          target_url: targetUrl,
          timestamp: new Date().toISOString()
        };
      }
    })
  );

  const processedResults = results.map(result => result.value);
  const successCount = processedResults.filter(r => r.success).length;
  
  res.json({
    success: true,
    total_scales: scales.length,
    successful_readings: successCount,
    failed_readings: scales.length - successCount,
    results: processedResults,
    timestamp: new Date().toISOString()
  });
});

// Get all available scales from an endpoint (discovery)
app.get("/api/v1/discover/:endpoint", async (req, res) => {
  const { endpoint } = req.params;
  const { port = "8000" } = req.query;
  
  const cleanEndpoint = endpoint.replace(/^https?:\/\//, '');
  const targetUrl = `http://${cleanEndpoint}:${port}/scales`;

  try {
    const response = await fetch(targetUrl, { timeout: 5000 });
    
    if (!response.ok) {
      throw new Error(`Endpoint responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    res.json({
      success: true,
      endpoint: cleanEndpoint,
      scales: data,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(`Error discovering scales from ${targetUrl}:`, err.message);
    res.status(500).json({ 
      success: false,
      error: "Failed to discover scales", 
      details: err.message,
      endpoint: cleanEndpoint,
      target_url: targetUrl,
      timestamp: new Date().toISOString()
    });
  }
});

// API documentation endpoint
app.get("/api/v1/docs", (req, res) => {
  res.json({
    title: "Scale Monitor API",
    version: "1.0.0",
    base_url: `http://localhost:${PORT}`,
    endpoints: {
      "GET /health": "Health check",
      "GET /api/v1/weight/:endpoint/:scaleName": {
        description: "Get weight reading from a specific scale",
        parameters: {
          endpoint: "IP address or FQDN of the scale server",
          scaleName: "Name of the scale",
          port: "Port number (optional, default: 8000)"
        },
        example: `/api/v1/weight/192.168.1.100/scale_left?port=8000`
      },
      "POST /api/v1/weight/batch": {
        description: "Get weight readings from multiple scales",
        body: {
          scales: [
            { endpoint: "192.168.1.100", scaleName: "scale_left" },
            { endpoint: "192.168.1.101", scaleName: "scale_right", customPort: "8001" }
          ],
          port: "8000"
        }
      },
      "GET /api/v1/discover/:endpoint": {
        description: "Discover available scales on an endpoint",
        parameters: {
          endpoint: "IP address or FQDN of the scale server",
          port: "Port number (optional, default: 8000)"
        }
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    available_endpoints: [
      'GET /health',
      'GET /api/v1/docs',
      'GET /api/v1/weight/:endpoint/:scaleName',
      'POST /api/v1/weight/batch',
      'GET /api/v1/discover/:endpoint'
    ],
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`✅ Scale Monitor API running on http://localhost:${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api/v1/docs`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
});