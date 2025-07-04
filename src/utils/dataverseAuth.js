// src/utils/dataverseAuth.js - Complete fixed version

// Your Dataverse configuration
const DATAVERSE_CONFIG = {
  tenantId: 'c764b4ba-20a3-486e-9858-9819d9d28cc2',
  clientId: 'f75b8156-0bb1-4b05-a101-6514dcc1b4fa',
  dataverseUrl: 'https://orgf24d25bd.crm4.dynamics.com',
  // Common possible table names - we'll try these in order
  possibleTableNames: [
    'cr417_bc_weightregistrations',   // All lowercase (most likely correct)
    'cr417_BC_WeightRegistrations',   // Original
    'cr417_weightregistrations',      // Without BC prefix
    'cr417_weightregistration',       // Singular
    'cr417_bc_weightregistration',    // Singular with BC
    'BC_WeightRegistrations',         // Without cr417 prefix
    'weightregistrations'             // Simple name
  ],
  scope: 'https://orgf24d25bd.crm4.dynamics.com/user_impersonation'
};

// Authentication state
let authState = {
  isAuthenticated: false,
  accessToken: null,
  expiresAt: null,
  user: null
};

// Initialize function
export const initializeMsal = async () => {
  console.log('Initializing Dataverse authentication...');
  
  // Check if we have a token in localStorage
  const storedToken = localStorage.getItem('dataverse_access_token');
  const storedExpiry = localStorage.getItem('dataverse_token_expiry');
  
  if (storedToken && storedExpiry) {
    const expiryTime = parseInt(storedExpiry);
    if (Date.now() < expiryTime) {
      authState.isAuthenticated = true;
      authState.accessToken = storedToken;
      authState.expiresAt = expiryTime;
      console.log('Found valid stored token');
    } else {
      // Token expired, clean up
      localStorage.removeItem('dataverse_access_token');
      localStorage.removeItem('dataverse_token_expiry');
      console.log('Stored token expired, removed');
    }
  }
  
  return Promise.resolve();
};

// Build authentication URL with proper Azure AD endpoints
const buildAuthUrl = () => {
  const redirectUri = encodeURIComponent(window.location.origin + '/auth-callback.html');
  const scope = encodeURIComponent(DATAVERSE_CONFIG.scope);
  const state = encodeURIComponent('dataverse-auth-' + Date.now());
  const nonce = encodeURIComponent('auth-' + Math.random().toString(36).substring(2));

  const authUrl = `https://login.microsoftonline.com/${DATAVERSE_CONFIG.tenantId}/oauth2/v2.0/authorize` +
    `?client_id=${DATAVERSE_CONFIG.clientId}` +
    `&response_type=token` +
    `&redirect_uri=${redirectUri}` +
    `&scope=${scope}` +
    `&response_mode=fragment` +
    `&state=${state}` +
    `&nonce=${nonce}` +
    `&prompt=select_account`;

  console.log('Auth URL:', authUrl);
  return authUrl;
};

// Login function using popup with static auth callback page
export const loginToDataverse = async () => {
  return new Promise((resolve, reject) => {
    const authUrl = buildAuthUrl();
    
    console.log('Opening auth popup to Azure AD...');
    const popup = window.open(
      authUrl,
      'azure-auth',
      'width=500,height=700,scrollbars=yes,resizable=yes,left=' + 
      Math.round(window.screen.width / 2 - 250) + ',top=' + 
      Math.round(window.screen.height / 2 - 350)
    );

    if (!popup) {
      reject(new Error('Popup was blocked. Please allow popups for this site.'));
      return;
    }

    // Handle popup messages
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      
      console.log('Received message from popup:', event.data);
      
      if (event.data.type === 'AZURE_AUTH_SUCCESS') {
        const { accessToken, expiresIn } = event.data;
        const expiryTime = Date.now() + (parseInt(expiresIn) * 1000);
        
        authState.isAuthenticated = true;
        authState.accessToken = accessToken;
        authState.expiresAt = expiryTime;
        
        localStorage.setItem('dataverse_access_token', accessToken);
        localStorage.setItem('dataverse_token_expiry', expiryTime.toString());
        
        window.removeEventListener('message', handleMessage);
        
        console.log('Authentication successful');
        resolve({
          accessToken: accessToken,
          expiresAt: expiryTime
        });
        
      } else if (event.data.type === 'AZURE_AUTH_ERROR') {
        window.removeEventListener('message', handleMessage);
        
        console.error('Authentication error:', event.data.error);
        reject(new Error(event.data.error || 'Authentication failed'));
      }
    };

    window.addEventListener('message', handleMessage);

    // Check if popup was closed manually
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
        reject(new Error('Login was cancelled'));
      }
    }, 1000);

    // Timeout after 5 minutes
    setTimeout(() => {
      if (!popup.closed) {
        popup.close();
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
        reject(new Error('Login timeout'));
      }
    }, 300000); // 5 minutes
  });
};

