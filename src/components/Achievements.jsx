import React from 'react';
import styles from '../dashboard.module.css';

export default function Achievements({ currentPage }) {
    const badges = [
        { id: 1, title: 'First Blood', desc: 'Win your first Arena Duel.', icon: '⚔️', unlocked: true, date: 'May 1, 2026' },
        { id: 2, title: 'Streak Master', desc: 'Study for 7 days in a row.', icon: '🔥', unlocked: true, date: 'May 5, 2026' },
        { id: 3, title: 'The Architect', desc: 'Create 5 custom flashcard decks.', icon: '🏗️', unlocked: true, date: 'May 6, 2026' },
        { id: 4, title: 'Throne Challenger', desc: 'Reach the Top 3 on the leaderboard.', icon: '👑', unlocked: false, progress: '80%' },
        { id: 5, title: 'Mythic Collector', desc: 'Equip a Mythic-tier Avatar.', icon: '💎', unlocked: false, progress: '10%' },
        { id: 6, title: 'Valedictorian', desc: 'Master all subjects in your curriculum.', icon: '🎓', unlocked: false, progress: '45%' },
    ];

    return (
        <section className={`${styles['page-section']} ${currentPage === 'achievements' ? styles['fade-in'] : styles['hidden-page']}`}>
            <h2 className={styles['section-heading']}>🏆 My Achievements</h2>
            <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Track your gamified learning progress and earn bragging rights.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {badges.map(badge => (
                    <div key={badge.id} style={{
                        padding: '20px',
                        borderRadius: '12px',
                        background: badge.unlocked ? '#fff' : '#f3f4f6',
                        border: badge.unlocked ? '2px solid #f59e0b' : '2px dashed #d1d5db',
                        opacity: badge.unlocked ? 1 : 0.7,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px',
                        transition: 'transform 0.2s',
                        cursor: 'pointer',
                        boxShadow: badge.unlocked ? '0 4px 6px -1px rgba(245, 158, 11, 0.2)' : 'none'
                    }}>
                        <div style={{ 
                            fontSize: '2.5rem', 
                            filter: badge.unlocked ? 'none' : 'grayscale(100%)' 
                        }}>
                            {badge.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ margin: 0, fontSize: '1.1rem', color: badge.unlocked ? '#1f2937' : '#6b7280' }}>{badge.title}</h4>
                            <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#6b7280' }}>{badge.desc}</p>
                            
                            {badge.unlocked ? (
                                <span style={{ display: 'inline-block', marginTop: '8px', fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold' }}>✓ Unlocked on {badge.date}</span>
                            ) : (
                                <div style={{ marginTop: '10px', height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: badge.progress, height: '100%', background: '#9ca3af' }}></div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
