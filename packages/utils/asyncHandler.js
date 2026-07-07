// packages/utils/asyncHandler.js
// Wraps async Express route handlers to catch errors automatically

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
