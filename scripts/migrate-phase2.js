// scripts/migrate-phase2.js
// Phase 2 Database Migration - Payment Expiry & Transaction Tracking
// Run with: node scripts/migrate-phase2.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  console.log('🔄 Starting Phase 2 migration...');
  console.log('📡 Connecting to database...\n');

  try {
    // 1. Add payment expiry timestamp to bookings
    console.log('Step 1/4: Adding payment_expires_at column to bookings...');
    await pool.query(`
      ALTER TABLE bookings 
      ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMPTZ
    `);
    console.log('✅ Column added successfully\n');

    // 2. Create partial index for efficient expiry queries
    console.log('Step 2/4: Creating expiry index...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_payment_expires 
      ON bookings(payment_expires_at) 
      WHERE status = 'pending' AND payment_expires_at IS NOT NULL
    `);
    console.log('✅ Index created successfully\n');

    // 3. Update payments status constraint to include 'pending_review'
    console.log('Step 3/4: Updating payments status constraint...');
    await pool.query('ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check');
    await pool.query(`
      ALTER TABLE payments ADD CONSTRAINT payments_status_check 
      CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 
        'refunded', 'cancelled', 'pending_review'
      ))
    `);
    console.log('✅ Constraint updated successfully\n');

    // 4. Create partial index for transaction reference lookups
    console.log('Step 4/4: Creating transaction reference index...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_transaction 
      ON payments(transaction_reference) 
      WHERE transaction_reference IS NOT NULL
    `);
    console.log('✅ Index created successfully\n');

    console.log('🎉 Migration completed successfully!');
    console.log('\n📊 Verifying changes...\n');

    // Verification queries
    const [columnCheck] = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bookings' AND column_name = 'payment_expires_at'
    `);
    console.log('✓ payment_expires_at column:', columnCheck.rows[0] ? 'EXISTS' : 'MISSING');

    const [constraintCheck] = await pool.query(`
      SELECT pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conrelid = 'payments'::regclass AND contype = 'c'
    `);
    console.log('✓ payments_status_check:', constraintCheck.rows[0]?.pg_get_constraintdef || 'MISSING');

    const [indexCheck] = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename IN ('bookings', 'payments') 
      AND indexname IN ('idx_bookings_payment_expires', 'idx_payments_transaction')
    `);
    console.log('✓ New indexes:', indexCheck.rows.map(r => r.indexname).join(', ') || 'MISSING');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n🔌 Database connection closed.');
  }
}

migrate();