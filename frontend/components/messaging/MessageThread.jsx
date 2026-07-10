// frontend/components/messaging/MessageThread.jsx
// Displays the chat history for a specific conversation
// Auto-scrolls to bottom on new messages and distinguishes sent/received
'use client';

import { useEffect, useRef } from 'react';
import useAuth from '@/hooks/useAuth';

export default function MessageThread({ messages, isLoading }) {
  const { user } = useAuth();
  const messagesEndRef = useRef(null);

  // Auto-scroll to the bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (isLoading) {
    return (
      <div className="message-thread__loading" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        Loading messages...
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="message-thread__empty" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        No messages yet. Say hello!
      </div>
    );
  }

  return (
    <div className="message-thread" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', overflowY: 'auto', maxHeight: 'calc(100vh - 250px)' }}>
      {messages.map((msg) => {
        const isMe = msg.sender_id === user?.id;
        return (
          <div
            key={msg.id}
            className={`message-thread__message ${isMe ? 'message-thread__message--sent' : 'message-thread__message--received'}`}
            style={{
              display: 'flex',
              justifyContent: isMe ? 'flex-end' : 'flex-start',
            }}
          >
            <div className="message-thread__bubble" style={{
              maxWidth: '70%',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: isMe ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
              color: isMe ? 'white' : 'var(--color-text-primary)',
              borderBottomRightRadius: isMe ? '0' : 'var(--radius-lg)',
              borderBottomLeftRadius: isMe ? 'var(--radius-lg)' : '0',
            }}>
              <p className="message-thread__text" style={{ margin: 0, lineHeight: '1.4', wordBreak: 'break-word' }}>
                {msg.message_text}
              </p>
              <span className="message-thread__time" style={{
                display: 'block', fontSize: '0.7rem', marginTop: '0.25rem',
                opacity: 0.7, textAlign: 'right'
              }}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}