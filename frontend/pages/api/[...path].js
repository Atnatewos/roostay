// frontend/pages/api/[...path].js
// Standalone API handler for Vercel deployment
// Bundles all backend code inline to avoid cross-package imports

const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Inline the minimal Express app
const app = express();

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'ROOSTAY API is running.', timestamp: new Date().toISOString() });
});

// Root
app.get('/', (req, res) => {
  res.json({ success: true, name: 'ROOSTAY API', version: '1.0.0' });
});

// Catch-all
app.all('*', (req, res) => {
  res.status(404).json({ success: false, error: { code: 'ROUTE_NOT_FOUND', message: `Route not found: ${req.method} ${req.path}` } });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
});

let handler;
if (typeof handler === 'undefined') {
  handler = app;
}

export default function apiHandler(req, res) {
  return handler(req, res);
}

export const config = {
  api: { bodyParser: false, externalResolver: true },
};
