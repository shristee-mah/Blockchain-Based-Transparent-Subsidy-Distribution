const mysql = require('mysql2/promise');

async function checkTable() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'subsidy_system'
    });

    console.log('Checking if approved_subsidy_beneficiaries table exists...');
    
    try {
      const [rows] = await connection.execute('DESCRIBE approved_subsidy_beneficiaries');
      console.log('Table exists! Structure:');
      console.log(rows);
      
      // Get sample data
      const [data] = await connection.execute('SELECT * FROM approved_subsidy_beneficiaries LIMIT 5');
      console.log('\nSample data:');
      console.log(data);
      
    } catch (error) {
      console.log('Table does not exist or error:', error.message);
      
      // Check what tables exist
      const [tables] = await connection.execute('SHOW TABLES');
      console.log('\nAvailable tables:');
      console.log(tables.map(t => Object.values(t)[0]));
    }
    
    await connection.end();
  } catch (error) {
    console.error('Connection error:', error.message);
  }
}

checkTable();