// Get access token
export const getDataverseToken = async () => {
  // Check if token is still valid
  if (authState.isAuthenticated && authState.expiresAt && Date.now() < authState.expiresAt) {
    return authState.accessToken;
  }
  
  // Check localStorage for valid token
  const storedToken = localStorage.getItem('dataverse_access_token');
  const storedExpiry = localStorage.getItem('dataverse_token_expiry');
  
  if (storedToken && storedExpiry) {
    const expiryTime = parseInt(storedExpiry);
    if (Date.now() < expiryTime) {
      authState.isAuthenticated = true;
      authState.accessToken = storedToken;
      authState.expiresAt = expiryTime;
      return storedToken;
    } else {
      // Token expired
      localStorage.removeItem('dataverse_access_token');
      localStorage.removeItem('dataverse_token_expiry');
      authState.isAuthenticated = false;
      authState.accessToken = null;
      authState.expiresAt = null;
    }
  }
  
  throw new Error('No valid authentication token found. Please login first.');
};

// Check if user is authenticated
export const isAuthenticated = () => {
  // Check memory first
  if (authState.isAuthenticated && authState.expiresAt && Date.now() < authState.expiresAt) {
    return true;
  }
  
  // Check localStorage
  const storedToken = localStorage.getItem('dataverse_access_token');
  const storedExpiry = localStorage.getItem('dataverse_token_expiry');
  
  if (storedToken && storedExpiry) {
    const expiryTime = parseInt(storedExpiry);
    if (Date.now() < expiryTime) {
      return true;
    } else {
      // Clean up expired token
      localStorage.removeItem('dataverse_access_token');
      localStorage.removeItem('dataverse_token_expiry');
    }
  }
  
  return false;
};

// Function to find the correct table name
export const findCorrectTableName = async () => {
  try {
    const token = await getDataverseToken();
    
    // Try each possible table name
    for (const tableName of DATAVERSE_CONFIG.possibleTableNames) {
      try {
        console.log(`Testing table name: ${tableName}`);
        
        const response = await fetch(
          `${DATAVERSE_CONFIG.dataverseUrl}/api/data/v9.2/${tableName}?$top=1`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
              'OData-MaxVersion': '4.0',
              'OData-Version': '4.0',
            }
          }
        );

        if (response.ok) {
          console.log(`✅ Found correct table name: ${tableName}`);
          return tableName;
        }
      } catch (error) {
        console.log(`❌ Table ${tableName} not found:`, error.message);
      }
    }
    
    throw new Error('Could not find the weight registration table. Please check the table name in Dataverse.');
  } catch (error) {
    console.error('Error finding correct table name:', error);
    throw error;
  }
};

// Function to discover all tables (for debugging)
export const discoverDataverseTables = async () => {
  try {
    const token = await getDataverseToken();
    
    // Search for tables that might contain weight registration data
    const searchTerms = ['cr417', 'weight', 'registration', 'bc'];
    
    for (const term of searchTerms) {
      console.log(`\n🔍 Searching for tables containing "${term}"...`);
      
      const response = await fetch(
        `${DATAVERSE_CONFIG.dataverseUrl}/api/data/v9.2/EntityDefinitions?$select=LogicalName,DisplayName&$filter=contains(tolower(LogicalName),'${term.toLowerCase()}') or contains(tolower(DisplayName),'${term.toLowerCase()}')`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0',
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.value && data.value.length > 0) {
          console.log(`Found tables for "${term}":`, data.value.map(t => ({
            LogicalName: t.LogicalName,
            DisplayName: t.DisplayName
          })));
        } else {
          console.log(`No tables found for "${term}"`);
        }
      }
    }
  } catch (error) {
    console.error('Error discovering tables:', error);
  }
};

// Logout function
export const logoutFromDataverse = async () => {
  authState.isAuthenticated = false;
  authState.accessToken = null;
  authState.expiresAt = null;
  authState.user = null;
  
  localStorage.removeItem('dataverse_access_token');
  localStorage.removeItem('dataverse_token_expiry');
  
  console.log('Logged out from Dataverse');
};

