import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import forestBg from '../assets/forest-bg.jpg';

export default function DuelArena() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [duel, setDuel] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState(null); // 'challenger' or 'opponent'
  const [enemyRole, setEnemyRole] = useState(null);

  const [cards, setCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  const [challengerHp, setChallengerHp] = useState(100);
  const [opponentHp, setOpponentHp] = useState(100);

  const [isLoading, setIsLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isFlashRed, setIsFlashRed] = useState(false);
  const [isTakingDamage, setIsTakingDamage] = useState(false);
  
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null); // 'challenger', 'opponent', or 'tie'
  const [timeLeft, setTimeLeft] = useState(10);

  // Hydration
  useEffect(() => {
    const initDuel = async () => {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setCurrentUser(user);

      // 2. Fetch duel
      const { data: duelData, error: duelError } = await supabase
        .from('active_duels')
        .select('*')
        .eq('id', id)
        .single();

      if (duelError || !duelData) {
        toast.error("Duel not found.");
        navigate('/dashboard');
        return;
      }

      setDuel(duelData);
      setChallengerHp(duelData.challenger_hp);
      setOpponentHp(duelData.opponent_hp);

      let myRole = '';
      if (user.id === duelData.challenger_id) myRole = 'challenger';
      else if (user.id === duelData.opponent_id) myRole = 'opponent';
      else {
        toast.error("You are not part of this duel!");
        navigate('/dashboard');
        return;
      }
      
      setRole(myRole);
      setEnemyRole(myRole === 'challenger' ? 'opponent' : 'challenger');

      // 3. Fetch Flashcards
      const { data: flashcards, error: cardError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('stack_id', duelData.stack_id);

      if (cardError || !flashcards || flashcards.length === 0) {
        toast.error("No cards found in this deck!");
        navigate('/dashboard');
        return;
      }

      // Format cards
      const formattedCards = flashcards.map(card => {
        const correctText = card.definition || card.answer || card.back || 'Correct';
        const answers = [{ text: correctText, isCorrect: true }];

        if (card.wrong_1) answers.push({ text: card.wrong_1, isCorrect: false });
        if (card.wrong_2) answers.push({ text: card.wrong_2, isCorrect: false });
        if (card.wrong_3) answers.push({ text: card.wrong_3, isCorrect: false });

        // If less than 4, fill with random distractors from other cards
        const otherCards = flashcards.filter(c => c.id !== card.id).sort(() => 0.5 - Math.random());
        for (let i = 0; i < otherCards.length && answers.length < 4; i++) {
          const wrongTxt = otherCards[i].definition || otherCards[i].answer || otherCards[i].back;
          if (wrongTxt && wrongTxt !== correctText && !answers.find(a => a.text === wrongTxt)) {
            answers.push({ text: wrongTxt, isCorrect: false });
          }
        }
        
        return {
          ...card,
          question: card.term || card.question || card.front || 'No Question',
          answers: answers.sort(() => 0.5 - Math.random()) // shuffle
        };
      });

      setCards(formattedCards);
      setIsLoading(false);
    };

    initDuel();
  }, [id, navigate]);

  // Realtime Sync
  useEffect(() => {
    if (!id) return;
    
    const channel = supabase.channel(`duel_arena_${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'active_duels', filter: `id=eq.${id}` },
        (payload) => {
          setChallengerHp(payload.new.challenger_hp);
          setOpponentHp(payload.new.opponent_hp);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Win/Loss Condition
  useEffect(() => {
    if (isLoading) return;
    if (challengerHp <= 0 || opponentHp <= 0) {
      setGameOver(true);
      if (challengerHp <= 0 && opponentHp <= 0) setWinner('tie');
      else if (challengerHp <= 0) setWinner('opponent');
      else setWinner('challenger');
    }
  }, [challengerHp, opponentHp, isLoading]);

  const handleSelfDamage = async (damageAmount = 10) => {
    setIsTakingDamage(true);
    setTimeout(() => setIsTakingDamage(false), 400);

    if (duel) {
      await supabase.rpc('take_self_damage', { 
        target_duel_id: duel.id, 
        player_who_failed: currentUser?.id, 
        damage_amount: damageAmount 
      });
    }
  };

  const handleTimeout = () => {
    // Penalty state
    setIsFlashRed(true);
    setIsBlocked(true);
    setTimeout(() => setIsFlashRed(false), 200);
    setTimeout(() => setIsBlocked(false), 2000);
    
    // Force to next question and reset timer
    setCurrentCardIndex(prev => (prev + 1) % cards.length);
    setTimeLeft(10);
    handleSelfDamage(10);
  };

  useEffect(() => {
    let timerId;
    if (!gameOver && !isLoading && !isBlocked && cards.length > 0) {
      if (timeLeft > 0) {
        timerId = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      } else {
        handleTimeout();
      }
    }
    return () => clearTimeout(timerId);
  }, [timeLeft, gameOver, isLoading, isBlocked, cards.length]);

  const handleAnswer = async (isCorrect) => {
    if (isBlocked || gameOver) return;

    if (isCorrect) {
      // Advance to next card via modulo loop
      setCurrentCardIndex(prev => (prev + 1) % cards.length);
      setTimeLeft(10);

      // Deal damage
      const { error } = await supabase.rpc('take_damage', { 
        duel_id: id, 
        target_role: enemyRole, 
        damage_amount: 10 
      });

      if (error) {
        console.error("Failed to apply damage:", error);
      }
    } else {
      // Incorrect penalty
      setIsFlashRed(true);
      setIsBlocked(true);
      setTimeout(() => setIsFlashRed(false), 200);
      
      setTimeout(() => {
        setIsBlocked(false);
      }, 2000);
      setCurrentCardIndex(prev => (prev + 1) % cards.length);
      setTimeLeft(10);
      handleSelfDamage(10);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <h2>Loading Arena...</h2>
      </div>
    );
  }

  const currentCard = cards[currentCardIndex];
  
  if (!cards || cards.length === 0) {
    return <div className="flex h-screen items-center justify-center text-white text-2xl">Loading Arsenal...</div>;
  }

  // My HP and Enemy HP for the UI
  const myHp = role === 'challenger' ? challengerHp : opponentHp;
  const theirHp = role === 'challenger' ? opponentHp : challengerHp;
  const myHpPercent = Math.max(0, Math.min(100, myHp));
  const theirHpPercent = Math.max(0, Math.min(100, theirHp));

  return (
    <div 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        zIndex: 9999,
        backgroundColor: 'black',
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${forestBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}
    >
      {isTakingDamage && (
         <div className="absolute inset-0 z-50 pointer-events-none bg-red-600/40 mix-blend-multiply animate-pulse" />
      )}

      {/* Master Game Board Container */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-4xl px-4 text-center">

      {/* TOP BAR: HEALTH BARS */}
      {!gameOver && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', zIndex: 10, width: '100%' }}>
          
          {/* My Health */}
          <div style={{ flex: 1, marginRight: '2rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#60a5fa' }}>YOU</h3>
            <div style={{ height: '24px', background: '#1e293b', borderRadius: '12px', overflow: 'hidden', border: '2px solid #334155' }}>
              <motion.div 
                animate={{ width: `${myHpPercent}%` }}
                style={{ height: '100%', background: 'linear-gradient(90deg, #22c55e, #4ade80)' }}
              />
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.8rem', marginTop: '0.2rem', color: '#94a3b8' }}>{myHp} HP</div>
          </div>

          <div style={{ fontWeight: 'bold', fontSize: '2rem', color: '#fbbf24', textShadow: '0 0 10px rgba(251, 191, 36, 0.5)' }}>
            VS
          </div>

          {/* Enemy Health */}
          <div style={{ flex: 1, marginLeft: '2rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', textAlign: 'right', color: '#f87171' }}>ENEMY</h3>
            <div style={{ height: '24px', background: '#1e293b', borderRadius: '12px', overflow: 'hidden', border: '2px solid #334155' }}>
              <motion.div 
                animate={{ width: `${theirHpPercent}%` }}
                style={{ height: '100%', background: 'linear-gradient(90deg, #ef4444, #f87171)' }}
              />
            </div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.2rem', color: '#94a3b8' }}>{theirHp} HP</div>
          </div>
        </div>
      )}

      {/* 2. Wizards Row */}
      {!gameOver && (
        <div 
          style={{ 
            display: 'flex', 
            width: '100%', 
            justifyContent: 'space-between', 
            fontSize: '120px', /* Forces them to be giant */
            marginBottom: '30px',
            padding: '0 50px' /* Keeps them slightly off the extreme edges */
          }}
        >
          <div className="animate-pulse" style={{ filter: 'drop-shadow(0 0 20px rgba(74, 222, 128, 0.5))' }}>
            <span style={{ display: 'inline-block' }} className={isTakingDamage ? "translate-x-2 opacity-50 transition-all" : "transition-all"}>🧙‍♂️</span>
          </div>
          <div className="animate-pulse" style={{ transform: 'scaleX(-1)', filter: 'drop-shadow(0 0 20px rgba(248, 113, 113, 0.5))' }}>🧙‍♂️</div>
        </div>
      )}

      {/* 3. Question & Answers Box */}
      {!gameOver && currentCard && (
        <div className="w-full flex flex-col items-center">
          
          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '4rem 2rem',
            borderRadius: '1.5rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            maxWidth: '800px',
            width: '100%',
            textAlign: 'center',
            marginBottom: '3rem',
            position: 'relative'
          }}>
            <div style={{ position: 'absolute', top: '1rem', right: '1.5rem', fontSize: '1.5rem', fontWeight: 'bold', color: timeLeft <= 3 ? '#ef4444' : '#fbbf24' }}>
              ⏳ {timeLeft}s
            </div>
            <h2 style={{ fontSize: '2.5rem', margin: 0 }}>
              {cards.length > 0 ? (cards[currentCardIndex]?.term || cards[currentCardIndex]?.question) : 'Loading...'}
            </h2>
          </div>

          {/* BOTTOM: ANSWERS */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            width: '100%',
            maxWidth: '800px'
          }}>
            {currentCard.answers.map((ans, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(ans.isCorrect)}
                disabled={isBlocked}
                style={{
                  padding: '1.5rem',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  background: isBlocked ? 'rgba(51, 65, 85, 0.5)' : 'rgba(59, 130, 246, 0.1)',
                  border: `2px solid ${isBlocked ? 'rgba(100, 116, 139, 0.3)' : 'rgba(59, 130, 246, 0.5)'}`,
                  color: isBlocked ? '#94a3b8' : '#fff',
                  borderRadius: '1rem',
                  cursor: isBlocked ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: isBlocked ? 0.7 : 1
                }}
                onMouseOver={(e) => {
                  if (!isBlocked) {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isBlocked) {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                  }
                }}
              >
                {ans.text}
              </button>
            ))}
          </div>
        </div>
      )}
      
      </div>

      {/* GAME OVER OVERLAY */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(20px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100
            }}
          >
            {winner === role ? (
              <>
                <h1 style={{ fontSize: '5rem', color: '#4ade80', textShadow: '0 0 30px rgba(74, 222, 128, 0.5)', margin: 0 }}>VICTORY</h1>
                <p style={{ fontSize: '1.5rem', color: '#94a3b8', marginTop: '1rem' }}>You crushed your opponent!</p>
              </>
            ) : winner === 'tie' ? (
              <>
                <h1 style={{ fontSize: '5rem', color: '#fbbf24', textShadow: '0 0 30px rgba(251, 191, 36, 0.5)', margin: 0 }}>DRAW</h1>
                <p style={{ fontSize: '1.5rem', color: '#94a3b8', marginTop: '1rem' }}>It's a double KO!</p>
              </>
            ) : (
              <>
                <h1 style={{ fontSize: '5rem', color: '#f87171', textShadow: '0 0 30px rgba(248, 113, 113, 0.5)', margin: 0 }}>DEFEAT</h1>
                <p style={{ fontSize: '1.5rem', color: '#94a3b8', marginTop: '1rem' }}>Better luck next time.</p>
              </>
            )}

            {winner === role ? (
              <button
                onClick={async () => {
                  const { error } = await supabase.rpc('claim_victory_reward', { 
                    duel_target_id: id, 
                    winner_user_id: currentUser.id 
                  });
                  if (error) {
                    toast.error('Failed to claim reward: ' + error.message);
                  } else {
                    toast.success('50 Buzz claimed successfully! 🎉');
                  }
                  navigate('/dashboard');
                }}
                style={{
                  marginTop: '3rem',
                  padding: '1rem 2rem',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                  color: '#1e293b',
                  border: 'none',
                  borderRadius: '0.75rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(245, 158, 11, 0.6)'
                }}
              >
                🏆 Claim 50 Buzz & Exit
              </button>
            ) : (
              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  marginTop: '3rem',
                  padding: '1rem 2rem',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  background: 'rgba(51, 65, 85, 0.5)',
                  color: '#94a3b8',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                Retreat to Dashboard
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
