// packages/utils/pagination.js
// Pagination utility for consistent paginated API responses
// Calculates offset, total pages, and generates pagination metadata
// All values come from config with sensible defaults

let config;
try {
  config = require('@roostay/config');
} catch {
  config = { features: { paginationDefaultLimit: 12, paginationMaxLimit: 50 } };
}

/**
 * Parses and normalizes pagination parameters from request query.
 * Ensures page and limit are within valid bounds.
 *
 * @param {Object} query - Express request.query object
 * @returns {Object} Normalized pagination parameters { page, limit, offset }
 */
function parsePagination(query) {
  const defaultLimit = config.features.paginationDefaultLimit || 12;
  const maxLimit = config.features.paginationMaxLimit || 50;

  let page = parseInt(query.page, 10) || 1;
  let limit = parseInt(query.limit, 10) || defaultLimit;

  // Enforce bounds
  if (page < 1) page = 1;
  if (limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Generates pagination metadata for API responses.
 * Includes links for first, previous, next, and last pages.
 *
 * @param {number} totalItems - Total number of items matching the query
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {string} baseUrl - Base URL for generating pagination links
 * @returns {Object} Pagination metadata object
 */
function buildPaginationMeta(totalItems, page, limit, baseUrl) {
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  const meta = {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  };

  // Generate pagination links if base URL is provided
  if (baseUrl) {
    const separator = baseUrl.includes('?') ? '&' : '?';

    meta.links = {
      first: `${baseUrl}${separator}page=1&limit=${limit}`,
      last: `${baseUrl}${separator}page=${totalPages}&limit=${limit}`,
    };

    if (hasNextPage) {
      meta.links.next = `${baseUrl}${separator}page=${page + 1}&limit=${limit}`;
    }

    if (hasPreviousPage) {
      meta.links.previous = `${baseUrl}${separator}page=${page - 1}&limit=${limit}`;
    }
  }

  return meta;
}

/**
 * Builds a complete paginated response object.
 *
 * @param {Array} data - The array of items for the current page
 * @param {number} totalItems - Total number of items matching the query
 * @param {Object} pagination - Pagination parameters from parsePagination
 * @param {string} [baseUrl] - Base URL for generating pagination links
 * @returns {Object} Complete paginated response { success, data, pagination }
 */
function paginatedResponse(data, totalItems, pagination, baseUrl) {
  return {
    success: true,
    data,
    pagination: buildPaginationMeta(
      totalItems,
      pagination.page,
      pagination.limit,
      baseUrl
    ),
  };
}

/**
 * Builds the SQL LIMIT and OFFSET clause for parameterized queries.
 *
 * @param {Object} pagination - Pagination parameters from parsePagination
 * @returns {Object} SQL clause components { limitClause, offsetClause, params }
 */
function paginationSql(pagination) {
  return {
    limitClause: 'LIMIT $p_limit',
    offsetClause: 'OFFSET $p_offset',
    params: {
      p_limit: pagination.limit,
      p_offset: pagination.offset,
    },
  };
}

module.exports = {
  parsePagination,
  buildPaginationMeta,
  paginatedResponse,
  paginationSql,
};