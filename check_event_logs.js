const mysql = require('mysql2/promise');

async function checkEventLogs() {
  try {
    const db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'subsidy_system'
    });
    
    console.log('=== Checking applications table for event logs ===');
    const [apps] = await db.execute('SELECT * FROM applications ORDER BY created_at DESC LIMIT 10');
    console.log('Applications:', apps.length);
    apps.forEach(app => {
      console.log(`ID: ${app.id}, BC_ID: ${app.blockchain_itemId}, Stage: ${app.current_stage}, Status: ${app.status}, Created: ${app.created_at}`);
    });
    
    console.log('\n=== Checking blockchain_events table ===');
    try {
      const [events] = await db.execute('SELECT * FROM blockchain_events ORDER BY timestamp DESC LIMIT 10');
      console.log('Blockchain events:', events.length);
      events.forEach(event => {
        console.log(`ID: ${event.id}, ItemID: ${event.item_id}, Event: ${event.event_name}, Timestamp: ${event.timestamp}`);
      });
    } catch (err) {
      console.log('Blockchain events table may not exist:', err.message);
    }
    
    await db.end();
  } catch (error) {
    console.error('Database error:', error.message);
  }
}

checkEventLogs();
