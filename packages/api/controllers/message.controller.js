// packages/api/controllers/message.controller.js
// Message controller - handles HTTP requests for messaging endpoints
// Delegates business logic to messageService and formats responses
const messageService = require('../../services/message.service');
const { asyncHandler } = require('../../utils/asyncHandler');
const logger = require('../../utils/logger');

const messageController = {
  /**
   * POST /api/messages
   * Sends a new message to a recipient.
   * Body: { receiverId, messageText, listingId? }
   */
  sendMessage: asyncHandler(async (req, res) => {
    const { receiverId, messageText, listingId } = req.body;
    const message = await messageService.sendMessage(
      req.user.id,
      receiverId,
      messageText,
      listingId
    );

    res.status(201).json({
      success: true,
      message: 'Message sent successfully.',
      data: { message },
    });
  }),

  /**
   * GET /api/messages/conversations
   * Retrieves the authenticated user's conversation list.
   * Query: { page, limit }
   */
  getConversations: asyncHandler(async (req, res) => {
    const result = await messageService.getConversations(req.user.id, req.query);

    res.status(200).json({
      success: true,
      data: result.conversations,
      pagination: result.pagination,
    });
  }),

  /**
   * GET /api/messages/conversations/:partnerId
   * Retrieves messages in a specific conversation.
   * Marks incoming messages as read automatically.
   * Query: { page, limit }
   */
  getConversationMessages: asyncHandler(async (req, res) => {
    const { partnerId } = req.params;
    const result = await messageService.getConversationMessages(
      req.user.id,
      partnerId,
      req.query
    );

    res.status(200).json({
      success: true,
      data: result.messages,
      pagination: result.pagination,
    });
  }),
};

module.exports = messageController;