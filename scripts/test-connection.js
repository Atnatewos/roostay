// scripts/test-connection.js
// Simple database connection test
// Usage: npm run db:test

require('dotenv').config();

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function test() {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  ROOSTAY - Database Connection Test');
  console.log('═══════════════════════════════════════════');
  console.log('');

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('FATAL: DATABASE_URL is not set in .env');
    process.exit(1);
  }

  // Show sanitized connection info
  const parsed = new URL(connectionString);
  console.log('Host:', parsed.hostname);
  console.log('Database:', parsed.pathname.replace('/', ''));
  console.log('User:', parsed.username);
  console.log('SSL:', parsed.searchParams.get('sslmode') || 'default');
  console.log('');

  // Direct pool test - zero config processing
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('Connecting...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    client.release();

    console.log('');
    console.log('SUCCESS - Connected to Neon database!');
    console.log('Server time:', result.rows[0].current_time);

    // Check for existing tables
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    if (tables.rows.length > 0) {
      console.log('');
      console.log(`Existing tables (${tables.rows.length}):`);
      tables.rows.forEach(t => console.log('  -', t.table_name));
    } else {
      console.log('');
      console.log('No tables yet. Run "npm run setup" to create schema.');
    }

  } catch (error) {
    console.error('');
    console.error('FAILED:', error.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('  1. Go to https://console.neon.tech');
    console.error('  2. Check if project is active');
    console.error('  3. Reset password under Settings → Roles');
    console.error('  4. Get a fresh connection string');
    process.exit(1);
  } finally {
    await pool.end();
  }

  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  Test complete!');
  console.log('═══════════════════════════════════════════');
  console.log('');
}

test();