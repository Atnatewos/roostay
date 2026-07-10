// scripts/migrate-host-application.js
// Database migration script for Phase 3 - Bucket 1 (Host Application System)
// Extends the user_verifications table to support host application data
// Uses the DATABASE_URL from the local .env file
// Author: Theron

require('dotenv').config();
const { Pool } = require('pg');

// Initialize database pool using environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Required for Neon/Serverless Postgres
});

/**
 * Executes the host application migration.
 * Adds new columns for hosting experience, property count, and motivation.
 * Updates the id_type constraint and creates a partial index for admin queries.
 */
async function migrate() {
  console.log('🔄 Starting Host Application migration...\n');

  const client = await pool.connect();
  
  try {
    // 1. Add hosting_experience column
    console.log('Step 1/5: Adding hosting_experience column...');
    await client.query(`
      ALTER TABLE user_verifications 
      ADD COLUMN IF NOT EXISTS hosting_experience VARCHAR(20)
      CHECK (hosting_experience IN ('yes', 'no'))
    `);

    // 2. Add property_count column
    console.log('Step 2/5: Adding property_count column...');
    await client.query(`
      ALTER TABLE user_verifications 
      ADD COLUMN IF NOT EXISTS property_count VARCHAR(20)
      CHECK (property_count IN ('1-2', '3-5', '5+'))
    `);

    // 3. Add motivation column
    console.log('Step 3/5: Adding motivation column...');
    await client.query(`
      ALTER TABLE user_verifications 
      ADD COLUMN IF NOT EXISTS motivation TEXT
    `);

    // 4. Update id_type constraint
    console.log('Step 4/5: Updating id_type constraint...');
    await client.query(`
      ALTER TABLE user_verifications 
      DROP CONSTRAINT IF EXISTS user_verifications_id_type_check
    `);
    await client.query(`
      ALTER TABLE user_verifications 
      ADD CONSTRAINT user_verifications_id_type_check 
      CHECK (id_type IN ('kebele_id', 'passport', 'drivers_license', 'national_id'))
    `);

    // 5. Add partial index for admin review queries
    console.log('Step 5/5: Creating partial index for pending applications...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_verifications_status 
      ON user_verifications(status) 
      WHERE status = 'pending'
    `);

    console.log('\n✅ Migration completed successfully!');
    console.log('📊 Your database is now ready for the "Become a Host" feature.\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Execute the migration
migrate();