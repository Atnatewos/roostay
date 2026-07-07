// packages/database/migrate.js
// Database migration runner - executes schema.sql against the database
// Reads the SQL file and executes it in a single transaction
// Safe to run multiple times due to IF NOT EXISTS clauses

const fs = require('fs');
const path = require('path');
const { getPool, closePool } = require('./pool');
const config = require('@roostay/config');

/**
 * Reads and executes the schema.sql file to set up or update the database.
 * Uses a transaction to ensure all-or-nothing execution.
 * All CREATE statements use IF NOT EXISTS for idempotent migration.
 *
 * @returns {Promise<void>}
 */
async function migrate() {
  const pool = getPool();
  const client = await pool.connect();

  // Read the schema file
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');

  console.log('Starting database migration...');
  console.log('Environment:', config.app.env);
  console.log('Database:', config.database.database);

  try {
    // Execute in a transaction for atomicity
    await client.query('BEGIN');
    await client.query(schemaSQL);
    await client.query('COMMIT');

    console.log('Database migration completed successfully.');
    console.log('Tables created:', config.app.name, 'is ready for use.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database migration failed:', error.message);
    console.error('Error details:', {
      code: error.code,
      position: error.position,
      hint: error.hint,
    });
    process.exit(1);
  } finally {
    client.release();
    await closePool();
  }
}

// Run migration if executed directly
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('Migration complete.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error.message);
      process.exit(1);
    });
}

module.exports = { migrate };