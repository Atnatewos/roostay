// packages/database/pool.js
// PostgreSQL connection pool for Neon serverless database
// Reads DATABASE_URL directly from environment - zero config processing
// The connection string is passed exactly as-is to pg.Pool

const { Pool } = require('pg');

let pool = null;

/**
 * Creates and returns a PostgreSQL connection pool singleton.
 * Connection string is read from DATABASE_URL environment variable
 * and passed directly to pg.Pool with no modification.
 *
 * @returns {Pool} PostgreSQL connection pool instance
 */
function createPool() {
  if (pool) {
    return pool;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('FATAL: DATABASE_URL environment variable is not set.');
    console.error('Ensure your .env file contains a valid Neon connection string.');
    process.exit(1);
  }

  // Log sanitized connection info in development
  if (process.env.NODE_ENV !== 'production') {
    const safeUrl = connectionString.replace(/\/\/.*@/, '//***:***@');
    console.log('Database pool initialized:', safeUrl);
  }

  pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  pool.on('error', (err) => {
    console.error('Database pool error:', err.message);
  });

  return pool;
}

/**
 * Gracefully closes the connection pool.
 *
 * @returns {Promise<void>}
 */
async function closePool() {
  if (pool) {
    try {
      await pool.end();
      pool = null;
    } catch (error) {
      console.error('Error closing pool:', error.message);
    }
  }
}

/**
 * Tests database connectivity.
 *
 * @param {number} [retries=2] - Maximum connection attempts
 * @returns {Promise<boolean>} True if connection succeeded
 */
async function testConnection(retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as time');
      client.release();
      console.log('Database connected. Server time:', result.rows[0].time);
      return true;
    } catch (error) {
      console.error(`Connection attempt ${attempt}/${retries} failed: ${error.message}`);
      if (attempt < retries) {
        const delay = attempt * 1000;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  return false;
}

module.exports = {
  getPool: createPool,
  closePool,
  testConnection,
};