import React, { useState, useEffect, useRef } from 'react';
import supabase from '../supabaseClient';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationInbox() {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchUserAndRequests = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id, 
          requester_id, 
          profiles!requester_id(username)
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      if (error) {
        console.error("Error fetching friend requests:", error);
      } else if (data) {
        setPendingRequests(data);
      }
    };

    fetchUserAndRequests();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase.channel(`public:friendships:receiver_id=eq.${currentUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'friendships', filter: `receiver_id=eq.${currentUserId}` },
        async (payload) => {
          if (payload.new.status === 'pending') {
             // Fetch requester details to get the username
             const { data } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', payload.new.requester_id)
                .single();

             if (data) {
                setPendingRequests(prev => [...prev, {
                   id: payload.new.id,
                   requester_id: payload.new.requester_id,
                   profiles: { username: data.username }
                }]);
             }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const handleAccept = async (request) => {
    const { error } = await supabase.rpc('accept_friend_request', { target_friendship_id: request.id });
    if (error) {
      toast.error("Failed to accept request: " + error.message);
    } else {
      toast.success(`You are now friends with ${request.profiles?.username || 'User'}!`);
      setPendingRequests(prev => prev.filter(r => r.id !== request.id));
    }
  };

  const handleDecline = async (request) => {
    const { error } = await supabase.rpc('decline_friend_request', { target_friendship_id: request.id });
    if (error) {
      toast.error("Failed to decline request: " + error.message);
    } else {
      setPendingRequests(prev => prev.filter(r => r.id !== request.id));
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(15, 23, 42, 0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          color: '#fff',
          transition: 'all 0.2s ease',
          outline: 'none'
        }}
        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(30, 41, 59, 0.8)'; }}
        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(15, 23, 42, 0.5)'; }}
        title="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2M8 1.918l-.797.161A4 4 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4 4 0 0 0-3.203-3.92zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5 5 0 0 1 13 6c0 .88.32 4.2 1.22 6"/>
        </svg>
        
        {pendingRequests.length > 0 && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              background: '#ef4444',
              color: '#fff',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)'
            }}
          >
            {pendingRequests.length}
          </motion.div>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              top: '50px',
              right: 0,
              width: '340px',
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
              zIndex: 9999,
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold', color: '#f8fafc', fontSize: '1.1rem' }}>
              Notifications
            </div>
            
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {pendingRequests.length === 0 ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.95rem' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem', opacity: 0.5 }}>🔔</div>
                  No new notifications
                </div>
              ) : (
                pendingRequests.map(request => (
                  <div key={request.id} style={{
                    padding: '1rem 1.2rem',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ flex: 1, fontSize: '0.9rem', color: '#e2e8f0', lineHeight: '1.4' }}>
                      <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>{request.profiles?.username || 'User'}</span> sent you a friend request!
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => handleAccept(request)}
                        title="Accept"
                        style={{
                          background: 'rgba(34, 197, 94, 0.2)',
                          border: '1px solid rgba(34, 197, 94, 0.4)',
                          color: '#4ade80',
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                          fontSize: '1.1rem',
                          outline: 'none'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#22c55e'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)'; e.currentTarget.style.color = '#4ade80'; e.currentTarget.style.transform = 'scale(1)'; }}
                      >
                        ✓
                      </button>
                      <button 
                        onClick={() => handleDecline(request)}
                        title="Decline"
                        style={{
                          background: 'rgba(239, 68, 68, 0.2)',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          color: '#f87171',
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                          fontSize: '1rem',
                          outline: 'none'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.transform = 'scale(1)'; }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
