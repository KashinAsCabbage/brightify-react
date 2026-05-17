import React, { useState, useEffect, useRef } from 'react';
import supabase from '../supabaseClient';
import styles from './settings.module.css'; // Reusing modal structural aesthetics
import toast from 'react-hot-toast';

export default function SharpnessQuizModal({ isOpen, onClose, onSuccess, onFail, fetchProfileData }) {
  const [activeCard, setActiveCard] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [userAnswer, setUserAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizPhase, setQuizPhase] = useState('loading'); // loading, playing, finished
  
  const timerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      startQuiz();
    } else {
      resetQuiz();
    }
  }, [isOpen]);

  useEffect(() => {
    if (quizPhase === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimeOut();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [quizPhase]);

  const resetQuiz = () => {
    setActiveCard(null);
    setTimeLeft(15);
    setUserAnswer('');
    setIsSubmitting(false);
    setQuizPhase('loading');
    clearInterval(timerRef.current);
  };

  const startQuiz = async () => {
    resetQuiz();
    
    // Fetch a batch of cards
    const { data: cards, error } = await supabase
      .from('flashcards')
      .select('*')
      .limit(50);
      
    if (error || !cards || cards.length === 0) {
      toast.error("You don't have any flashcards yet! Add some to take the quiz.");
      onClose();
      return;
    }

    // Pick one random card
    const randomCard = cards[Math.floor(Math.random() * cards.length)];
    setActiveCard(randomCard);
    setQuizPhase('playing');
  };

  const handleTimeOut = async () => {
    clearInterval(timerRef.current);
    if (isSubmitting || quizPhase === 'finished') return;
    
    setQuizPhase('finished');
    toast.error("Time's up! Your brain feels a bit foggy...");
    
    await completeSession(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (quizPhase !== 'playing' || isSubmitting) return;
    clearInterval(timerRef.current);
    setIsSubmitting(true);
    setQuizPhase('finished');

    const cleanInput = userAnswer.toLowerCase().trim();
    const cleanAnswer = activeCard.definition.toLowerCase().trim();

    if (cleanInput === cleanAnswer || cleanAnswer.includes(cleanInput) && cleanInput.length > 3) {
      toast.success("Perfect! You're feeling Sharp ⚡!");
      await completeSession(true);
    } else {
      toast.error(`Incorrect! The right answer was: ${activeCard.definition}`);
      await completeSession(false);
    }
  };

  const completeSession = async (isCorrect) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      if (isCorrect) {
        // Fetch current XP, then add 50
        const { data: profile } = await supabase.from('profiles').select('xp').eq('id', user.id).single();
        const currentXp = profile?.xp || 0;
        
        await supabase.rpc('process_buzz_transaction', { 
            amount_to_add: 50, 
            transaction_reason: "Passed Daily Sharpness Quiz" 
        });

        await supabase.from('profiles').update({ 
            last_quiz_at: new Date().toISOString(),
            xp: currentXp + 50
        }).eq('id', user.id);

        if (onSuccess) onSuccess();
      } else {
        await supabase.from('profiles').update({ 
            last_quiz_at: new Date().toISOString()
        }).eq('id', user.id);

        if (onFail) onFail();
      }
      
      // Request parent to refresh data
      if (fetchProfileData) await fetchProfileData();
    } catch (err) {
      console.error("Error finalizing quiz:", err);
    }

    setIsSubmitting(false);
    setTimeout(() => {
        onClose();
    }, 1500); // 1.5s delay to read the toast
  };

  if (!isOpen) return null;

  return (
    <div className={styles.settingsModalOverlay} style={{ backdropFilter: 'blur(10px)', zIndex: 9999 }}>
      <div className={styles.settingsModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.settingsModalHeader}>
          <span className={styles.settingsModalTitle} style={{ color: '#003F91' }}>
            ⚡ Test Your Sharpness
          </span>
          <button className={styles.settingsModalClose} onClick={onClose} disabled={quizPhase === 'playing'}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        
        <div className={styles.settingsModalBody} style={{ padding: '2rem', textAlign: 'center' }}>
          {quizPhase === 'loading' && (
            <div style={{ padding: '2rem' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--color-primary)' }}></i>
              <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>Retrieving a challenge from your stacks...</p>
            </div>
          )}

          {quizPhase !== 'loading' && activeCard && (
            <div className="quiz-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', color: 'var(--color-text-muted)' }}>Daily Challenge</span>
                <span style={{ 
                    fontWeight: 'bold', 
                    fontSize: '1.2rem', 
                    color: timeLeft <= 5 ? '#ef4444' : 'var(--color-primary)',
                    backgroundColor: timeLeft <= 5 ? '#fee2e2' : '#e0f2fe',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '1rem'
                }}>
                  ⏱️ {timeLeft}s
                </span>
              </div>

              <div style={{ 
                  background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-background))', 
                  padding: '2rem 1.5rem', 
                  borderRadius: '1rem',
                  border: '1px solid var(--color-primary-disabled)',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-text)', margin: 0 }}>
                  {activeCard.term}
                </h3>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Type your answer here..." 
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  disabled={quizPhase === 'finished'}
                  style={{
                      width: '100%',
                      padding: '1rem',
                      borderRadius: '0.75rem',
                      border: '2px solid #e5e7eb',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
                
                <button 
                  type="submit" 
                  disabled={quizPhase === 'finished' || !userAnswer.trim()}
                  style={{
                      backgroundColor: 'var(--color-primary)',
                      color: 'white',
                      fontWeight: 'bold',
                      padding: '1rem',
                      borderRadius: '0.75rem',
                      border: 'none',
                      cursor: (quizPhase === 'finished' || !userAnswer.trim()) ? 'not-allowed' : 'pointer',
                      opacity: (quizPhase === 'finished' || !userAnswer.trim()) ? 0.6 : 1,
                      transition: 'opacity 0.2s, transform 0.1s'
                  }}
                  onMouseDown={(e) => { if (quizPhase !== 'finished' && userAnswer.trim()) e.target.style.transform = 'scale(0.98)' }}
                  onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
                >
                  Confirm Answer
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
