import React, { useState, useEffect } from 'react';
import styles from './settings.module.css';
import { useTheme } from '../context/ThemeContext';
// 1. WE IMPORT THE AVATAR COMPONENT HERE:
import AvatarCustomizer from './AvatarCustomizer'; 
import BackButton from './BackButton';
import BarkadaManager from './BarkadaManager';
import supabase from '../supabaseClient';
import toast from 'react-hot-toast';

export default function SettingsModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('Personal');
  const [paymentView, setPaymentView] = useState('menu');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { theme, setTheme, particlesEnabled, setParticlesEnabled } = useTheme();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        
        if (user) {
          setEmail(user.email);
          setUserId(user.id);
          
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (profileError && profileError.code !== 'PGRST116') throw profileError;
          if (profile) {
            setUsername(profile.username || '');
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, []);

  const handleUpdate = async () => {
    setIsSaving(true);
    try {
      if (newPassword || confirmPassword) {
        if (newPassword !== confirmPassword) {
          toast.error("Passwords do not match.");
          setIsSaving(false);
          return;
        }
        
        const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
        if (passwordError) throw passwordError;
      }
      
      if (userId && username) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ username })
          .eq('id', userId);
          
        if (profileError) throw profileError;
      }
      
      toast.success("Settings updated successfully!");
      setNewPassword('');
      setConfirmPassword('');
      
    } catch (error) {
      toast.error("Update failed: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubscriptionClick = async (e) => {
    e.preventDefault();
    setIsRedirecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session');
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to redirect to checkout. Please try again.');
    } finally {
      setIsRedirecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.settingsModalOverlay} onClick={onClose}>
      <div className={styles.settingsModal} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '0 1.5rem', paddingTop: '1.5rem' }}>
          <BackButton />
        </div>
        <div className={styles.settingsModalHeader}>
          <span className={styles.settingsModalTitle}>
            <i className="fa-solid fa-gear"></i> Settings
          </span>
          <button className={styles.settingsModalClose} onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        
        <div className={styles.settingsModalBody}>
          {/* Settings Tabs */}
          <div className={styles.settingsTabs}>
            <button 
              className={`${styles.settingsTab} ${activeTab === 'Personal' ? styles.settingsTabActive : ''}`} 
              onClick={() => setActiveTab('Personal')}
            >
              <i className="fa-solid fa-user"></i> Personal
            </button>
            <button 
              className={`${styles.settingsTab} ${activeTab === 'Appearance' ? styles.settingsTabActive : ''}`} 
              onClick={() => setActiveTab('Appearance')}
            >
              <i className="fa-solid fa-palette"></i> Appearance
            </button>
            <button 
              className={`${styles.settingsTab} ${activeTab === 'Payment' ? styles.settingsTabActive : ''}`} 
              onClick={() => setActiveTab('Payment')}
            >
              <i className="fa-solid fa-credit-card"></i> Payment
            </button>
            <button 
              className={`${styles.settingsTab} ${activeTab === 'Barkada' ? styles.settingsTabActive : ''}`} 
              onClick={() => setActiveTab('Barkada')}
            >
              <i className="fa-solid fa-users"></i> Barkada Plan
            </button>
          </div>

          {/* Personal Info Tab */}
          {activeTab === 'Personal' && (
            <div className={styles.settingsContent}>
              <h3 className={styles.settingsSectionTitle}>
                <i className="fa-solid fa-user-pen"></i> Personal Information
              </h3>
              
              {isLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Loading user data...</div>
              ) : (
                <>
                  <div className={styles.settingsField}>
                    <label className={styles.settingsLabel}>Username</label>
                    <input type="text" className={styles.settingsInput} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your username" />
                  </div>
                  
                  <div className={styles.settingsField}>
                    <label className={styles.settingsLabel}>Grade Level</label>
                    <select className={styles.settingsSelect} defaultValue="">
                      <option value="">Select Grade</option>
                      <option value="1">Grade 1</option>
                      <option value="2">Grade 2</option>
                      <option value="3">Grade 3</option>
                      <option value="4">Grade 4</option>
                      <option value="5">Grade 5</option>
                      <option value="6">Grade 6</option>
                      <option value="7">Grade 7</option>
                      <option value="8">Grade 8</option>
                      <option value="9">Grade 9</option>
                      <option value="10">Grade 10</option>
                      <option value="11">Grade 11</option>
                      <option value="12">Grade 12</option>
                    </select>
                  </div>
                  
                  <div className={styles.settingsField}>
                    <label className={styles.settingsLabel}>Email</label>
                    <input type="email" className={styles.settingsInput} value={email} readOnly disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
                  </div>
                  
                  <div className={styles.settingsField}>
                    <label className={styles.settingsLabel}>New Password</label>
                    <input type="password" className={styles.settingsInput} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Leave blank to keep current password" />
                  </div>

                  <div className={styles.settingsField}>
                    <label className={styles.settingsLabel}>Confirm New Password</label>
                    <input type="password" className={styles.settingsInput} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
                  </div>
                  
                  <button className={styles.heroBtn} style={{ marginTop: '1rem' }} onClick={handleUpdate} disabled={isSaving}>
                    {isSaving ? "Saving..." : <><i className="fa-solid fa-save"></i> Save Changes</>}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'Appearance' && (
            <div className={styles.settingsContent}>
              
              {/* 2. WE PLUG THE AVATAR COMPONENT IN RIGHT HERE! */}
              <AvatarCustomizer />

              {/* A nice divider line to separate avatars from themes */}
              <hr style={{ margin: '2rem 0', borderTop: '1px solid #e5e7eb', borderBottom: 'none' }} />

              <h3 className={styles.settingsSectionTitle}>
                <i className="fa-solid fa-palette"></i> Choose Your Theme
              </h3>
              
              <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#f9fafb', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
                <span style={{ fontWeight: '600', color: '#003F91', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fa-solid fa-wand-magic-sparkles"></i> Enable Background Particles
                </span>
                <input 
                  type="checkbox" 
                  checked={particlesEnabled}
                  onChange={(e) => setParticlesEnabled(e.target.checked)}
                  style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
                />
              </div>

              <h3 className={styles['category-title']}>Classic Modes</h3>
              <div className={styles['theme-grid']}>
                <button 
                  className={`${styles['theme-card']} ${theme === 'custom-new-bg' ? styles.active : ''}`}
                  onClick={() => setTheme('custom-new-bg')}
                >
                  <span style={{ fontSize: '2rem' }}>🖼️</span>
                  <span style={{ fontSize: '0.875rem' }}>Custom Background</span>
                </button>
                <button 
                  className={`${styles['theme-card']} ${theme === 'default-light' ? styles.active : ''}`}
                  onClick={() => setTheme('default-light')}
                >
                  <span style={{ fontSize: '2rem' }}>☀️</span>
                  <span style={{ fontSize: '0.875rem' }}>Default Light</span>
                </button>
                <button 
                  className={`${styles['theme-card']} ${theme === 'classic-dark' ? styles.active : ''}`}
                  onClick={() => setTheme('classic-dark')}
                >
                  <span style={{ fontSize: '2rem' }}>🌙</span>
                  <span style={{ fontSize: '0.875rem' }}>Classic Dark</span>
                </button>
              </div>

              <h3 className={styles['category-title']}>Core Biomes</h3>
              <div className={styles['theme-grid']}>
                <button 
                  className={`${styles['theme-card']} ${theme === 'midnight-grove' ? styles.active : ''}`} 
                  onClick={() => setTheme('midnight-grove')}
                >
                  <span style={{ fontSize: '2rem' }}>🌙</span>
                  <span style={{ fontSize: '0.875rem' }}>Midnight Grove</span>
                </button>
                <button 
                  className={`${styles['theme-card']} ${theme === 'cherry-blossom' ? styles.active : ''}`} 
                  onClick={() => setTheme('cherry-blossom')}
                >
                  <span style={{ fontSize: '2rem' }}>🌸</span>
                  <span style={{ fontSize: '0.875rem' }}>Cherry Blossom Canopy</span>
                </button>
                <button 
                  className={`${styles['theme-card']} ${theme === 'snowy-taiga' ? styles.active : ''}`} 
                  onClick={() => setTheme('snowy-taiga')}
                >
                  <span style={{ fontSize: '2rem' }}>❄️</span>
                  <span style={{ fontSize: '0.875rem' }}>Snowy Taiga</span>
                </button>
                <button 
                  className={`${styles['theme-card']} ${theme === 'desert-oasis' ? styles.active : ''}`} 
                  onClick={() => setTheme('desert-oasis')}
                >
                  <span style={{ fontSize: '2rem' }}>🏜️</span>
                  <span style={{ fontSize: '0.875rem' }}>Desert Oasis</span>
                </button>
              </div>

              <h3 className={styles['category-title']}>Nature & Academic</h3>
              <div className={styles['theme-grid']}>
                <button 
                  className={`${styles['theme-card']} ${theme === 'sunlit-canopy' ? styles.active : ''}`} 
                  onClick={() => setTheme('sunlit-canopy')}
                >
                  <span style={{ fontSize: '2rem' }}>☀️</span>
                  <span style={{ fontSize: '0.875rem' }}>Sunlit Canopy</span>
                </button>
                <button 
                  className={`${styles['theme-card']} ${theme === 'scholars-greenhouse' ? styles.active : ''}`} 
                  onClick={() => setTheme('scholars-greenhouse')}
                >
                  <span style={{ fontSize: '2rem' }}>🪴</span>
                  <span style={{ fontSize: '0.875rem' }}>Scholar's Greenhouse</span>
                </button>
                <button 
                  className={`${styles['theme-card']} ${theme === 'autumn-woods' ? styles.active : ''}`} 
                  onClick={() => setTheme('autumn-woods')}
                >
                  <span style={{ fontSize: '2rem' }}>🍂</span>
                  <span style={{ fontSize: '0.875rem' }}>Autumn Woods</span>
                </button>
              </div>

              <h3 className={styles['category-title']}>Deep Focus Zones</h3>
              <div className={styles['theme-grid']}>
                <button 
                  className={`${styles['theme-card']} ${theme === 'kelp-forest' ? styles.active : ''}`} 
                  onClick={() => setTheme('kelp-forest')}
                >
                  <span style={{ fontSize: '2rem' }}>🌊</span>
                  <span style={{ fontSize: '0.875rem' }}>Kelp Forest</span>
                </button>
                <button 
                  className={`${styles['theme-card']} ${theme === 'tropical-rainforest' ? styles.active : ''}`} 
                  onClick={() => setTheme('tropical-rainforest')}
                >
                  <span style={{ fontSize: '2rem' }}>🌴</span>
                  <span style={{ fontSize: '0.875rem' }}>Tropical Rainforest</span>
                </button>
                <button 
                  className={`${styles['theme-card']} ${theme === 'crystal-cavern' ? styles.active : ''}`} 
                  onClick={() => setTheme('crystal-cavern')}
                >
                  <span style={{ fontSize: '2rem' }}>💎</span>
                  <span style={{ fontSize: '0.875rem' }}>Crystal Cavern</span>
                </button>
              </div>
            </div>
          )}

          {/* Payment Tab */}
          {activeTab === 'Payment' && (
            <div className={styles.settingsContent}>
              {paymentView === 'menu' ? (
                <>
                  <h3 className={styles.settingsSectionTitle}>
                    <i className="fa-solid fa-credit-card"></i> Payment & Subscriptions
                  </h3>
                  
                  <div className={styles.settingsPaymentLinks}>
                    <a href="#" className={styles.settingsPaymentLink} onClick={(e) => { e.preventDefault(); alert('Redirecting to payment methods management...'); }}>
                      <div className={styles.settingsPaymentIcon}>
                        <i className="fa-solid fa-credit-card"></i>
                      </div>
                      <div className={styles.settingsPaymentText}>
                        <div className={styles.settingsPaymentTitle}>Manage Payment Methods</div>
                        <div className={styles.settingsPaymentDesc}>Add, remove, or update your payment options</div>
                      </div>
                      <div className={styles.settingsPaymentArrow}>
                        <i className="fa-solid fa-chevron-right"></i>
                      </div>
                    </a>
                    
                    <a href="#" className={styles.settingsPaymentLink} onClick={(e) => { e.preventDefault(); alert('Redirecting to payments info...'); }}>
                      <div className={styles.settingsPaymentIcon}>
                        <i className="fa-solid fa-receipt"></i>
                      </div>
                      <div className={styles.settingsPaymentText}>
                        <div className={styles.settingsPaymentTitle}>Payments Info</div>
                        <div className={styles.settingsPaymentDesc}>View your transaction history and receipts</div>
                      </div>
                      <div className={styles.settingsPaymentArrow}>
                        <i className="fa-solid fa-chevron-right"></i>
                      </div>
                    </a>
                    
                    <a href="#" className={styles.settingsPaymentLink} onClick={(e) => { e.preventDefault(); setPaymentView('pricing'); }}>
                      <div className={styles.settingsPaymentIcon}>
                        <i className="fa-solid fa-crown"></i>
                      </div>
                      <div className={styles.settingsPaymentText}>
                        <div className={styles.settingsPaymentTitle}>Subscription</div>
                        <div className={styles.settingsPaymentDesc}>Manage your premium subscription plan</div>
                      </div>
                      <div className={styles.settingsPaymentArrow}>
                        <i className="fa-solid fa-chevron-right"></i>
                      </div>
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.paymentHeaderRow}>
                    <button className={styles.backBtn} onClick={() => setPaymentView('menu')}>
                      <i className="fa-solid fa-arrow-left"></i>
                    </button>
                    <h3 className={styles.settingsSectionTitle} style={{ margin: 0 }}>
                      Choose Your Plan
                    </h3>
                  </div>

                  <div className={styles.pricingGrid}>
                    {/* Starter */}
                    <div className={styles.pricingCard}>
                      <div className={styles.tierName}>Weekly Pass</div>
                      <div className={styles.tierPrice}>
                        ₱59.00<span className={styles.tierPeriod}> / 7 Days</span>
                      </div>
                      <ul className={styles.featureList}>
                        <li className={styles.featureItem}>
                          <i className={`fa-solid fa-check ${styles.featureIcon}`}></i>
                          Unlimited AI access
                        </li>
                        <li className={styles.featureItem}>
                          <i className={`fa-solid fa-check ${styles.featureIcon}`}></i>
                          Automated quiz generation
                        </li>
                        <li className={styles.featureItem}>
                          <i className={`fa-solid fa-check ${styles.featureIcon}`}></i>
                          Ad-free experience
                        </li>
                      </ul>
                      <button 
                        className={`${styles.tierBtn} ${styles.tierBtnBasic}`}
                        onClick={() => window.location.href = 'https://buy.stripe.com/test_14A9AVeBxbdn8e19LP63K05'}
                      >
                        Select Weekly Pass
                      </button>
                    </div>

                    {/* Scholar (Popular) */}
                    <div className={`${styles.pricingCard} ${styles.pricingCardPopular}`}>
                      <div className={styles.popularBadge}>Most Popular</div>
                      <div className={styles.tierName}>Premium Scholar</div>
                      <div className={styles.tierPrice}>
                        ₱79.00<span className={styles.tierPeriod}> / mo</span>
                      </div>
                      <ul className={styles.featureList}>
                        <li className={styles.featureItem}>
                          <i className={`fa-solid fa-check ${styles.featureIcon}`}></i>
                          Ad-free experience
                        </li>
                        <li className={styles.featureItem}>
                          <i className={`fa-solid fa-check ${styles.featureIcon}`}></i>
                          Advanced AI Tutor (50 prompts/day)
                        </li>
                        <li className={styles.featureItem}>
                          <i className={`fa-solid fa-check ${styles.featureIcon}`}></i>
                          Auto-quiz from uploaded notes
                        </li>
                        <li className={styles.featureItem}>
                          <i className={`fa-solid fa-check ${styles.featureIcon}`}></i>
                          AI-generated lesson summaries
                        </li>
                      </ul>
                      <button 
                        className={`${styles.tierBtn} ${styles.tierBtnPopular}`}
                        onClick={() => window.location.href = 'https://buy.stripe.com/test_bJe5kF2SP4OZ0LzbTX63K04'}
                      >
                        Upgrade to Premium Scholar
                      </button>
                    </div>

                    {/* Mastery */}
                    <div className={styles.pricingCard}>
                      <div className={styles.tierName}>Barkada Plan</div>
                      <div className={styles.tierPrice}>
                        ₱199.00<span className={styles.tierPeriod}> / mo (5 Users)</span>
                      </div>
                      <ul className={styles.featureList}>
                        <li className={styles.featureItem}>
                          <i className={`fa-solid fa-check ${styles.featureIcon}`}></i>
                          Premium Scholar for 5 users
                        </li>
                        <li className={styles.featureItem}>
                          <i className={`fa-solid fa-check ${styles.featureIcon}`}></i>
                          Shared Team AI Workspace
                        </li>
                        <li className={styles.featureItem}>
                          <i className={`fa-solid fa-check ${styles.featureIcon}`}></i>
                          Collaborative note-sharing
                        </li>
                        <li className={styles.featureItem}>
                          <i className={`fa-solid fa-check ${styles.featureIcon}`}></i>
                          Group trivia tournaments
                        </li>
                      </ul>
                      <button 
                        className={`${styles.tierBtn} ${styles.tierBtnBasic}`}
                        onClick={() => window.location.href = 'https://buy.stripe.com/test_9B69AV1OL95f1PD6zD63K03'}
                      >
                        Select Barkada Plan
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Barkada Tab */}
          {activeTab === 'Barkada' && (
            <BarkadaManager setActiveTab={setActiveTab} />
          )}
        </div>
      </div>
    </div>
  );
}