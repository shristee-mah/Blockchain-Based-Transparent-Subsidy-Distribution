const mysql = require('mysql2/promise');

async function test() {
  try {
    const db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'subsidy_system'
    });

    const [rows] = await db.execute(`
      SELECT COUNT(*) as count 
      FROM approved_subsidy_beneficiaries 
      WHERE kyc_status = 'APPROVED' 
        AND is_active = 1 
        AND (subsidy_claimed = 0 OR subsidy_claimed IS NULL)
    `);
    
    console.log('Approved beneficiaries count:', rows[0].count);
    
    const [beneficiaries] = await db.execute(`
      SELECT id, full_name, phone_number, kyc_status, batch_id
      FROM approved_subsidy_beneficiaries 
      WHERE kyc_status = 'APPROVED' 
        AND is_active = 1 
        AND (subsidy_claimed = 0 OR subsidy_claimed IS NULL)
      LIMIT 3
    `);
    
    console.log('Sample beneficiaries:');
    console.log(beneficiaries);
    
    await db.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
