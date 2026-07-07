// server.js
// Standalone Express server for testing the API without Next.js

require('dotenv').config();
const express = require('express');
const { createApp } = require('./packages/api');

const app = createApp();
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  ROOSTAY API Server');
  console.log('═══════════════════════════════════════════');
  console.log(`  URL: http://localhost:${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/api/health`);
  console.log(`  API: http://localhost:${PORT}/api`);
  console.log('═══════════════════════════════════════════');
  console.log('');
});
