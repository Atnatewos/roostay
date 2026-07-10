// frontend/app/guest/messages/page.jsx
// Guest Messages Page - Hosts the full messaging interface
// Combines MessageList sidebar and MessageThread/MessageInput chat area
'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MessageList from '@/components/messaging/MessageList';
import MessageThread from '@/components/messaging/MessageThread';
import MessageInput from '@/components/messaging/MessageInput';
import useMessages from '@/hooks/useMessages';
import useAuth from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function GuestMessagesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { currentMessages, isLoading: msgLoading, error, fetchConversationMessages, sendMessage } = useMessages();
  
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/guest/messages');
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch messages when partner is selected
  useEffect(() => {
    if (selectedPartnerId) {
      fetchConversationMessages(selectedPartnerId);
    }
  }, [selectedPartnerId, fetchConversationMessages]);

  const handleSendMessage = async (text) => {
    if (!selectedPartnerId) return;
    try {
      await sendMessage(selectedPartnerId, text);
      // Refresh conversation after sending
      await fetchConversationMessages(selectedPartnerId);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <>
      <Header />
      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem', maxWidth: '1200px' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: '1.5rem' }}>
          Messages
        </h1>
        
        <div style={{
          display: 'grid', gridTemplateColumns: '350px 1fr', gap: '1.5rem',
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
          overflow: 'hidden', backgroundColor: 'var(--color-bg-primary)',
          minHeight: '600px'
        }}>
          {/* Sidebar: Conversation List */}
          <div style={{ borderRight: '1px solid var(--color-border)', overflowY: 'auto' }}>
            <MessageList 
              onSelectConversation={setSelectedPartnerId} 
              selectedPartnerId={selectedPartnerId} 
            />
          </div>

          {/* Main Area: Chat Thread + Input */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {selectedPartnerId ? (
              <>
                <MessageThread messages={currentMessages} isLoading={msgLoading} />
                <MessageInput onSend={handleSendMessage} isLoading={msgLoading} />
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
                Select a conversation to start messaging
              </div>
            )}
          </div>
        </div>

        {error && (
          <div style={{
            marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--color-error-light)',
            color: 'var(--color-error)', borderRadius: 'var(--radius-md)'
          }}>
            {error}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}