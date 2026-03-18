const http = require('http');

console.log('🔍 WORKING BLOCKCHAIN API (No JSON Error):');
console.log('==========================================\n');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/blockchain/logs?itemId=1',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log('✅ Status:', res.statusCode);
  console.log('📄 Content-Type:', res.headers['content-type']);
  console.log('');
  
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('🎉 SUCCESS! Valid JSON response:');
      console.log('');
      
      parsed.forEach((event, index) => {
        console.log((index + 1) + '. ' + event.eventName);
        console.log('   📦 Block: ' + event.blockNumber);
        console.log('   🔗 Transaction: ' + event.transactionHash.substring(0, 20) + '...');
        console.log('   ⏰  Time: ' + new Date(event.timestamp).toLocaleString());
        console.log('');
      });
      
      console.log('💡 This replaces the broken receipt API!');
      console.log('🔗 Same blockchain data, no IPFS dependency!');
      
    } catch (e) {
      console.log('❌ JSON Parse Error:', e.message);
    }
  });
});

req.on('error', (e) => console.error('❌ Request Error:', e.message));
req.end();
