// frontend/components/messaging/MessageList.jsx
// Sidebar component displaying the user's recent conversations
// Shows partner name, last message preview, and unread count badge
'use client';

import { useEffect } from 'react';
import useMessages from '@/hooks/useMessages';

export default function MessageList({ onSelectConversation, selectedPartnerId }) {
  const { conversations, fetchConversations, isLoading } = useMessages();

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  if (isLoading && conversations.length === 0) {
    return (
      <div className="message-list__loading" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        Loading conversations...
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="message-list__empty" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        No conversations yet. Start messaging a host or guest!
      </div>
    );
  }

  return (
    <div className="message-list">
      {conversations.map((conv) => (
        <button
          key={conv.partner_id}
          className={`message-list__item ${selectedPartnerId === conv.partner_id ? 'message-list__item--active' : ''}`}
          onClick={() => onSelectConversation(conv.partner_id)}
          style={{
            display: 'flex',
            gap: '1rem',
            padding: '1rem',
            borderBottom: '1px solid var(--color-border-light)',
            cursor: 'pointer',
            backgroundColor: selectedPartnerId === conv.partner_id ? 'var(--color-bg-secondary)' : 'transparent',
            transition: 'background-color 150ms ease',
            width: '100%',
            border: 'none',
            textAlign: 'left',
          }}
        >
          {/* Avatar */}
          <div className="message-list__avatar" style={{ position: 'relative', flexShrink: 0 }}>
            {conv.partner_image_url ? (
              <img src={conv.partner_image_url} alt={conv.partner_first_name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
                {conv.partner_first_name[0]}
              </div>
            )}
            {conv.unread_count > 0 && (
              <span className="message-list__badge" style={{
                position: 'absolute', top: '-2px', right: '-2px',
                backgroundColor: 'var(--color-error)', color: 'white',
                fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '50%',
                minWidth: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid white'
              }}>
                {conv.unread_count}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="message-list__content" style={{ flex: 1, minWidth: 0 }}>
            <div className="message-list__header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span className="message-list__name" style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                {conv.partner_first_name} {conv.partner_last_name}
              </span>
              <span className="message-list__time" style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                {new Date(conv.last_message_at).toLocaleDateString()}
              </span>
            </div>
            <p className="message-list__preview" style={{
              fontSize: '0.85rem', color: 'var(--color-text-secondary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0
            }}>
              {conv.last_message_text}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}