const mysql = require('mysql2');
require('dotenv').config();

const DB_NAME = process.env.DB_NAME || 'BrightFutureUniversity';
const baseConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: Number(process.env.DB_PORT || 3306)
};

const poolConfig = {
  ...baseConfig,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

function quoteIdentifier(name) {
  return `\`${String(name).replace(/`/g, '``')}\``;
}

async function ensureDatabaseExists() {
  const admin = mysql.createConnection(baseConfig).promise();
  try {
    await admin.query(`CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(DB_NAME)}`);
  } finally {
    await admin.end();
  }
}

const ready = (async () => {
  await ensureDatabaseExists();
  pool = mysql.createPool(poolConfig);
  return pool.promise();
})();

async function query(sql, params) {
  const db = await ready;
  return db.query(sql, params);
}

async function execute(sql, params) {
  const db = await ready;
  return db.execute(sql, params);
}

async function getConnection() {
  const db = await ready;
  return db.getConnection();
}

module.exports = {
  query,
  execute,
  getConnection,
  ready,
  ensureDatabaseExists
};
