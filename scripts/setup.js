// scripts/setup.js
// Database setup - drops and recreates all tables from schema.sql
// Idempotent: safe to run multiple times
// Usage: npm run setup

require('dotenv').config();

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function setup() {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  ROOSTAY - Database Setup');
  console.log('═══════════════════════════════════════════');
  console.log('');

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('FATAL: DATABASE_URL not set in .env');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  try {
    console.log('[1/4] Testing connection...');
    await pool.query('SELECT 1');
    console.log('Connection OK.');

    console.log('[2/4] Dropping existing tables...');
    await pool.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);
    console.log('Existing tables dropped.');

    console.log('[3/4] Reading schema...');
    const schemaPath = path.join(__dirname, '..', 'packages', 'database', 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');
    console.log(`Schema loaded (${(schemaSQL.length / 1024).toFixed(1)} KB).`);

    console.log('[4/4] Creating tables...');
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(schemaSQL);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `);

    console.log('');
    console.log(`Created ${tables.rows.length} tables:`);
    tables.rows.forEach((t, i) => console.log(`  ${i + 1}. ${t.table_name}`));

    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('  Database setup complete!');
    console.log('═══════════════════════════════════════════');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('Setup failed:', error.message);
    if (error.position) {
      console.error('Error near SQL position:', error.position);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setup();