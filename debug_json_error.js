const http = require('http');

// Test various endpoints to find the JSON parsing issue
function testEndpoints() {
  console.log('🔍 Testing API endpoints for JSON errors...\n');
  
  const endpoints = [
    '/api/blockchain/logs?itemId=1',
    '/api/blockchain/receipt',
    '/api/blockchain/verify',
    '/api/blockchain/transport'
  ];

  endpoints.forEach((endpoint, index) => {
    testEndpoint(index + 1, endpoint, 'GET');
  });
  
  // Test POST endpoints with proper JSON
  setTimeout(() => {
    console.log('\n📝 Testing POST endpoints...');
    testPostEndpoint('/api/blockchain/receipt', { itemId: 1, dbId: 'APP-123' });
    testPostEndpoint('/api/blockchain/verify', { itemId: 1, currentStage: 0, dbId: 'APP-123' });
  }, 2000);
}

function testEndpoint(num, endpoint, method) {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: endpoint,
    method: method
  };

  const req = http.request(options, (res) => {
    console.log(`${num}. ${method} ${endpoint}`);
    console.log(`   Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        if (data) {
          const parsed = JSON.parse(data);
          console.log('   ✅ Valid JSON response');
          if (Array.isArray(parsed)) {
            console.log(`   📊 Array with ${parsed.length} items`);
          } else if (parsed.error) {
            console.log(`   ❌ API Error: ${parsed.error}`);
          } else {
            console.log('   📄 Object response');
          }
        } else {
          console.log('   ⚠️  Empty response');
        }
      } catch (e) {
        console.log('   ❌ JSON Parse Error:', e.message);
        console.log('   Raw response:', data.substring(0, 200));
      }
      console.log('');
    });
  });

  req.on('error', (e) => {
    console.log(`   ❌ Request Error: ${e.message}`);
    console.log('');
  });

  req.end();
}

function testPostEndpoint(endpoint, data) {
  const postData = JSON.stringify(data);
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: endpoint,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`POST ${endpoint}`);
    console.log(`   Status: ${res.statusCode}`);
    
    let responseData = '';
    res.on('data', (chunk) => { responseData += chunk; });
    res.on('end', () => {
      try {
        if (responseData) {
          const parsed = JSON.parse(responseData);
          console.log('   ✅ Valid JSON response');
          if (parsed.error) {
            console.log(`   ❌ API Error: ${parsed.error}`);
          }
        } else {
          console.log('   ⚠️  Empty response');
        }
      } catch (e) {
        console.log('   ❌ JSON Parse Error:', e.message);
        console.log('   Raw response:', responseData.substring(0, 200));
      }
      console.log('');
    });
  });

  req.on('error', (e) => {
    console.log(`   ❌ Request Error: ${e.message}`);
    console.log('');
  });

  req.write(postData);
  req.end();
}

// Run the test
testEndpoints();
