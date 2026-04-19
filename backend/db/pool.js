const { Pool } = require('pg');

// M5 fix: No hardcoded password fallback — use env vars only
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'booking_admin',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'booking_system',
});

// Log connection errors (don't crash — let retry logic handle)
pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

module.exports = pool;
