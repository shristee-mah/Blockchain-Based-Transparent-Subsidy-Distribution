const http = require('http');

function testBlockchainAPI() {
  console.log('=== Testing Blockchain API ===\n');
  
  // Test 1: Get blockchain logs for itemId=1
  testLogs();
  
  // Test 2: Get receipt (your example)
  testReceipt();
}

function testLogs() {
  console.log('1. Testing Blockchain Logs API...');
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/blockchain/logs?itemId=1',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        console.log('Blockchain Events:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('Raw Response:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`Error: ${e.message}`);
  });

  req.end();
}

function testReceipt() {
  console.log('\n2. Testing Receipt API (your example)...');
  
  const postData = JSON.stringify({
    itemId: 1,
    dbId: 'APP-123'
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/blockchain/receipt',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        console.log('Receipt Response:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('Raw Response:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`Error: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

// Run tests
testBlockchainAPI();
