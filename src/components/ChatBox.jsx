import React, { useState, useEffect, useRef } from 'react';
import supabase from '../supabaseClient';
import { motion } from 'framer-motion';

export default function ChatBox({ currentUserId, friendId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!currentUserId || !friendId) return;

    // 1. Initial Fetch
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error("Error fetching messages:", error);
      } else {
        setMessages(data || []);
      }
    };

    fetchMessages();

    // 2. Realtime Subscription
    const channel = supabase
      .channel('custom-all-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new;
          // Check if the message belongs to this conversation
          if (
            (newMsg.sender_id === currentUserId && newMsg.receiver_id === friendId) ||
            (newMsg.sender_id === friendId && newMsg.receiver_id === currentUserId)
          ) {
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, friendId]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msgContent = newMessage.trim();
    setNewMessage(''); // Clear input optimistically

    const { error } = await supabase
      .from('messages')
      .insert([
        {
          sender_id: currentUserId,
          receiver_id: friendId,
          content: msgContent,
        }
      ]);

    if (error) {
      console.error("Error sending message:", error);
      // Optional: Handle error UI here
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '400px', // Default fixed height, can be overridden by a parent wrapper
      width: '100%',
      backgroundColor: 'var(--glass-bg, rgba(15, 23, 42, 0.9))',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      overflow: 'hidden',
      color: '#fff',
      fontFamily: "'Inter', var(--font-primary), sans-serif",
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)'
    }}>
      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUserId;
          return (
            <motion.div
              key={msg.id || msg.created_at || Math.random()}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                alignSelf: isMine ? 'flex-end' : 'flex-start',
                maxWidth: '75%',
                padding: '0.75rem 1rem',
                borderRadius: '16px',
                borderBottomRightRadius: isMine ? '4px' : '16px',
                borderBottomLeftRadius: isMine ? '16px' : '4px',
                backgroundColor: isMine ? 'var(--theme-primary, #3b82f6)' : '#334155',
                color: '#fff',
                fontSize: '0.9rem',
                wordBreak: 'break-word',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
              }}
            >
              {msg.content}
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={sendMessage} style={{
        display: 'flex',
        padding: '0.75rem 1rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        gap: '0.5rem',
        backgroundColor: 'rgba(0,0,0,0.2)'
      }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            borderRadius: '999px',
            border: 'none',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            outline: 'none',
            fontSize: '0.9rem'
          }}
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '999px',
            border: 'none',
            backgroundColor: newMessage.trim() ? 'var(--accent-color, #10b981)' : '#475569',
            color: '#fff',
            fontWeight: 'bold',
            cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <i className="fa-solid fa-paper-plane"></i>
        </button>
      </form>
    </div>
  );
}
