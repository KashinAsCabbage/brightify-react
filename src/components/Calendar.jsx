import React, { useState } from 'react';
import styles from '../dashboard.module.css';

export default function Calendar({ currentPage }) {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentDate = today.getDate();

    // Calendar logic
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Initialize state with hardcoded events for demo purposes
    const initialEvents = {};
    const todayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDate).padStart(2, '0')}`;
    initialEvents[todayStr] = [{ id: '1', title: 'Review Decks', color: '#f59e0b' }];
    
    if (currentMonth === 4) { // May
        const tomorrowStr = `${currentYear}-05-${String(currentDate + 1).padStart(2, '0')}`;
        initialEvents[tomorrowStr] = [{ id: '2', title: 'WCC System Defense! 🏆', color: '#ef4444' }];
    }

    const [events, setEvents] = useState(initialEvents);

    const handleDayClick = (dateString) => {
        const eventTitle = window.prompt("Enter event details:");
        if (eventTitle && eventTitle.trim() !== '') {
            setEvents(prev => ({
                ...prev,
                [dateString]: [...(prev[dateString] || []), { id: Date.now().toString(), title: eventTitle, color: '#3b82f6' }]
            }));
        }
    };

    const handleEventClick = (e, dateString, eventId) => {
        e.stopPropagation(); // Prevent triggering day click
        if (window.confirm("Delete this event?")) {
            setEvents(prev => ({
                ...prev,
                [dateString]: prev[dateString].filter(ev => ev.id !== eventId)
            }));
        }
    };

    // Generate blank slots for days before the 1st
    const blanks = Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`blank-${i}`} className={styles['cal-day-blank']}></div>);
    
    // Generate actual days
    const dayCells = Array.from({ length: daysInMonth }).map((_, i) => {
        const dayNum = i + 1;
        const isToday = dayNum === currentDate;
        const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        const dayEvents = events[dateString] || [];
        
        return (
            <div key={dayNum} 
                onClick={() => handleDayClick(dateString)}
                style={{
                padding: '10px',
                minHeight: '80px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: isToday ? '#fef3c7' : '#ffffff', // Highlight today in pale yellow/honey
                borderLeft: isToday ? '4px solid #f59e0b' : '1px solid #e5e7eb',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                overflow: 'hidden'
            }}
            onMouseOver={(e) => { if(!isToday) e.currentTarget.style.backgroundColor = '#f9fafb'; }}
            onMouseOut={(e) => { if(!isToday) e.currentTarget.style.backgroundColor = '#ffffff'; }}
            >
                <span style={{ fontWeight: isToday ? 'bold' : 'normal', color: isToday ? '#d97706' : '#374151' }}>
                    {dayNum}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', width: '100%' }}>
                    {dayEvents.map(ev => (
                        <span 
                            key={ev.id}
                            onClick={(e) => handleEventClick(e, dateString, ev.id)}
                            style={{ 
                                fontSize: '0.7rem', 
                                background: ev.color || '#3b82f6', 
                                color: '#fff', 
                                padding: '2px 6px', 
                                borderRadius: '4px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: 'block',
                                width: '100%',
                                textAlign: 'left'
                            }}
                            title={`Delete: ${ev.title}`}
                        >
                            {ev.title}
                        </span>
                    ))}
                </div>
            </div>
        );
    });

    return (
        <section className={`${styles['page-section']} ${currentPage === 'calendar' ? styles['fade-in'] : styles['hidden-page']}`}>
            <h2 className={styles['section-heading']}>📅 My Study Calendar</h2>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '20px', color: '#1f2937' }}>
                    {monthNames[currentMonth]} {currentYear}
                </h3>
                
                {/* Days Header */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', marginBottom: '10px', textAlign: 'center', fontWeight: 'bold', color: '#6b7280' }}>
                    {days.map(d => <div key={d}>{d}</div>)}
                </div>
                
                {/* Calendar Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
                    {blanks}
                    {dayCells}
                </div>
            </div>
        </section>
    );
}