// Submit weight registration to Dataverse with automatic table name detection
export const submitWeightRegistration = async (scaleName, weight, ssccNumber) => {
  try {
    const token = await getDataverseToken();
    
    // Try different field name variations
    const fieldVariations = [
      {
        sscc: 'cr417_sscc_no',     // All lowercase (most likely correct)
        weight: 'cr417_weight'
      },
      {
        sscc: 'cr417_SSCC_No',     // Original mixed case
        weight: 'cr417_Weight'
      },
      {
        sscc: 'cr417_SSCC_NO',     // All uppercase
        weight: 'cr417_WEIGHT'
      },
      {
        sscc: 'sscc_no',           // Without prefix
        weight: 'weight'
      }
    ];

    console.log('Submitting to Dataverse:', { scaleName, weight, ssccNumber });

    // First, try to find the correct table name
    let tableName = localStorage.getItem('dataverse_table_name');
    
    if (!tableName) {
      console.log('🔍 Table name not cached, searching for correct table...');
      try {
        tableName = await findCorrectTableName();
        localStorage.setItem('dataverse_table_name', tableName);
      } catch (error) {
        console.error('Could not find table name automatically. Trying original name...');
        tableName = DATAVERSE_CONFIG.possibleTableNames[0]; // Use first name as fallback
      }
    }

    console.log(`📝 Using table name: ${tableName}`);

    // Try different field name combinations
    let lastError = null;
    
    for (let i = 0; i < fieldVariations.length; i++) {
      const fields = fieldVariations[i];
      
      const registrationData = {
        [fields.sscc]: ssccNumber,
        [fields.weight]: parseFloat(weight),
      };

      console.log(`Attempt ${i + 1}: Using field names:`, fields);
      console.log('Registration data:', registrationData);

      try {
        const response = await fetch(
          `${DATAVERSE_CONFIG.dataverseUrl}/api/data/v9.2/${tableName}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'OData-MaxVersion': '4.0',
              'OData-Version': '4.0',
              'Accept': 'application/json',
            },
            body: JSON.stringify(registrationData),
          }
        );

        if (response.ok) {
          console.log('✅ Successfully found correct field names:', fields);
          
          // Cache the working field names
          localStorage.setItem('dataverse_field_names', JSON.stringify(fields));
          
          // Handle successful response
          const locationHeader = response.headers.get('Location');
          let result = {};
          
          try {
            const responseText = await response.text();
            if (responseText) {
              result = JSON.parse(responseText);
            }
          } catch (parseError) {
            console.log('Empty response body, using Location header:', parseError.message);
          }

          // Extract ID from location header if available
          let recordId = result[`${tableName}id`] || result.id;
          if (!recordId && locationHeader) {
            const matches = locationHeader.match(/\(([^)]+)\)/);
            if (matches) {
              recordId = matches[1];
            }
          }

          console.log('Successfully submitted to Dataverse:', { recordId, location: locationHeader });
          
          return {
            success: true,
            id: recordId || locationHeader,
            data: registrationData,
            tableName: tableName,
            fieldNames: fields
          };
        } else {
          const errorText = await response.text();
          lastError = `HTTP ${response.status}: ${errorText}`;
          console.log(`❌ Attempt ${i + 1} failed:`, lastError);
        }
      } catch (error) {
        lastError = error.message;
        console.log(`❌ Attempt ${i + 1} failed:`, lastError);
      }
    }

    // If we get here, all attempts failed
    console.error('All field name attempts failed. Last error:', lastError);
    
    // If table not found, clear cached table name and try discovery
    if (lastError && lastError.includes('404')) {
      console.log('❌ Table not found, clearing cache and trying discovery...');
      localStorage.removeItem('dataverse_table_name');
      
      // Show discovery information
      alert(`❌ Table "${tableName}" not found in Dataverse. 

Please check the browser console for a list of available tables, or verify the correct table name in your Dataverse environment.

The error details: ${lastError}`);
      
      // Run discovery to help user find correct table
      await discoverDataverseTables();
      
      throw new Error(`Table "${tableName}" not found. Check console for available tables.`);
    }
    
    // Handle authentication errors
    if (lastError && lastError.includes('401')) {
      authState.isAuthenticated = false;
      authState.accessToken = null;
      localStorage.removeItem('dataverse_access_token');
      localStorage.removeItem('dataverse_token_expiry');
      throw new Error('Authentication expired. Please login again.');
    }
    
    throw new Error(`Failed to submit after trying all field name variations. Last error: ${lastError}`);
    
  } catch (error) {
    console.error('Error submitting to Dataverse:', error);
    throw error;
  }
};

export { DATAVERSE_CONFIG };