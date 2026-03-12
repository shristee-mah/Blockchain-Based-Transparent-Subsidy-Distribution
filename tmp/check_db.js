const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDB() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'subsidy_system'
    });

    const [rows] = await connection.execute('SELECT * FROM applications');
    console.log(JSON.stringify(rows, null, 2));
    await connection.end();
}

checkDB().catch(console.error);
