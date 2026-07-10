// packages/services/message.service.js
// Message service - handles guest-host communication logic
// Supports conversation retrieval, message sending, and read status tracking
// Uses optimized PostgreSQL queries for grouping conversations by partner
const { query, queryOne } = require('../database');
const { NotFoundError, ValidationError, ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');

let config;
try {
  config = require('@roostay/config');
} catch {
  config = {
    features: {
      maxMessageLength: 2000,
      conversationsPerPage: 20,
    },
  };
}

const messageService = {
  /**
   * Sends a new message to a specified recipient.
   * Validates that the sender is not messaging themselves and the recipient exists.
   * 
   * @param {string} senderId - The authenticated user's ID
   * @param {string} receiverId - The recipient's user ID
   * @param {string} messageText - The content of the message
   * @param {string} [listingId] - Optional listing ID for context
   * @returns {Promise<Object>} The created message record
   */
  async sendMessage(senderId, receiverId, messageText, listingId) {
    if (senderId === receiverId) {
      throw new ValidationError('You cannot send a message to yourself.');
    }

    const receiver = await queryOne('SELECT id FROM users WHERE id = $1', [receiverId]);
    if (!receiver) {
      throw new NotFoundError('Recipient not found.');
    }

    const maxLen = config.features.maxMessageLength || 2000;
    if (messageText.length > maxLen) {
      throw new ValidationError(`Message cannot exceed ${maxLen} characters.`);
    }

    const message = await queryOne(
      `INSERT INTO messages (sender_id, receiver_id, message_text, booking_id, is_read)
       VALUES ($1, $2, $3, $4, false)
       RETURNING *`,
      [senderId, receiverId, messageText, null] // Note: booking_id linked later if needed
    );

    logger.info('Message sent', {
      messageId: message.id,
      senderId,
      receiverId,
    });

    return message;
  },

  /**
   * Retrieves a paginated list of conversations for the current user.
   * Groups messages by partner and shows the latest message + unread count.
   * Uses DISTINCT ON for efficient Postgres grouping.
   * 
   * @param {string} userId - The authenticated user's ID
   * @param {Object} options - Pagination options { page, limit }
   * @returns {Promise<Object>} Paginated list of conversation partners
   */
  async getConversations(userId, options = {}) {
    const { page = 1, limit = config.features.conversationsPerPage || 20 } = options;
    const offset = (page - 1) * limit;

    // Fetch latest message per partner using DISTINCT ON
    const conversations = await query(
      `WITH latest_messages AS (
         SELECT DISTINCT ON (
           CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END
         )
           CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END as partner_id,
           message_text,
           created_at,
           id
         FROM messages
         WHERE sender_id = $1 OR receiver_id = $1
         ORDER BY partner_id, created_at DESC
       )
       SELECT 
         lm.partner_id,
         lm.message_text as last_message_text,
         lm.created_at as last_message_at,
         u.first_name as partner_first_name,
         u.last_name as partner_last_name,
         u.profile_image_url as partner_image_url,
         (SELECT COUNT(*) FROM messages 
          WHERE sender_id = lm.partner_id AND receiver_id = $1 AND is_read = false) as unread_count
       FROM latest_messages lm
       JOIN users u ON lm.partner_id = u.id
       ORDER BY lm.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    // Count total unique partners for pagination metadata
    const countResult = await queryOne(
      `SELECT COUNT(DISTINCT CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END) as total
       FROM messages WHERE sender_id = $1 OR receiver_id = $1`,
      [userId]
    );

    return {
      conversations: conversations.rows,
      pagination: {
        page,
        limit,
        totalItems: parseInt(countResult.total, 10),
        totalPages: Math.ceil(parseInt(countResult.total, 10) / limit),
      },
    };
  },

  /**
   * Retrieves all messages in a conversation between two users.
   * Automatically marks incoming messages as read upon retrieval.
   * 
   * @param {string} userId - The authenticated user's ID
   * @param {string} partnerId - The conversation partner's ID
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Ordered list of messages
   */
  async getConversationMessages(userId, partnerId, options = {}) {
    const { page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    // Mark incoming messages as read atomically
    await query(
      `UPDATE messages SET is_read = true, read_at = NOW()
       WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false`,
      [partnerId, userId]
    );

    const messages = await query(
      `SELECT m.*, 
              s.first_name as sender_first_name, s.last_name as sender_last_name,
              r.first_name as receiver_first_name, r.last_name as receiver_last_name
       FROM messages m
       JOIN users s ON m.sender_id = s.id
       JOIN users r ON m.receiver_id = r.id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2)
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at ASC
       LIMIT $3 OFFSET $4`,
      [userId, partnerId, limit, offset]
    );

    return {
      messages: messages.rows,
      pagination: { page, limit, totalItems: messages.rows.length, totalPages: 1 },
    };
  },
};

module.exports = messageService;