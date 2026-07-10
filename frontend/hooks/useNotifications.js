// frontend/hooks/useNotifications.js
// Custom hook for managing notifications with polling
// Fetches notifications every 30 seconds and provides unread count
// Supports mark as read and mark all as read actions
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api';

/**
 * useNotifications Hook
 * Manages notification state with automatic polling.
 * Fetches notifications every 30 seconds when user is authenticated.
 * 
 * @returns {Object} Notification state and actions
 * @returns {Array} notifications - Array of notification objects
 * @returns {number} unreadCount - Number of unread notifications
 * @returns {boolean} isLoading - Whether notifications are being fetched
 * @returns {Function} markAsRead - Mark a single notification as read
 * @returns {Function} markAllAsRead - Mark all notifications as read
 * @returns {Function} refresh - Manually refresh notifications
 */
export default function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef(null);

  /**
   * Fetches notifications from the API.
   * Updates both the notifications list and unread count.
   */
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/notifications');
      
      if (response?.data?.notifications) {
        setNotifications(response.data.notifications);
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Marks a single notification as read.
   * Optimistically updates the UI before the API call completes.
   * 
   * @param {string} notificationId - The notification ID to mark as read
   */
  const markAsRead = useCallback(async (notificationId) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await apiClient.patch(`/notifications/${notificationId}/read`);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Revert optimistic update on error
      fetchNotifications();
    }
  }, [fetchNotifications]);

  /**
   * Marks all notifications as read.
   * Optimistically updates the UI before the API call completes.
   */
  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
    );
    setUnreadCount(0);

    try {
      await apiClient.patch('/notifications/read-all');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      // Revert optimistic update on error
      fetchNotifications();
    }
  }, [fetchNotifications]);

  /**
   * Manually refreshes notifications.
   */
  const refresh = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Initial fetch and polling setup
  useEffect(() => {
    fetchNotifications();

    // Poll every 30 seconds
    intervalRef.current = setInterval(fetchNotifications, 30000);

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh,
  };
}