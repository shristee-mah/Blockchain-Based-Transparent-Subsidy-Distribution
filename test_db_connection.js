const mysql = require('mysql2/promise');

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection...');
    
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'subsidy_system'
    });
    
    console.log('✅ Database connected successfully');
    
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 Tables found:', tables.length);
    tables.forEach(table => console.log('  -', Object.values(table)[0]));
    
    // Check if blockchain_transactions table has data
    const [txCount] = await connection.execute('SELECT COUNT(*) as count FROM blockchain_transactions');
    console.log('📊 Blockchain transactions in database:', txCount[0].count);
    
    // Check if items table has data
    const [itemCount] = await connection.execute('SELECT COUNT(*) as count FROM items');
    console.log('📦 Items in database:', itemCount[0].count);
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

testDatabase();
