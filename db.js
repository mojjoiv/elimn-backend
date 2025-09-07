const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'dev',
  password: process.env.PGPASSWORD || 'secret',
  database: process.env.PGDATABASE || 'appdb'
});

pool.on('error', (err) => {
  console.error('Unexpected pg client error', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect()
};
