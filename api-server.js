import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for registrations (use database in production)
const registrations = [];
const MAX_REGISTRATIONS = 1000;

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
      timeout: 15000 // Increased timeout for Azure to home network
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
        const response = await fetch(targetUrl, { timeout: 15000 });
        
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
    const response = await fetch(targetUrl, { timeout: 15000 });
    
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

// 🆕 NEW BARCODE ENDPOINTS START HERE 🆕

// Endpoint for Raspberry Pi to register weights automatically
app.post("/api/v1/register-weight", async (req, res) => {
  const { scale_name, weight, sscc_number, timestamp, source, raspberry_ip } = req.body;
  
  console.log(`📋 Registration request from ${source || 'unknown'}:`, {
    scale_name,
    weight,
    sscc_number,
    raspberry_ip,
    timestamp: new Date(timestamp * 1000).toISOString()
  });
  
  // Validate required fields
  if (!scale_name || !weight || !sscc_number) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: scale_name, weight, sscc_number",
      timestamp: new Date().toISOString()
    });
  }
  
  // Validate SSCC number (20 digits)
  const ssccRegex = /^\d{20}$/;
  if (!ssccRegex.test(sscc_number)) {
    return res.status(400).json({
      success: false,
      error: "SSCC number must be exactly 20 digits",
      received: sscc_number,
      length: sscc_number.length,
      timestamp: new Date().toISOString()
    });
  }
  
  // Validate weight
  const weightNum = parseFloat(weight);
  if (isNaN(weightNum) || weightNum <= 0) {
    return res.status(400).json({
      success: false,
      error: "Weight must be a positive number",
      received: weight,
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    // Generate unique registration ID
    const registration_id = `REG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create registration record
    const registration = {
      id: registration_id,
      scale_name,
      weight: weightNum,
      sscc_number,
      source: source || 'unknown',
      raspberry_ip: raspberry_ip || req.ip,
      scan_timestamp: timestamp ? new Date(timestamp * 1000) : new Date(),
      processed_timestamp: new Date(),
      status: 'processed'
    };
    
    // Store registration (in production, save to database)
    registrations.unshift(registration);
    
    // Keep only last MAX_REGISTRATIONS entries
    if (registrations.length > MAX_REGISTRATIONS) {
      registrations.splice(MAX_REGISTRATIONS);
    }
    
    console.log(`✅ Registration processed: ${registration_id}`);
    
    res.json({
      success: true,
      registration_id,
      scale_name,
      weight: weightNum,
      sscc_number,
      processed_at: registration.processed_timestamp.toISOString(),
      message: "Weight registration processed successfully"
    });
    
  } catch (error) {
    console.error('❌ Error processing registration:', error);
    res.status(500).json({
      success: false,
      error: "Internal server error processing registration",
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint to get recent registrations (for monitoring)
app.get("/api/v1/registrations", (req, res) => {
  const { limit = 50, scale_name, status } = req.query;
  
  let filteredRegistrations = [...registrations];
  
  // Filter by scale name if specified
  if (scale_name) {
    filteredRegistrations = filteredRegistrations.filter(
      reg => reg.scale_name === scale_name
    );
  }
  
  // Filter by status if specified
  if (status) {
    filteredRegistrations = filteredRegistrations.filter(
      reg => reg.status === status
    );
  }
  
  // Limit results
  const limitNum = parseInt(limit);
  if (limitNum > 0) {
    filteredRegistrations = filteredRegistrations.slice(0, limitNum);
  }
  
  res.json({
    success: true,
    registrations: filteredRegistrations,
    total_count: registrations.length,
    filtered_count: filteredRegistrations.length,
    timestamp: new Date().toISOString()
  });
});

// Endpoint to get registration statistics
app.get("/api/v1/registrations/stats", (req, res) => {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
  
  const stats = {
    total: registrations.length,
    last_24h: registrations.filter(reg => reg.processed_timestamp >= last24h).length,
    last_hour: registrations.filter(reg => reg.processed_timestamp >= lastHour).length,
    by_scale: {},
    by_status: {},
    latest_registration: registrations.length > 0 ? registrations[0].processed_timestamp : null
  };
  
  // Group by scale
  registrations.forEach(reg => {
    stats.by_scale[reg.scale_name] = (stats.by_scale[reg.scale_name] || 0) + 1;
    stats.by_status[reg.status] = (stats.by_status[reg.status] || 0) + 1;
  });
  
  res.json({
    success: true,
    stats,
    timestamp: new Date().toISOString()
  });
});

// API documentation endpoint (UPDATED with new endpoints)
app.get("/api/v1/docs", (req, res) => {
  res.json({
    title: "Scale Monitor API",
    version: "1.1.0",
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
      },
      "POST /api/v1/register-weight": {
        description: "Register a weight measurement (used by barcode readers)",
        body: {
          scale_name: "scale_left",
          weight: 125.5,
          sscc_number: "12345678901234567890",
          timestamp: 1625097600,
          source: "barcode_reader",
          raspberry_ip: "217.57.87.90"
        }
      },
      "GET /api/v1/registrations": {
        description: "Get recent weight registrations",
        parameters: {
          limit: "Number of results (default: 50)",
          scale_name: "Filter by scale name",
          status: "Filter by status (pending/processed/failed)"
        }
      },
      "GET /api/v1/registrations/stats": "Get registration statistics"
    },
    barcode_integration: {
      description: "Barcode readers automatically call POST /api/v1/register-weight",
      flow: [
        "1. User scans barcode with reader connected to Raspberry Pi",
        "2. Python script validates SSCC and gets current weight",
        "3. Script calls POST /api/v1/register-weight",
        "4. API validates and stores registration",
        "5. Optional: Forward to Dataverse or other systems"
      ]
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
      'GET /api/v1/discover/:endpoint',
      'POST /api/v1/register-weight',
      'GET /api/v1/registrations',
      'GET /api/v1/registrations/stats'
    ],
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`✅ Scale Monitor API running on http://localhost:${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api/v1/docs`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
  console.log(`📋 Registrations: http://localhost:${PORT}/api/v1/registrations`);
});