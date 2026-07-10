// packages/api/routes/message.routes.js
// Messaging routes - handles guest-host communication endpoints
// All routes require authentication via JWT cookie or header
const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware');
const validateRequest = require('../middleware/validate');
const messageValidator = require('../validators/message.validator');
const messageController = require('../controllers/message.controller');

// ============================================================================
// MESSAGING ROUTES
// ============================================================================

// Send a new message
router.post(
  '/messages',
  authenticate,
  validateRequest({ body: messageValidator.sendMessage }),
  messageController.sendMessage
);

// Get list of conversations
router.get(
  '/messages/conversations',
  authenticate,
  validateRequest({ query: messageValidator.getConversations }),
  messageController.getConversations
);

// Get messages in a specific conversation
router.get(
  '/messages/conversations/:partnerId',
  authenticate,
  validateRequest({ params: messageValidator.partnerIdParam }),
  messageController.getConversationMessages
);

module.exports = router;