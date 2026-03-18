const http = require('http');

// Simple test to show blockchain API structure
function testBlockchainStructure() {
  console.log('=== Blockchain Update Monitoring ===\n');
  
  // Test different endpoints to see what's available
  testEndpoint('/api/blockchain/logs?itemId=1', 'GET');
  testEndpoint('/api/blockchain/receipt', 'POST', { itemId: 1, dbId: 'APP-123' });
}

function testEndpoint(path, method, data = null) {
  console.log(`Testing ${method} ${path}...`);
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: path,
    method: method,
    headers: {}
  };

  if (data && method === 'POST') {
    const postData = JSON.stringify(data);
    options.headers['Content-Type'] = 'application/json';
    options.headers['Content-Length'] = Buffer.byteLength(postData);
    
    const req = http.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log('Response:', responseData.substring(0, 200) + '...');
        console.log('---\n');
      });
    });

    req.on('error', (e) => {
      console.error(`Error: ${e.message}`);
      console.log('---\n');
    });

    req.write(postData);
    req.end();
  } else {
    const req = http.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log('Response:', responseData.substring(0, 200) + '...');
        console.log('---\n');
      });
    });

    req.on('error', (e) => {
      console.error(`Error: ${e.message}`);
      console.log('---\n');
    });

    req.end();
  }
}

// Manual blockchain monitoring example
function showManualMonitoring() {
  console.log('\n=== Manual Blockchain Monitoring Methods ===\n');
  
  console.log('1. Direct Contract Query:');
  console.log('   - Use ethers.js to query contract directly');
  console.log('   - Check: contract.getItem(itemId)');
  console.log('   - Check: contract.getDocuments(itemId)');
  
  console.log('\n2. Event Listening:');
  console.log('   - Listen for: ItemCreated, ItemVerified, DocumentUploaded');
  console.log('   - Real-time updates via WebSocket');
  
  console.log('\n3. Block Explorer:');
  console.log('   - Visit: http://localhost:8545 (if Hardhat network)');
  console.log('   - Search transaction hashes');
  console.log('   - View contract interactions');
  
  console.log('\n4. API Polling:');
  console.log('   - GET /api/blockchain/logs?itemId=X');
  console.log('   - POST /api/blockchain/receipt');
  console.log('   - GET /api/blockchain/receipt?receiptId=XXX');
}

// Show how to create a blockchain update
function showCreatingUpdate() {
  console.log('\n=== Creating Blockchain Updates ===\n');
  
  console.log('To create blockchain updates, use these APIs:');
  console.log('1. POST /api/blockchain/verify - Admin verification');
  console.log('2. POST /api/blockchain/transport - Transporter submission');
  console.log('3. POST /api/blockchain/distribute - Distributor submission');
  console.log('4. POST /api/blockchain/claim - Beneficiary claim');
  
  console.log('\nExample curl commands:');
  console.log('# Admin verification');
  console.log('curl -X POST http://localhost:3001/api/blockchain/verify \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"itemId": 1, "currentStage": 0, "dbId": "APP-123"}\'');
  
  console.log('\n# Transporter submission');
  console.log('curl -X POST http://localhost:3001/api/blockchain/transport \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"itemId": 1, "CID": "QmTest123", "dbId": "APP-123"}\'');
}

// Run all demonstrations
testBlockchainStructure();
showManualMonitoring();
showCreatingUpdate();

console.log('\n=== Next Steps ===');
console.log('1. Make sure blockchain node is running (Hardhat network)');
console.log('2. Deploy contract if not done: npm run deploy');
console.log('3. Create some test data in the system');
console.log('4. Then test the APIs above to see real blockchain updates');
