// packages/database/index.js
// Database query interface - parameterized queries with error handling
// All database operations must use these functions for SQL injection prevention

const { getPool } = require('./pool');

/**
 * Custom application error class for database operations.
 */
class DatabaseError extends Error {
  constructor(message, statusCode = 500, code = 'DB_ERROR') {
    super(message);
    this.name = 'DatabaseError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

/**
 * Executes a parameterized SQL query.
 * Uses PostgreSQL's native parameterized queries ($1, $2, ...) for SQL injection prevention.
 *
 * @param {string} text - SQL query with $1, $2 placeholders
 * @param {Array} [params=[]] - Parameter values
 * @returns {Promise<Object>} Query result with rows, rowCount, fields
 */
async function query(text, params = []) {
  const pool = getPool();
  const start = Date.now();

  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    if (duration > 1000) {
      console.warn(`Slow query (${duration}ms):`, text.substring(0, 200));
    }

    return result;
  } catch (error) {
    const errorMap = {
      '23505': 'A record with this information already exists.',
      '23503': 'Referenced record does not exist.',
      '23502': 'Required field cannot be empty.',
      '42P01': 'Database table not found.',
      '42703': 'Invalid column reference.',
      '22001': 'Value is too long for this field.',
      '22P02': 'Invalid input syntax.',
      '08006': 'Database connection failed.',
      '53300': 'Too many database connections.',
    };

    const message = errorMap[error.code] || 'A database error occurred.';

    console.error('Query error:', {
      code: error.code,
      message: error.message,
      query: text.substring(0, 150),
    });

    throw new DatabaseError(message, 500, error.code);
  }
}

/**
 * Returns the first row of a query or null.
 *
 * @param {string} text - SQL query
 * @param {Array} [params=[]] - Parameter values
 * @returns {Promise<Object|null>} First row or null
 */
async function queryOne(text, params = []) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

/**
 * Checks if any rows exist for a query.
 *
 * @param {string} text - SQL query
 * @param {Array} [params=[]] - Parameter values
 * @returns {Promise<boolean>} True if rows exist
 */
async function queryExists(text, params = []) {
  const result = await query(text, params);
  return result.rowCount > 0;
}

/**
 * Begins a database transaction.
 *
 * @returns {Promise<Object>} Client with query and release methods
 */
async function beginTransaction() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    return client;
  } catch (error) {
    client.release();
    throw error;
  }
}

/**
 * Commits a transaction and releases the client.
 *
 * @param {Object} client - Transaction client
 */
async function commitTransaction(client) {
  try {
    await client.query('COMMIT');
  } finally {
    client.release();
  }
}

/**
 * Rolls back a transaction and releases the client.
 *
 * @param {Object} client - Transaction client
 */
async function rollbackTransaction(client) {
  try {
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
}

module.exports = {
  query,
  queryOne,
  queryExists,
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
  DatabaseError,
};