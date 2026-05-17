import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import styles from '../dashboard.module.css';
import SettingsModal from './SettingsModal';
import SharpnessQuizModal from './SharpnessQuizModal';
import toast from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';

export default function TopHeader({ toggleSidebar, searchQuery, setSearchQuery, userProfile, userStats = {}, setCurrentPage, fetchProfileData }) {
  const { userAvatar, userProfile: globalProfile } = useTheme();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Achievement Unlocked', message: 'You completed 5 quizzes', time: '2m ago', isRead: false },
    { id: 2, title: 'Daily Streak Maintained', message: 'You earned 10 Buzz!', time: '1h ago', isRead: false },
    { id: 3, title: 'New Duel Challenge', message: 'Alex invited you to a comprog duel.', time: '3h ago', isRead: true },
  ]);
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userStreak, setUserStreak] = useState(0);
  const [buzzBalance, setBuzzBalance] = useState(0);
  const [displayBuzz, setDisplayBuzz] = useState(0);
  const [usertag, setUsertag] = useState('Loading...');
  const [discriminator, setDiscriminator] = useState('0000');
  const navigate = useNavigate();

  const displayName = userProfile?.first_name || "Student User";
  const avatarSeed = userProfile?.avatar_seed || "Felix";

  useEffect(() => {
    const fetchStreak = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('streak_count')
          .eq('id', user.id)
          .single();
        if (data) {
          setUserStreak(data.streak_count || 0);
        }
      }
    };
    fetchStreak();
  }, []);

  useEffect(() => {
    const fetchBuzzBalance = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('buzz_balance')
          .eq('id', user.id)
          .single();
        if (data) {
          setBuzzBalance(data.buzz_balance || 0);
        }
      }
    };
    fetchBuzzBalance();
  }, []);

  useEffect(() => {
    setDisplayBuzz(parseInt(localStorage.getItem('demoTotalBuzz') || '0'));
  }, []);

  useEffect(() => {
    const fetchUsertag = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, user_tag')
          .eq('id', user.id)
          .single();
        if (data && !error) {
          setUsertag(data.username);
          setDiscriminator(data.user_tag || user.id.slice(-4));
        } else {
          setUsertag('Unknown');
          setDiscriminator(user.id.slice(-4));
        }
      }
    };
    fetchUsertag();
  }, []);

  const toggleProfileMenu = (e) => {
    e.stopPropagation();
    setIsProfileMenuOpen((prev) => !prev);
    if (isNotificationsOpen) setIsNotificationsOpen(false);
  };

  const toggleNotifications = (e) => {
    e.stopPropagation();
    setIsNotificationsOpen((prev) => !prev);
    if (isProfileMenuOpen) setIsProfileMenuOpen(false);
  };

  const handleNotificationClick = (e, id) => {
    e.stopPropagation();
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllAsRead = (e) => {
    e.stopPropagation();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleLogout = async (e) => {
    e.stopPropagation();
    setIsProfileMenuOpen(false);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
    } else {
      navigate('/login');
    }
  };

  const openSettingsModal = (e) => {
    e.stopPropagation();
    setIsProfileMenuOpen(false);
    setIsSettingsOpen(true);
  };

  const closeSettingsModal = () => {
    setIsSettingsOpen(false);
  };

  // --- NEW: The Avatar Style Decider ---
const getAvatarUrl = (seed) => {
    // Uses a clean, green Dragon SVG icon
    if (seed === 'DragonSage') {
      return 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f409.svg'; 
    }
    
    // Uses a clean Ninja SVG icon
    if (seed === 'CyberNinja') {
      return 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f977.svg'; 
    }

    // Normal users who haven't bought anything get the Dicebear face
    return `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;
  };
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [didFailQuizSession, setDidFailQuizSession] = useState(false);

  const baseAccuracy = userStats?.accuracy || 0;
  const accuracy = didFailQuizSession ? 40 : baseAccuracy;
  const isBrainFog = accuracy < 50 && accuracy > 0;
  const fogStatusText = accuracy >= 80 ? "Sharp ⚡" : accuracy >= 50 ? "Focused" : accuracy > 0 ? "Brain Fog ☁️" : "Ready";
  
  const handleSharpnessClick = () => {
    // The Daily Lock check
    const today = new Date().toDateString();
    const lastQuizStr = userStats?.last_quiz_at;
    
    if (lastQuizStr) {
      const lastQuizDate = new Date(lastQuizStr).toDateString();
      if (lastQuizDate === today) {
        toast.error("You've already checked your sharpness today!");
        return;
      }
    }
    
    setIsQuizModalOpen(true);
  };

  return (
    <>
      <header className={styles['top-header']}>

        {/* Navigation Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Hamburger Menu */}
          <button className={styles['hamburgerBtn']} onClick={toggleSidebar}>
            <i className="fa-solid fa-bars"></i>
          </button>

          {/* Back Button */}
          <button className={styles['hamburgerBtn']} onClick={() => navigate(-1)} title="Go Back">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
        </div>

        {/* Search */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (!searchQuery.trim()) {
              toast.error("Please type something to search!");
              return;
            }
            toast.success(`Search completed for: "${searchQuery}"`);
          }} 
          className={styles['search-container']}
        >
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}></i>
          <input
            type="text"
            placeholder="Find a stack, friend, or topic..."
            className={styles['search-input']}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        {/* Stats & Profile */}
        <div className={styles['user-stats']}>

          {/* Streak */}
          <div className={styles['streak']} title="Daily Streak">
            <i className="fa-solid fa-fire" style={{ color: '#f97316', fontSize: '1.25rem' }}></i>
            <span id="streak-display" className={styles['streak-count']}>{userStreak}</span>
          </div>

          {/* Currency (Now BUZZ!) */}
          <div className={`${styles['currency-badge']} ${styles['buzz-badge']}`}>
            <span className={styles['honey-icon']}>🍯</span>
            <span id="buzz-display">{displayBuzz} Buzz</span>
          </div>

          {/* Brain Fog HUD */}
          <div 
            className={styles['brain-fog-hud']} 
            id="brain-fog-hud" 
            title="Click to test sharpness"
            onClick={handleSharpnessClick}
            style={{ cursor: 'pointer' }}
          >
            <span className={styles['fog-brain-icon']}>🧠</span>
            <div className={styles['fog-meter-mini']}>
              <div 
                className={styles['fog-meter-fill']} 
                id="fog-meter-fill" 
                style={{ width: `${accuracy}%`, backgroundColor: isBrainFog ? '#ef4444' : '#3b82f6' }}
              ></div>
            </div>
            <span className={styles['fog-label']} id="fog-label">{fogStatusText}</span>
          </div>

          {/* Notifications */}
          <div className={styles['notifications']} onClick={toggleNotifications}>
            <i className="fa-solid fa-bell" style={{ color: 'var(--color-text-muted)', fontSize: '1.25rem' }}></i>
            {unreadCount > 0 && (
              <div className={styles['notif-dot']} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'white', width: '1rem', height: '1rem', top: '-0.3rem', right: '-0.3rem', fontWeight: 'bold' }}>
                {unreadCount}
              </div>
            )}
            
            {/* Notifications Dropdown */}
            {isNotificationsOpen && (
              <div className={styles['profile-dropdown']} style={{ minWidth: '300px', right: '-50px', padding: 0, cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                  <h4 style={{ margin: 0, fontWeight: 'bold', color: '#111827' }}>Notifications</h4>
                  <button onClick={markAllAsRead} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}>
                    Mark all read
                  </button>
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>
                      No new notifications
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        onClick={(e) => handleNotificationClick(e, notif.id)}
                        style={{ 
                          padding: '1rem', 
                          borderBottom: '1px solid #f3f4f6', 
                          background: notif.isRead ? '#ffffff' : '#f0f9ff',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => { if (notif.isRead) e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                        onMouseOut={(e) => { if (notif.isRead) e.currentTarget.style.backgroundColor = '#ffffff'; }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#111827' }}>
                            {notif.title}
                          </span>
                          {!notif.isRead && <span style={{ width: '8px', height: '8px', background: '#3b82f6', borderRadius: '50%', marginTop: '4px', flexShrink: 0 }}></span>}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#4b5563', marginBottom: '0.25rem' }}>{notif.message}</p>
                        <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{notif.time}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className={styles['profile-menu']} onClick={toggleProfileMenu}>
            
            {/* --- NEW: Using the Decider Function Here --- */}
            <div className={styles['avatar']} style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={userAvatar}
                alt="User"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center 20%',
                  transform: 'scale(1.2)'
                }}
              />
            </div>

            <div className={styles['user-info']}>
              <p className={styles['user-name']} style={{ margin: 0 }}>
                <span style={{ fontWeight: 'bold', color: 'white' }}>{usertag}</span>
                <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.85em', marginLeft: '2px' }}>
                  {discriminator.startsWith('#') ? discriminator : `#${discriminator}`}
                </span>
              </p>
              <p className={styles['user-lvl']}>Lvl 4 Scholar</p>
            </div>
            <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}></i>

            {/* Profile Dropdown */}
            {isProfileMenuOpen && (
              <div className={styles['profile-dropdown']}>
                <button className={styles['dropdown-item']} onClick={openSettingsModal}>
                  <i className="fa-solid fa-gear"></i> Settings
                </button>
                <button className={styles['dropdown-item']} onClick={handleLogout}>
                  <i className="fa-solid fa-right-from-bracket"></i> Logout
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={closeSettingsModal} 
      />

      <SharpnessQuizModal 
        isOpen={isQuizModalOpen} 
        onClose={() => setIsQuizModalOpen(false)}
        fetchProfileData={fetchProfileData}
        onFail={() => setDidFailQuizSession(true)}
      />
    </>
  );
}