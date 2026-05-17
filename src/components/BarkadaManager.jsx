import React, { useState } from 'react';
import toast from 'react-hot-toast';
import styles from './settings.module.css';

export default function BarkadaManager({ setActiveTab }) {
  // Mocking the subscription state to 'Free' as requested
  const [subscriptionTier, setSubscriptionTier] = useState('Free');

  const [slots, setSlots] = useState([
    { id: 1, role: 'admin', name: 'You (Team Admin)', email: 'admin@example.com' },
    { id: 2, role: 'member', name: null, email: null },
    { id: 3, role: 'member', name: null, email: null },
    { id: 4, role: 'member', name: null, email: null },
    { id: 5, role: 'member', name: null, email: null },
  ]);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState(null);

  const handleInviteClick = (slotId) => {
    setSelectedSlotId(slotId);
    setIsInviteModalOpen(true);
  };

  const handleSendInvite = (e) => {
    e.preventDefault();
    if (!inviteEmail) {
      toast.error("Please enter an email address.");
      return;
    }
    console.log(`Inviting ${inviteEmail} to slot ${selectedSlotId}`);
    toast.success("Invite link sent!");
    
    // Mock update slot
    setSlots(slots.map(s => s.id === selectedSlotId ? { ...s, email: inviteEmail, name: 'Pending Invite...' } : s));
    
    setIsInviteModalOpen(false);
    setInviteEmail('');
    setSelectedSlotId(null);
  };

  if (subscriptionTier !== 'Barkada Plan') {
    return (
      <div className={styles.settingsContent}>
        <div style={{ textAlign: 'center', padding: '3rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem', color: 'var(--color-sky, #5DA9E9)' }}>
            🔒
          </div>
          <h3 className={styles.settingsSectionTitle} style={{ justifyContent: 'center', marginBottom: '1rem', borderBottom: 'none' }}>
            Barkada Plan Locked
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '400px', lineHeight: '1.6' }}>
            Unlock the Barkada Plan to study with up to 4 friends for just ₱199/mo!
          </p>
          <button 
            onClick={() => setActiveTab && setActiveTab('Payment')}
            style={{ 
              background: 'var(--color-sky, #5DA9E9)', color: '#fff', border: 'none', 
              padding: '0.75rem 2rem', borderRadius: '0.5rem', cursor: 'pointer', 
              fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 4px 6px -1px rgba(93, 169, 233, 0.4)',
              transition: 'transform 0.2s, boxShadow 0.2s'
            }}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            <i className="fa-solid fa-crown" style={{ marginRight: '0.5rem' }}></i> Upgrade Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.settingsContent}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          background: 'var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}>
          🐝
        </div>
        <div>
          <h3 className={styles.settingsSectionTitle} style={{ margin: 0 }}>
            <i className="fa-solid fa-users"></i> Your Barkada (Group Plan)
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Manage your team of 5 users. Invite your friends to learn together!
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {slots.map((slot) => (
          <div key={slot.id} style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '1.25rem', 
            background: slot.role === 'admin' ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-secondary)',
            border: slot.role === 'admin' ? '1px solid rgba(34, 197, 94, 0.5)' : '1px solid var(--color-border)',
            borderRadius: '1rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ 
                width: '40px', height: '40px', borderRadius: '50%', 
                background: slot.name ? 'var(--color-sky, #5DA9E9)' : 'rgba(107, 114, 128, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold'
              }}>
                {slot.name ? slot.name.charAt(0).toUpperCase() : <i className="fa-solid fa-user-plus"></i>}
              </div>
              <div>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                  {slot.name || 'Empty Slot'}
                  {slot.role === 'admin' && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', background: '#22c55e', color: '#fff', padding: '0.1rem 0.5rem', borderRadius: '999px', fontWeight: 'bold' }}>Admin</span>}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{slot.email || 'Waiting for a friend...'}</div>
              </div>
            </div>
            
            {slot.role !== 'admin' && !slot.email && (
              <button 
                onClick={() => handleInviteClick(slot.id)}
                style={{ 
                  background: 'var(--color-sky, #5DA9E9)', color: '#fff', border: 'none', 
                  padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer',
                  fontWeight: '600', transition: 'background 0.2s', boxShadow: '0 4px 6px -1px rgba(93, 169, 233, 0.4)'
                }}
              >
                <i className="fa-solid fa-paper-plane" style={{ marginRight: '0.5rem' }}></i> Invite
              </button>
            )}
            {slot.role !== 'admin' && slot.email && (
              <button 
                onClick={() => {
                  toast.error("Revoking invite...");
                  setSlots(slots.map(s => s.id === slot.id ? { ...s, email: null, name: null } : s));
                }}
                style={{ 
                  background: 'transparent', color: 'var(--color-danger, #ef4444)', border: '1px solid var(--color-danger, #ef4444)', 
                  padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer',
                  fontWeight: '600', transition: 'background 0.2s'
                }}
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {isInviteModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setIsInviteModalOpen(false)}>
          <div style={{
            background: 'var(--bg-primary, #ffffff)', padding: '2.5rem', borderRadius: '1.25rem', width: '90%', maxWidth: '400px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid var(--color-border)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <i className="fa-solid fa-envelope-open-text" style={{ fontSize: '1.5rem', color: 'var(--color-sky)' }}></i>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.5rem' }}>Invite Friend</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Enter your friend's email address to invite them to your group plan.
            </p>
            <form onSubmit={handleSendInvite}>
              <input 
                type="email" 
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="friend@example.com"
                className={styles.settingsInput}
                style={{ marginBottom: '1.5rem' }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setIsInviteModalOpen(false)}
                  style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{ background: 'var(--color-sky, #5DA9E9)', color: '#fff', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(93, 169, 233, 0.4)' }}
                >
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
