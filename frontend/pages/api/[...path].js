// frontend/pages/api/[...path].js
// Next.js API route handler that mounts the Express application
// All /api/* requests in Next.js are forwarded to the Express app
// This enables serverless deployment on Vercel while using Express

const { createApp } = require('../../../packages/api');
const logger = require('../../../packages/utils/logger');

// Create the Express app once and reuse it across requests
// In serverless environments, the module may be cached between invocations
let app;

/**
 * Initializes or retrieves the cached Express application instance.
 * The app is created once to avoid cold start overhead in serverless.
 *
 * @returns {express.Application} Configured Express app
 */
function getApp() {
  if (!app) {
    logger.info('Initializing Express application for Next.js API route.');
    app = createApp();
  }
  return app;
}

/**
 * Next.js API route handler.
 * Forwards all requests to the Express application for processing.
 * Supports all HTTP methods and handles the serverless lifecycle.
 *
 * @param {Object} req - Next.js request object (IncomingMessage)
 * @param {Object} res - Next.js response object (ServerResponse)
 */
export default function handler(req, res) {
  const expressApp = getApp();

  // Express expects the full URL; reconstruct it from Next.js request
  // This ensures req.originalUrl and req.path work correctly in Express
  if (!req.url.startsWith('/api')) {
    req.url = `/api${req.url}`;
  }

  // Delegate the request to Express
  return expressApp(req, res);
}

// Configure the route to handle all HTTP methods
export const config = {
  api: {
    bodyParser: false, // Express handles body parsing
    externalResolver: true, // Indicates an external resolver (Express) handles the response
  },
};