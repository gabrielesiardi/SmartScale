# Scale Monitor API

## Quick Start

Start the server:
```bash
npm run dev
# or
node server.js
```

## API Endpoints

### 1. Single Scale Reading
```bash
GET /api/v1/weight/:endpoint/:scaleName?port=8000
```

**Example:**
```bash
curl http://localhost:5173/api/v1/weight/192.168.1.100/scale_left
```

**Response:**
```json
{
  "success": true,
  "data": {
    "weight": 125.5,
    "unit": "kg",
    "scale_name": "scale_left",
    "endpoint": "192.168.1.100",
    "timestamp": "2025-07-02T10:30:00.000Z",
    "response_time_ms": 150
  }
}
```

### 2. Batch Scale Readings
```bash
POST /api/v1/weight/batch
```

**Example:**
```bash
curl -X POST http://localhost:5173/api/v1/weight/batch \
  -H "Content-Type: application/json" \
  -d '{
    "scales": [
      {"endpoint": "192.168.1.100", "scaleName": "scale_left"},
      {"endpoint": "192.168.1.101", "scaleName": "scale_right"}
    ]
  }'
```

### 3. Discover Scales
```bash
GET /api/v1/discover/:endpoint?port=8000
```

**Example:**
```bash
curl http://localhost:5173/api/v1/discover/192.168.1.100
```

### 4. Health Check
```bash
GET /health
```

### 5. API Documentation
```bash
GET /api/v1/docs
```

## Integration Examples

### Python
```python
import requests

# Single reading
response = requests.get('http://localhost:5173/api/v1/weight/192.168.1.100/scale_left')
data = response.json()
if data['success']:
    print(f"Weight: {data['data']['weight']} kg")
```

### Node.js
```javascript
const response = await fetch('http://localhost:5173/api/v1/weight/192.168.1.100/scale_left');
const data = await response.json();
if (data.success) {
    console.log(`Weight: ${data.data.weight} kg`);
}
```

### PHP
```php
$response = file_get_contents('http://localhost:5173/api/v1/weight/192.168.1.100/scale_left');
$data = json_decode($response, true);
if ($data['success']) {
    echo "Weight: " . $data['data']['weight'] . " kg";
}
```