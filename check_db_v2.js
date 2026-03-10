const mysql = require('mysql2/promise');

const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "subsidy_system",
});

async function main() {
    try {
        const [rows] = await db.execute("DESCRIBE applications;");
        console.log("Applications table schema:");
        console.table(rows);

        const [rows2] = await db.execute("SELECT * FROM applications LIMIT 5;");
        console.log("Sample data from applications:");
        console.table(rows2);

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

main();
