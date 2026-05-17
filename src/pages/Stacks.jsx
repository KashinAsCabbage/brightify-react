import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';

export default function Stacks() {
  const [currentView, setCurrentView] = useState('browse'); // 'browse' or 'study'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [earnedBuzz, setEarnedBuzz] = useState(0);
  const navigate = useNavigate();
  
  const [decks, setDecks] = useState([]);
  const [activeStack, setActiveStack] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const categories = ['All', 'Multiple Choice', 'Spelling'];

  React.useEffect(() => {
    async function fetchDecks() {
      const { data, error } = await supabase
        .from('stacks')
        .select('*, flashcards(*)');
      
      if (error) {
        console.error("Error fetching decks:", error);
        return;
      }
      if (data) {
        setDecks(data);
      }
    }
    fetchDecks();
  }, []);

  const handleNext = async () => {
    setIsFlipped(false);
    if (currentIndex < activeStack.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Trigger completion sequence
      setIsCompleted(true);
      let reward = 0;
      if (activeStack.length <= 5) reward = 10;
      else if (activeStack.length <= 15) reward = 25;
      else reward = 50;
      
      setEarnedBuzz(reward);

      // Update Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('buzz_balance, total_study_seconds')
          .eq('id', user.id)
          .single();

        if (profile) {
          const newBuzz = (profile.buzz_balance || 0) + reward;
          const newStudySeconds = (profile.total_study_seconds || 0) + (activeStack.length * 15);
          
          await supabase
            .from('profiles')
            .update({
              buzz_balance: newBuzz,
              total_study_seconds: newStudySeconds
            })
            .eq('id', user.id);
        }
      }
    }
  };

  const handlePrev = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  if (currentView === 'study' && isCompleted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#0f172a', color: '#fff', fontFamily: "'Poppins', sans-serif" }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem', fontWeight: 'bold' }}>Stack Completed! 🎉</h1>
        <p style={{ fontSize: '1.2rem', marginBottom: '2rem', color: '#94a3b8' }}>You earned +{earnedBuzz} Buzz for your hard work!</p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => navigate('/dashboard')}
            style={{ padding: '0.8rem 1.5rem', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', transition: 'background 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#475569'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#334155'}
          >
            Return to Dashboard
          </button>
          <button 
            onClick={() => navigate('/duels?deckId=1')}
            style={{ padding: '0.8rem 1.5rem', backgroundColor: '#003F91', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', transition: 'background 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#002f6c'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#003F91'}
          >
            Test Knowledge in the Arena
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0f172a', color: '#fff', padding: '2rem', fontFamily: "'Poppins', sans-serif" }}>
      
      {currentView === 'browse' && (
        <div style={{ width: '100%', maxWidth: '1000px', marginTop: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Public Stacks Gallery</h1>
          
          {/* Search Bar & Categories */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              placeholder="Search decks..." 
              style={{ flex: 1, padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(12px)', color: '#fff', outline: 'none' }}
            />
            {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setActiveFilter(cat)}
                style={{ 
                  padding: '0.8rem 1.5rem', 
                  borderRadius: '20px', 
                  border: activeFilter === cat ? 'none' : '1px solid rgba(255,255,255,0.1)', 
                  backgroundColor: activeFilter === cat ? '#3b82f6' : 'rgba(15, 23, 42, 0.7)', 
                  backdropFilter: activeFilter === cat ? 'none' : 'blur(12px)',
                  color: '#fff', 
                  fontWeight: activeFilter === cat ? 'bold' : 'normal',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Deck Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {decks.filter(deck => {
              if (activeFilter === 'All') return true;
              return deck.type === activeFilter || deck.mode === activeFilter;
            }).map(deck => (
              <div 
                key={deck.id}
                style={{ cursor: 'pointer', position: 'relative', zIndex: 50 }} 
                onClick={() => navigate(`/duels?deckId=${deck.id}`)}
              >
                <div 
                  style={{ 
                    backgroundColor: '#1e293b', 
                    borderRadius: '16px', 
                    padding: '1.5rem', 
                    border: '1px solid #334155',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.4)'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#334155'; }}
                >
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{deck.icon || '📚'}</div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{deck.title}</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>{deck.description || 'A flashcard deck.'}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#38bdf8', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ backgroundColor: '#0f172a', padding: '4px 10px', borderRadius: '12px' }}>Play Arena</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/spelling-rush', { state: { cards: deck.flashcards, stackName: deck.title } });
                        }}
                        style={{ backgroundColor: '#f59e0b', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}
                      >
                        🎮 Play Spelling Rush
                      </button>
                    </div>
                    <span>{deck.category || 'General'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentView === 'study' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, width: '100%' }}>
          
          <div style={{ width: '100%', maxWidth: '600px', display: 'flex', justifyContent: 'flex-start', marginBottom: '1rem' }}>
            <button 
              onClick={() => {
                setCurrentView('browse');
                setCurrentIndex(0);
                setIsCompleted(false);
                setIsFlipped(false);
              }}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0' }}
              onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
              onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
            >
              ← Back to Decks
            </button>
          </div>

          <div 
            onClick={() => setIsFlipped(!isFlipped)}
            style={{
              width: '100%',
              maxWidth: '600px',
              height: '400px',
              perspective: '1000px',
              cursor: 'pointer',
            }}
          >
            <div style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              textAlign: 'center',
              transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}>
              {/* Front */}
              <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backfaceVisibility: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2.5rem',
                backgroundColor: '#1e293b',
                borderRadius: '16px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f8fafc' }}>{activeStack[currentIndex].term}</h1>
              </div>
              {/* Back */}
              <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backfaceVisibility: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2.5rem',
                backgroundColor: '#003F91',
                borderRadius: '16px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                transform: 'rotateY(180deg)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'normal', lineHeight: '1.6', color: '#f8fafc' }}>{activeStack[currentIndex].definition}</h2>
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <button 
              onClick={handlePrev} 
              disabled={currentIndex === 0}
              style={{ 
                padding: '0.8rem 1.5rem', 
                backgroundColor: currentIndex === 0 ? '#334155' : '#475569', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', 
                opacity: currentIndex === 0 ? 0.5 : 1,
                fontWeight: 'bold',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => { if (currentIndex !== 0) e.currentTarget.style.backgroundColor = '#64748b' }}
              onMouseOut={(e) => { if (currentIndex !== 0) e.currentTarget.style.backgroundColor = '#475569' }}
            >
              Previous
            </button>
            <span style={{ fontSize: '1.2rem', fontWeight: '500', color: '#94a3b8' }}>
              {currentIndex + 1} / {activeStack.length}
            </span>
            <button 
              onClick={handleNext}
              style={{ 
                padding: '0.8rem 1.5rem', 
                backgroundColor: '#10b981', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#059669'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
            >
              {currentIndex === activeStack.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
