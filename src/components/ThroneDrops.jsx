import React, { useState, useEffect } from 'react';
import styles from '../dashboard.module.css';
import supabase from '../supabaseClient';
import toast from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';

export default function ThroneDrops({ currentPage, topUsers, calculateLevel, buzzBalance, fetchBuzzBalance }) {
    const { userAvatar } = useTheme();
    const [myInventory, setMyInventory] = useState([]);
    const [equippedAvatar, setEquippedAvatar] = useState('default');

    const availableDrops = [
        { id: 'av-neon', category: 'avatars', name: 'Neon', desc: 'Electric speed for fast learners.', price: 1500, badge: 'EPIC', badgeClass: 'epic', image: '/avatars/Neon.png', seed: 'neon' },
        { id: 'av-raze', category: 'avatars', name: 'Raze', desc: 'Explosive creativity in every duel.', price: 1200, badge: 'RARE', badgeClass: 'rare', image: '/avatars/Raze.png', seed: 'raze' },
        { id: 'av-chamber', category: 'avatars', name: 'Chamber', desc: 'Tactical precision and class.', price: 3000, badge: 'MYTHIC', badgeClass: 'legendary', image: '/avatars/Chamber.png', seed: 'chamber' },
        { id: 'av-killjoy', category: 'avatars', name: 'Killjoy', desc: 'Mastering the tech and the grades.', price: 1800, badge: 'RARE', badgeClass: 'rare', image: '/avatars/Killjoy.png', seed: 'killjoy' },
        { id: 'av-omen', category: 'avatars', name: 'Omen', desc: 'Aced the test from the shadows.', price: 2500, badge: 'EPIC', badgeClass: 'epic', image: '/avatars/Omen.png', seed: 'omen' },
        { id: 'av-cyphey', category: 'avatars', name: 'Cypher', desc: 'Always one step ahead of the lesson.', price: 1600, badge: 'RARE', badgeClass: 'rare', image: '/avatars/Cyphey.png', seed: 'cypher' },
        { id: 'av-viper', category: 'avatars', name: 'Viper', desc: 'Lethal science and perfect scores.', price: 2200, badge: 'EPIC', badgeClass: 'epic', image: '/avatars/Viper.png', seed: 'viper' },
        { id: 'av-sage', category: 'avatars', name: 'Sage', desc: 'Bringing balance to your study streak.', price: 2000, badge: 'RARE', badgeClass: 'rare', image: '/avatars/Sage.jpg', seed: 'sage' },
        { id: 'av-yoru', category: 'avatars', name: 'Yoru', desc: 'Master of spatial study and time.', price: 3500, badge: 'MYTHIC', badgeClass: 'legendary', image: '/avatars/Yoru.jpg', seed: 'yoru' },
        { id: 'av-sova', category: 'avatars', name: 'Sova', desc: 'Calculated precision in every answer.', price: 1500, badge: 'RARE', badgeClass: 'rare', image: '/avatars/Sova.jpg', seed: 'sova' },
        { id: 'av-astra', category: 'avatars', name: 'Astra', desc: 'Cosmic focus for top-tier scholars.', price: 2800, badge: 'EPIC', badgeClass: 'epic', image: '/avatars/Astra.jpg', seed: 'astra' },
        { id: 'av-phoenix', category: 'avatars', name: 'Phoenix', desc: 'Heating up the leaderboard ranks.', price: 1400, badge: 'RARE', badgeClass: 'rare', image: '/avatars/Phoenix.jpg', seed: 'phoenix' },
        { id: 'av-skye', category: 'avatars', name: 'Skye', desc: 'Guiding your path to academic victory.', price: 1800, badge: 'RARE', badgeClass: 'rare', image: '/avatars/Skye.jpg', seed: 'skye' },
        { id: 'av-jett', category: 'avatars', name: 'Jett', desc: 'Agile thinking and rapid responses.', price: 2400, badge: 'EPIC', badgeClass: 'epic', image: '/avatars/Jett.jpg', seed: 'jett' },
        { id: 'av-brimstone', category: 'avatars', name: 'Brimstone', desc: 'The ultimate veteran of the arena.', price: 2000, badge: 'RARE', badgeClass: 'rare', image: '/avatars/Brimstone.jpg', seed: 'brimstone' },
        { id: 'throne-champion', category: 'badges', name: '🏆 Throne Champion', desc: 'Awarded for claiming the weekly Buzz throne.', price: 5000, badge: 'RARE', badgeClass: 'rare' },
        { id: 'double-xp', category: 'badges', name: '⚡⚡ Double XP Token', desc: 'Double XP for 24 hours!', price: 1800, badge: 'RARE', badgeClass: 'rare' }
    ];

    const fetchInventory = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: invData } = await supabase.from('user_inventory').select('item_id').eq('user_id', user.id);
        if (invData) setMyInventory(invData.map(item => item.item_id));
        const { data: profileData } = await supabase.from('profiles').select('avatar_seed').eq('id', user.id).single();
        if (profileData && profileData.avatar_seed) setEquippedAvatar(profileData.avatar_seed);
    };

    useEffect(() => {
        if (currentPage === 'throne') fetchInventory();
    }, [currentPage]);

    const handlePurchaseDrop = async (drop) => {
        if (buzzBalance < drop.price) {
            toast.error(`Not enough Buzz! You need ${drop.price} Buzz.`);
            return;
        }
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { error: txError } = await supabase.rpc('process_buzz_transaction', { amount_to_add: -drop.price, transaction_reason: `Bought ${drop.name}` });
        if (txError) return toast.error('Transaction failed!');
        const { error: invError } = await supabase.from('user_inventory').insert([{ user_id: user.id, item_id: drop.id, category: drop.category }]);
        if (invError) return toast.error('Failed to add to inventory!');
        toast.success(`Successfully purchased ${drop.name}! 🎉`);
        fetchBuzzBalance();
        fetchInventory();
    };

    const handleEquipAvatar = async (seed) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { error } = await supabase.from('profiles').update({ avatar_seed: seed }).eq('id', user.id);
        if (error) {
            toast.error('Failed to equip avatar.');
        } else {
            setEquippedAvatar(seed);
            toast.success('Avatar equipped! Looking sharp. 😎');
            setTimeout(() => window.location.reload(), 1500); 
        }
    };

    const handleUnequip = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { error } = await supabase.from('profiles').update({ avatar_seed: 'default' }).eq('id', user.id);
        if (error) {
            toast.error('Failed to unequip avatar.');
        } else {
            setEquippedAvatar('default');
            toast.success('Avatar unequipped!');
            setTimeout(() => window.location.reload(), 1000); 
        }
    };

    const isOwned = (itemId) => myInventory.includes(itemId);
    const myOwnedItems = availableDrops.filter(drop => isOwned(drop.id));

    return (
        <section id="throne" className={`${styles['page-section']} ${currentPage === 'throne' ? styles['fade-in'] : styles['hidden-page']}`}>
            <h2 className={`${styles['section-heading']} ${styles['large']}`}>👑 Buzz Throne & Limited Drops</h2>
            
            <div className={styles['throne-leaderboard']}>
                <h3 className={styles['section-heading']}>🏆 Weekly Buzz Leaderboard</h3>
                <div className={styles['throne-lb-list']}>
                    {topUsers.map((u, idx) => {
                        let rankClass = idx === 0 ? styles['gold'] : idx === 1 ? styles['silver'] : idx === 2 ? styles['bronze'] : styles['you'];
                        let rankIcon = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1;
                        return (
                            <div key={idx} className={`${styles['throne-lb-item']} ${rankClass}`}>
                                <span className={styles['throne-rank']}>{rankIcon}</span>
                                <div className={styles['throne-lb-avatar']} style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <img 
                                        src={u.avatar_seed && u.avatar_seed.includes('avatar') ? `/avatars/${u.avatar_seed}.png` : `https://api.dicebear.com/9.x/avataaars/svg?seed=${u.avatar_seed || u.first_name}`} 
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        alt="avatar"
                                    />
                                </div>
                                <div className={styles['throne-lb-info']}>
                                    <p className={styles['throne-lb-name']}>{u.first_name || 'Anonymous'}</p>
                                    <p className={styles['throne-lb-level']}>Lvl {calculateLevel(u.xp)} Scholar</p>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: 'auto' }}>
                                    <span className={styles['throne-lb-wits']}>🍯 {u.xp || 0}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className={styles['drops-section']}>
                <div className={styles['drops-header']}>
                    <div>
                        <h3 className={styles['section-heading']}>🎁 Limited Edition Drops</h3>
                        <p className={styles['drops-subtitle']}>Exclusive time-limited items! Buy them before they vanish.</p>
                    </div>
                </div>

                <div className={styles['drops-grid']}>
                    {availableDrops.map((drop) => (
                        <div key={drop.id} className={styles['drop-card']}>
                            <div className={`${styles['drop-badge']} ${styles['limited']}`}>LIMITED</div>
                            <div className={`${styles['drop-badge']} ${styles[drop.badgeClass]}`}>{drop.badge}</div>
                            
                            <div className={styles['drop-image-container']} style={{ height: '140px', display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
                                {drop.image ? (
                                    <img src={drop.image} alt={drop.name} style={{ height: '100%', objectFit: 'contain' }} />
                                ) : (
                                    <div style={{ fontSize: '3rem' }}>🎁</div>
                                )}
                            </div>

                            <div className={styles['drop-info']}>
                                <h4 className={styles['drop-name']}>{drop.name}</h4>
                                <p className={styles['drop-desc']}>{drop.desc}</p>
                            </div>
                            <div className={styles['drop-footer']}>
                                <div className={styles['drop-price']}>🍯 {drop.price} Buzz</div>
                                <button 
                                    className={styles['drop-buy-btn']}
                                    onClick={() => !isOwned(drop.id) && handlePurchaseDrop(drop)}
                                    style={isOwned(drop.id) ? { background: '#4b5563', cursor: 'not-allowed', color: '#9ca3af' } : {}}
                                >
                                    {isOwned(drop.id) ? 'Owned ✓' : 'Get Drop'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles['my-drops-section']} style={{ marginTop: '3rem' }}>
                <h3 className={styles['section-heading']}>🎒 My Backpack (Inventory)</h3>
                <div className={styles['drops-grid']}>
                    {myOwnedItems.length === 0 ? (
                        <p className={styles['no-drops-msg']}>You don't own any limited drops yet. Visit the store above!</p>
                    ) : (
                        myOwnedItems.map((item) => (
                            <div key={item.id} className={styles['drop-card']} style={{ border: '2px solid var(--color-primary)'}}>
                                <div className={styles['drop-image-container']} style={{ height: '100px', display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                                    <img src={item.image} alt={item.name} style={{ height: '100%', objectFit: 'contain' }} />
                                </div>
                                <div className={styles['drop-info']} style={{ marginTop: '0.5rem' }}>
                                    <h4 className={styles['drop-name']}>{item.name}</h4>
                                    <span style={{ fontSize: '0.8rem', color: 'gray', textTransform: 'uppercase' }}>{item.category}</span>
                                </div>
                                <div className={styles['drop-footer']}>
                                    {item.category === 'avatars' ? (
                                        equippedAvatar === item.seed ? (
                                            <button className={styles['drop-buy-btn']} style={{ background: '#ef4444' }} onClick={() => handleUnequip()}>Unequip ❌</button>
                                        ) : (
                                            <button className={styles['drop-buy-btn']} style={{ background: '#a855f7' }} onClick={() => handleEquipAvatar(item.seed)}>Equip Avatar</button>
                                        )
                                    ) : (
                                        <span style={{ color: '#9ca3af', fontWeight: 'bold' }}>Passive Item</span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}