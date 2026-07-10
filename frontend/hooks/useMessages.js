// frontend/hooks/useMessages.js
// Custom hook for managing messaging state and API interactions
// Handles fetching conversations, sending messages, and retrieving chat history
'use client';

import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api';

export default function useMessages() {
  const [conversations, setConversations] = useState([]);
  const [currentMessages, setCurrentMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetches the user's conversation list.
   */
  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/messages/conversations');
      setConversations(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch conversations.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetches messages for a specific conversation partner.
   * @param {string} partnerId - The ID of the conversation partner
   */
  const fetchConversationMessages = useCallback(async (partnerId) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/messages/conversations/${partnerId}`);
      setCurrentMessages(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch messages.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Sends a new message to a recipient.
   * @param {string} receiverId - The recipient's user ID
   * @param {string} messageText - The message content
   * @param {string} [listingId] - Optional listing ID for context
   */
  const sendMessage = useCallback(async (receiverId, messageText, listingId) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/messages', {
        receiverId,
        messageText,
        listingId,
      });
      return response.data.message;
    } catch (err) {
      setError(err.message || 'Failed to send message.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    conversations,
    currentMessages,
    isLoading,
    error,
    fetchConversations,
    fetchConversationMessages,
    sendMessage,
  };
}