import mysql from "mysql2/promise";

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "", // default XAMPP password is empty
  database: "subsidy_system", // your database name
});

export default db;