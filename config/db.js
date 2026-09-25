import mysql from "mysql2/promise";
import config from "./env.js";

const pool = mysql.createPool({
  host: config.db.host,
  user: config.db.user,
  password: config.db.pass,
  database: config.db.name,
  waitForConnections: true,
  connectionLimit: 10,
});
export default pool;
