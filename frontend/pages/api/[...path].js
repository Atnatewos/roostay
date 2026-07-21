// frontend/pages/api/[...path].js
// ROOSTAY API — Thin Vercel serverless entry point
// Imports the Express application factory from the modular packages/api/ directory
// All routes, controllers, middleware, and business logic live in packages/api/
// This file is the single source of truth for Vercel deployments
// Author: Theron

const { createApp } = require('../../../packages/api');

/**
 * Creates the Express application once per serverless function instance.
 * Node.js module caching ensures the app is only initialized on cold starts.
 * On warm starts, the cached app instance is reused for better performance.
 */
const app = createApp();

/**
 * Next.js API route handler.
 * Forwards all incoming HTTP requests to the Express application.
 * 
 * @param {Object} req - Next.js IncomingMessage
 * @param {Object} res - Next.js ServerResponse
 */
export default function handler(req, res) {
  return app(req, res);
}

/**
 * Next.js API route configuration.
 * bodyParser is disabled because Express handles its own body parsing.
 * externalResolver indicates Express manages the response lifecycle.
 */
export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};