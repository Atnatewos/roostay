// frontend/components/messaging/MessageInput.jsx
// Input area for composing and sending new messages
// Supports Enter to send, Shift+Enter for newline, and loading states
'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';

export default function MessageInput({ onSend, isLoading, disabled }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim() && !isLoading && !disabled) {
      onSend(text.trim());
      setText('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form className="message-input" onSubmit={handleSubmit} style={{
      display: 'flex', gap: '0.75rem', padding: '1rem', borderTop: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-bg-primary)'
    }}>
      <textarea
        className="message-input__textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
        rows="2"
        disabled={disabled || isLoading}
        maxLength={2000}
        style={{
          flex: 1, resize: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
          padding: '0.75rem', fontFamily: 'inherit', fontSize: 'var(--font-size-sm)'
        }}
      />
      <Button
        type="submit"
        variant="primary"
        size="md"
        isLoading={isLoading}
        disabled={!text.trim() || disabled}
        style={{ alignSelf: 'flex-end' }}
      >
        Send
      </Button>
    </form>
  );
}