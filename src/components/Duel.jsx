import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import toast from 'react-hot-toast';
import styles from './Duel.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import GameFeelSimulator from './GameFeelSimulator (3)';

// --- VARIANTS ---
const ARENA_VARIANTS = {
  idle: { x: 0, y: 0, filter: "invert(0) hue-rotate(0deg) sepia(0)" },
  hitStop: { x: 0, y: 0, filter: "invert(1) hue-rotate(180deg)" },
  impact: { 
    x: [-10, 8, -6, 4, -2, 1, 0], 
    y: [-5, 4, -3, 2, 0],
    transition: { duration: 0.4, ease: "easeOut" }
  },
  enemyImpact: { 
    x: [-15, 12, -10, 8, -5, 3, 0],
    filter: ["sepia(1) hue-rotate(-50deg) saturate(3)", "sepia(0) hue-rotate(0deg) saturate(1)"],
    transition: { duration: 0.5, ease: "easeOut" }
  }
};
const BOSS_VARIANTS = {
  idle: { scale: 1, y: 0, filter: "brightness(1) contrast(1.2)" },
  impact: {
    scale: [1, 1.25, 0.9, 1.05, 1],
    filter: ["brightness(1)", "brightness(3) sepia(1)", "brightness(1.5)", "brightness(1)"],
    transition: { duration: 0.4, ease: "easeOut" }
  }, // ✅ Changed from }; to },
  attacking: { 
    scale: [1, 1.3, 1],
    y: [0, 150, 0], 
    transition: { duration: 0.4, ease: "anticipate" }
  } // Assuming this is the last item, no comma needed here
};

const GAME_MODES = [
  { id: 'rush', title: "Spelling Rush", icon: "⚡", desc: "A high-speed typing race." },
  { id: 'identity', title: "Blank Identity", icon: "🧠", desc: "Deduce the term and fill the blanks." },
  { id: 'gauntlet', title: "Trivia Gauntlet", icon: "🔥", desc: "Strict timer multiple-choice." }
];

export default function Duel({ fetchBuzzBalance, opponent, clearOpponent, setCurrentPage }) {
  const [activeGame, setActiveGame] = useState('menu');
  const [duelState, setDuelState] = useState('lobby'); // 'lobby', 'searching', 'active', 'finished', 'waiting_for_accept'
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [spellInput, setSpellInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(10);
  const [playerHp, setPlayerHp] = useState(3);
  const [opponentHp, setOpponentHp] = useState(3);
  const [earnedBuzz, setEarnedBuzz] = useState(0);
  const [activeDuelId, setActiveDuelId] = useState(null);
  const [isHost, setIsHost] = useState(false);

  const [selectedMode, setSelectedMode] = useState(null);
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [friendsList, setFriendsList] = useState([]);
  const [userStacks, setUserStacks] = useState([]);
  const [selectedStackId, setSelectedStackId] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [activeDuel, setActiveDuel] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const deckId = searchParams.get('deckId');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  // ⚡ THE FIX: Grab the cards passed directly from the Study Stacks page!
  const passedCards = location.state?.cards || null;
  const [arenaQuestions, setArenaQuestions] = useState(passedCards);

  useEffect(() => {
    async function fetchBossQuestions() {
      // If we already have cards passed from router state, DO NOT overwrite them!
      if (!deckId && passedCards && passedCards.length > 0) {
        return;
      }

      // If no deckId is provided, smartly fetch the user's most recent stack instead of random cards
      if (!deckId) {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Find their newest game stack
          const { data: recentStacks } = await supabase
            .from('stacks')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('mode', 'game')
            .order('created_at', { ascending: false })
            .limit(1);

          if (recentStacks && recentStacks.length > 0) {
            const recentStack = recentStacks[0];
            const { data, error } = await supabase
              .from('flashcards')
              .select('*')
              .eq('stack_id', recentStack.id);
              
            if (!error && data && data.length > 0) {
              setArenaQuestions(data);
              return;
            }
          }
        }
        
        // Ultimate fallback if they have no stacks at all
        setArenaQuestions([{ term: "EMPTY", definition: "No spelling cards found! Please create a stack first." }]);
        return; 
      }

      const { data, error } = await supabase
        .from('flashcards') // Ensure this matches the actual table name
        .select('*')
        .eq('stack_id', deckId);

      if (error) {
        console.error("Supabase Error:", error);
        return;
      }
      
      if (data && data.length > 0) {
        setArenaQuestions(data);
      } else {
        setArenaQuestions([{ term: "EMPTY", definition: "No spelling cards found in this deck!" }]);
      }
    }

    fetchBossQuestions();
  }, [deckId]); // CRITICAL: Only depend on deckId, nothing else.

  // --- ANIMATION STATE ---
  const [bossHp, setBossHp] = useState(100000);
  const [ghostHp, setGhostHp] = useState(100000);
  const [phase, setPhase] = useState('idle'); 
  const [combo, setCombo] = useState(0);
  const [sparks, setSparks] = useState([]);
  const [floatingText, setFloatingText] = useState([]);
  const [combatLog, setCombatLog] = useState(["Waiting for player to start..."]);
  const comboTimeoutRef = useRef(null);
  const processedRewardRef = useRef(false);

  useEffect(() => {
    if (duelState === 'finished' && !processedRewardRef.current) {
      processedRewardRef.current = true;
      const grantReward = async () => {
         if (earnedBuzz > 0) {
            await supabase.rpc('process_buzz_transaction', { amount_to_add: earnedBuzz, transaction_reason: 'Solo Boss Battle' });
            if (fetchBuzzBalance) fetchBuzzBalance();

            const currentTotal = parseInt(localStorage.getItem('demoTotalBuzz') || '0');
            localStorage.setItem('demoTotalBuzz', currentTotal + earnedBuzz);
         }
      };
      grantReward();
    }
  }, [duelState, earnedBuzz, fetchBuzzBalance]);

  const addLog = useCallback((msg) => {
    setCombatLog((prev) => [msg, ...prev].slice(0, 5));
  }, []);

  const generateSparks = useCallback(() => {
    return Array.from({ length: 20 }).map((_, i) => {
      const angle = (i / 20) * Math.PI * 2;
      const speed = 100 + Math.random() * 120;
      return {
        id: Date.now() + i,
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
        size: 3 + Math.random() * 6,
        isLeaf: Math.random() > 0.5 
      };
    });
  }, []);

  useEffect(() => {
    let channel;
    const watchDuel = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('active_duels_updates')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen for EVERYTHING (INSERT & UPDATE)
            schema: 'public',
            table: 'active_duels',
          },
          (payload) => {
            // Handle new Invites (INSERT)
            if (payload.eventType === 'INSERT' && payload.new.opponent_id === user.id) {
               setActiveDuel(payload.new);
               setDuelState('waiting_for_accept');
            }

            // Sync States (UPDATE)
            if (payload.eventType === 'UPDATE') {
              if (payload.new.status === 'active') {
                if (payload.new.challenger_id === user.id || payload.new.opponent_id === user.id) {
                    navigate(`/duel/${payload.new.id}`);
                }
              }
              // Only care about this duel
              if (activeDuelId && payload.new.id !== activeDuelId) return;

              if (payload.new.status === 'active') {
                setActiveDuelId(payload.new.id);
                setDuelState('active');
              }
              
              // Set HP
              const hostHp = payload.new.challenger_hp;
              const oppHp = payload.new.opponent_hp;
              
              setPlayerHp(prev => {
                 const newMyHp = isHost ? hostHp : oppHp;
                 if (newMyHp < prev) addLog("💔 You lost a heart!");
                 return newMyHp;
              });

              setOpponentHp(prev => {
                 const newOppHp = isHost ? oppHp : hostHp;
                 if (newOppHp < prev) addLog(`⚔️ Opponent lost a heart!`);
                 return newOppHp;
              });

              // Check for Impact Animation (if someone else hit the boss)
              setBossHp(prevBossHp => {
                if (payload.new.boss_hp !== undefined && payload.new.boss_hp < prevBossHp) {
                  setPhase(prevPhase => {
                     if (prevPhase === 'idle') {
                        setTimeout(() => setPhase('idle'), 400);
                        return 'impact';
                     }
                     return prevPhase;
                  });
                }
                return payload.new.boss_hp !== undefined ? payload.new.boss_hp : prevBossHp;
              });

              // Sync ghost HP
              if (payload.new.boss_hp !== undefined) {
                 setTimeout(() => setGhostHp(payload.new.boss_hp), 500);
              }

              // Check Knockout / Game Over from database status
              if (payload.new.status === 'finished') {
                setDuelState('finished');
              }
              
              // Sync question progression from DB source-of-truth
              if (payload.new.current_question_index !== undefined) {
                 setCurrentQuestionIndex(payload.new.current_question_index);
                 setTimeLeft(10); // Reset UI timer
              }
            }
          }
        )
        .subscribe();
    };

    // Make sure we always watch for incoming duels and updates
    watchDuel();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [activeDuelId, setCurrentPage, fetchBuzzBalance, duelState, isHost, addLog]);

  // Prevent receiver getting stuck in 'lobby' -> 'waiting' typo loop
  useEffect(() => {
    const checkExistingDuel = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.id || !opponent || !opponent.id) return;
      const { data } = await supabase.from('active_duels').select('*')
        .eq('status', 'active')
        .or(`and(challenger_id.eq.${user.id},opponent_id.eq.${opponent?.id}),and(challenger_id.eq.${opponent?.id},opponent_id.eq.${user.id})`)
        .single();
      
      if (data) {
        setActiveDuelId(data.id);
        if (data.challenger_id === user.id) setIsHost(true);
        setDuelState('active'); // Auto-jump the receiver straight into the live Arena!
      }
    };

    if (opponent && duelState === 'lobby') {
      checkExistingDuel();
    }
  }, [opponent, duelState]);

  useEffect(() => {
    if (duelState === 'active') {
      const initActive = async () => {
        if (!activeDuelId) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data } = await supabase.from('active_duels').select('*')
              .eq('status', 'active')
              .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
              .single();
            if (data) {
              setActiveDuelId(data.id);
              if (data.challenger_id === user.id) {
                setIsHost(true);
              }
            }
          }
        } else {
          // Check host status if we already had the ID
          const { data: { user } } = await supabase.auth.getUser();
          const { data } = await supabase.from('active_duels').select('challenger_id').eq('id', activeDuelId).single();
          if (data && user && data.challenger_id === user.id) {
             setIsHost(true);
          }
        }
        fetchQuestions();
      };
      initActive();
    }
  }, [duelState, activeDuelId]);

  useEffect(() => {
    // The Knockout: Watch HP to trigger end-game
    if (duelState === 'active' && activeDuelId) {
      if (playerHp <= 0 || opponentHp <= 0) {
        setDuelState('finished');
        if (isHost) {
          resolveKnockout();
        }
      }
    }
  }, [playerHp, opponentHp, duelState, activeDuelId, isHost]);

  useEffect(() => {
    let timerId;
    if (duelState === 'active' && questions.length > 0) {
      if (timeLeft > 0) {
        timerId = setTimeout(() => {
          setTimeLeft(prev => prev - 1);
        }, 1000);
      } else {
        // ONLY the host triggers the timeout state update to avoid race conditions
        if (isHost) {
          handleTimeout();
        }
      }
    }
    return () => clearTimeout(timerId);
  }, [timeLeft, duelState, questions, isHost]);

  const fetchQuestions = async () => {
    // 1. Fetch random rows from flashcards (fetching a batch to allow grabbing wrong answers)
    const { data, error } = await supabase.from('flashcards').select('*').limit(30);
    
    if (error || !data || data.length < 4) {
      toast.error('Not enough flashcards to start duel!');
      setDuelState('lobby');
      return;
    }

    // Shuffle fetched data
    const shuffledData = data.sort(() => 0.5 - Math.random());
    // Select first 5 for the questions
    const selectedQuestions = shuffledData.slice(0, 5);

    // Build question objects with 1 correct and 3 incorrect answers
    const formattedQuestions = selectedQuestions.map((q) => {
      const otherCards = shuffledData.filter((card) => card.id !== q.id);
      const wrongAnswers = otherCards.sort(() => 0.5 - Math.random()).slice(0, 3).map((w) => ({
        text: w.definition,
        isCorrect: false
      }));

      const allAnswers = [
        { text: q.definition, isCorrect: true },
        ...wrongAnswers
      ].sort(() => 0.5 - Math.random());

      return {
        ...q,
        answers: allAnswers
      };
    });

    setQuestions(formattedQuestions);
    setCurrentQuestionIndex(0);
    setTimeLeft(10);
  };

  const handleTimeout = () => {
    toast.error('Time is up!');
    moveToNextQuestion();
  };

  const handleAnswer = async (isCorrect, damageParam = 0) => {
    if (isCorrect) {
      toast.success('Correct!');
      const newBossHp = Math.max(0, bossHp - damageParam);
      setBossHp(newBossHp);
      
      if (activeDuelId) {
        const newOpponentHp = Math.max(0, opponentHp - 1);
        const updates = { boss_hp: newBossHp };
        if (isHost) updates.opponent_hp = newOpponentHp;
        else updates.challenger_hp = newOpponentHp;
        await supabase.from('active_duels').update(updates).eq('id', activeDuelId);
      }
    } else {
      toast.error('Incorrect!');
      const newPlayerHp = Math.max(0, playerHp - 1);
      setPlayerHp(newPlayerHp);
      
      if (activeDuelId) {
        const updates = {};
        if (isHost) updates.challenger_hp = newPlayerHp;
        else updates.opponent_hp = newPlayerHp;
        await supabase.from('active_duels').update(updates).eq('id', activeDuelId);
      }
    }
    
    // Only host moves to next question in multiplayer DB
    if (isHost && activeDuelId) {
      moveToNextQuestion();
    }
  };

  const moveToNextQuestion = async () => {
    if (isHost && activeDuelId) {
      const nextIdx = currentQuestionIndex + 1;
      await supabase.from('active_duels').update({ current_question_index: nextIdx }).eq('id', activeDuelId);
    }
  };

  const resolveKnockout = async () => {
    if (isHost && activeDuelId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
         // Determine winner based on who has HP left
         const winnerId = playerHp > opponentHp ? user.id : opponent?.id;
         const { error } = await supabase.rpc('resolve_duel', { target_duel_id: activeDuelId, winner_id: winnerId });
         if (!error) {
            toast.success("Duel Complete! +100 Buzz 🎉");
            fetchBuzzBalance();
         } else {
            toast.error("Reward error: " + error.message);
         }
      }
    }
  };

  const submitAnswer = (isCorrect) => {
    if (phase !== 'idle' || duelState !== 'active') return;

    const currentList = (arenaQuestions && arenaQuestions.length > 0) ? arenaQuestions : questions;

    if (isCorrect) {
      setEarnedBuzz(prev => prev + 10);
      const currentCombo = combo + 1;
      setCombo(currentCombo);
      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
      comboTimeoutRef.current = setTimeout(() => setCombo(0), 3000);

      setPhase('casting');
      addLog(`✅ Correct! Arch-Druid attacks!`);
      setTimeout(() => setPhase('traveling'), 600);
    } else {
      setPhase('enemyAttacking');
      addLog(`❌ Incorrect! Troll attacks!`);
      
      setTimeout(() => {
        handleAnswer(false);
        setPhase('idle');
      }, 500); 
    }

    if (currentQuestionIndex + 1 < currentList.length) {
      setCurrentQuestionIndex(prev => prev + 1);
      setTimeLeft(10);
    } else {
      setTimeout(() => {
        setDuelState('finished');
        if (isHost && activeDuelId) {
          resolveKnockout();
        }
      }, 1500);
    }
  };

  const onImpact = () => {
    setPhase('hitStop');
    
    setTimeout(() => {
      setPhase('impact');
      
      const damage = Math.floor(20000 * (1 + (combo * 0.2))); 
      
      setSparks(generateSparks());
      setFloatingText([{ id: Date.now(), text: `+${damage.toLocaleString()} Pts!`, isCrit: combo > 1 }]);

      setTimeout(() => {
        handleAnswer(true, damage);
        setPhase('idle');
        setSparks([]);
        setFloatingText([]);
      }, 700);

    }, 80);
  };

  const fetchFriends = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: friendships, error } = await supabase
        .from('friendships')
        .select('id, requester_id, receiver_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

      console.log("Fetched Friends:", friendships, "Error:", error);

      if (error) throw error;
      
      if (friendships && friendships.length > 0) {
        const friendIds = friendships.map(f => f.requester_id === user.id ? f.receiver_id : f.requester_id).filter(Boolean);
        const { data: profiles, error: profError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', friendIds);
          
        if (profError) throw profError;
        setFriendsList(profiles || []);
      } else {
        setFriendsList([]);
      }

      const { data: stacks, error: stacksError } = await supabase
        .from('stacks')
        .select('id, title')
        .eq('user_id', user.id);
        
      if (stacksError) throw stacksError;
      setUserStacks(stacks || []);
    } catch (err) {
      toast.error('Failed to load friends: ' + err.message);
    }
  };

  const startMatchmaking = () => {
    setShowFriendModal(true);
    fetchFriends();
  };

  const handleSendInvite = async (targetFriendId) => {
    const currentTier = localStorage.getItem('demo_sub_tier') || '99';
    const limit = currentTier === '599' ? Infinity : currentTier === '299' ? 35 : 5;
    
    const today = new Date().toDateString();
    const lastDate = localStorage.getItem('last_duel_date');
    
    if (today !== lastDate) localStorage.setItem('duels_played_today', '0');
    
    const count = parseInt(localStorage.getItem('duels_played_today') || '0');
    if (count >= limit) {
      toast.error('Daily limit reached! Upgrade your tier in Settings to play more.');
      return;
    }
    
    localStorage.setItem('duels_played_today', (count + 1).toString());
    localStorage.setItem('last_duel_date', today);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('active_duels')
      .insert([
        { 
          challenger_id: user.id, 
          opponent_id: targetFriendId,
          stack_id: selectedStackId,
          status: 'pending' 
        }
      ]).select();

    if (!error && data && data.length > 0) {
      setActiveDuel(data[0]);
      setShowFriendModal(false);
      setDuelState('waiting_for_accept');
      toast.success("Challenge Sent! Waiting for opponent...");
    } else {
      toast.error('Matchmaking failed: ' + (error?.message || 'Unknown error'));
    }
  };

  const handleAcceptDuel = async () => {
    if (!activeDuel) return;
    const { error } = await supabase
      .from('active_duels')
      .update({ status: 'active' })
      .eq('id', activeDuel.id);
      
    if (error) {
      toast.error("Failed to accept: " + error.message);
    }
  };

  const sendChallenge = async () => {
    if (!opponent) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('active_duels')
      .insert([
        { 
          challenger_id: user.id, 
          opponent_id: opponent?.id,
          stack_id: deckId,
          status: 'pending' 
        }
      ])
      .select();

    if (!error) {
      toast.success("Challenge Sent! Waiting for opponent...");
      setDuelState('waiting_for_accept');
    } else {
      toast.error('Failed to send challenge: ' + error.message);
    }
  };

  const currentQuestion = (arenaQuestions && arenaQuestions.length > 0) 
    ? arenaQuestions[currentQuestionIndex] 
    : questions[currentQuestionIndex];

  const multipleChoiceAnswers = React.useMemo(() => {
    if (!currentQuestion) return [];
    if (currentQuestion.answers) return currentQuestion.answers; // Pre-formatted

    // Grab the correct answer text
    const correctText = currentQuestion.definition || currentQuestion.answer || currentQuestion.back_text || 'Correct';
    const answers = [{ text: correctText, isCorrect: true }];

    // Use explicit wrong answers if they exist
    if (currentQuestion.wrong_1) answers.push({ text: currentQuestion.wrong_1, isCorrect: false });
    if (currentQuestion.wrong_2) answers.push({ text: currentQuestion.wrong_2, isCorrect: false });
    if (currentQuestion.wrong_3) answers.push({ text: currentQuestion.wrong_3, isCorrect: false });

    // If we don't have 4 choices yet, steal random terms from the rest of the deck!
    const pool = (arenaQuestions && arenaQuestions.length > 0) ? arenaQuestions : questions;
    const otherCards = pool.filter(c => c.id !== currentQuestion.id).sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < otherCards.length && answers.length < 4; i++) {
      const wrongTxt = otherCards[i].definition || otherCards[i].answer || otherCards[i].back_text;
      if (wrongTxt && wrongTxt !== correctText) {
        answers.push({ text: wrongTxt, isCorrect: false });
      }
    }

    return answers.sort(() => Math.random() - 0.5); // Shuffle them
  }, [currentQuestion, arenaQuestions, questions]);

  const handleSpellSubmit = (e) => {
    e.preventDefault();
    if (phase !== 'idle' || duelState !== 'active') return;
    const correctAns = (currentQuestion.definition || currentQuestion.text || currentQuestion.answer || '').toLowerCase().trim();
    const isCorrect = spellInput.toLowerCase().trim() === correctAns;
    submitAnswer(isCorrect);
    setSpellInput('');
  };

  if (activeGame === 'spelling') {
    if (!arenaQuestions || arenaQuestions.length === 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#0f172a', color: '#fbbf24', fontFamily: "'Poppins', sans-serif" }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'bounce 2s infinite' }}>🧙‍♂️</div>
          <h1 style={{ fontSize: '2rem', animation: 'pulse 2s infinite' }}>Summoning Boss...</h1>
        </div>
      );
    }

    // ⚡ THE FIX: Forcibly remove multiple-choice cards in JavaScript
    const validSpellingCards = arenaQuestions.filter(card => {
      const type = String(card?.type || card?.format || '').toLowerCase();
      const hasWrongAnswers = card?.wrong_1 || card?.wrong_2 || card?.wrong_3;
      return type !== 'multiple-choice' && type !== 'multiplechoice' && !hasWrongAnswers;
    });

    if (validSpellingCards.length === 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#0f172a', color: '#fbbf24', fontFamily: "'Poppins', sans-serif" }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📭</div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>No spelling cards found!</h2>
          <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>This stack only has multiple-choice questions.</p>
          <button 
            onClick={() => setActiveGame('menu')}
            style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
          >
            &larr; Back to Lobby
          </button>
        </div>
      );
    }

    // 2. Format the data EXACTLY how GameFeelSimulator expects it: { question, answer }
    const dynamicSpellingData = validSpellingCards.map((item, index) => {
      const qText = item?.definition || item?.question || item?.meaning || item?.back || 'No hint provided.';
      
      // Safely grab the Word/Term
      const aText = item?.term || item?.answer || item?.word || item?.front || `WORD${index}`;
      
      return { 
        question: String(qText), 
        answer: String(aText).toUpperCase() 
      };
    });

    // 3. Pass the clean data into your game
    return <GameFeelSimulator questions={dynamicSpellingData} onBattleEnd={() => setActiveGame('menu')} />;
  }
  if (activeGame === 'menu') {
    return (
      <div className={styles.lobbyContainer}>
        <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 100 }}>
          <button 
            onClick={() => {
              if (setCurrentPage) setCurrentPage('home');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              padding: '10px 0'
            }}
          >
            <span>&larr;</span> Back to Dashboard
          </button>
        </div>
        <h1 className={styles.lobbyTitle}>Select Game Mode</h1>
        <div className={styles.modeGrid} style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginTop: '2rem' }}>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={styles.modeCard}
            onClick={() => setActiveGame('troll')}
            style={{ cursor: 'pointer', border: '1px solid #4f46e5', background: 'rgba(30, 41, 59, 0.7)' }}
          >
            <div className={styles.modeIcon}>🧌</div>
            <h3 className={styles.modeTitle}>Ancient Troll Battle</h3>
            <p className={styles.modeDesc}>Multiplayer identification boss battle with live health tracking.</p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={styles.modeCard}
            onClick={() => setActiveGame('spelling')}
            style={{ cursor: 'pointer', border: '1px solid #f59e0b', background: 'rgba(30, 41, 59, 0.7)' }}
          >
            <div className={styles.modeIcon}>🐝</div>
            <h3 className={styles.modeTitle}>Spelling Rush Arena</h3>
            <p className={styles.modeDesc}>High-speed typing race against the Giant Bee.</p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (activeGame === 'troll') {
    return (
      <div className={styles.container}>
        <button 
          onClick={() => setActiveGame('menu')}
          style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 50, padding: '8px 16px', background: 'rgba(15, 23, 42, 0.8)', color: '#fff', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer', fontFamily: 'monospace' }}
        >
          ← Back to Menu
        </button>
      <motion.div 
        variants={ARENA_VARIANTS}
        animate={phase === 'hitStop' ? 'hitStop' : phase === 'impact' ? 'impact' : phase === 'enemyAttacking' ? 'enemyImpact' : 'idle'}
        className={styles.arena}
      >
        <AnimatePresence>
          {duelState !== 'active' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={styles.overlay}
            >
              <div className={styles.popup}>
                
                {showFriendModal && (
                  <>
                    <h2 className={styles.title} style={{ color: '#fbbf24', marginBottom: '1rem' }}>Select Opponent</h2>
                    
                    <div style={{ width: '100%', marginBottom: '1rem', textAlign: 'left' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1', fontWeight: 'bold' }}>Choose Your Weapon (Stack):</label>
                      <select 
                        value={selectedStackId}
                        onChange={(e) => setSelectedStackId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          backgroundColor: 'rgba(15, 23, 42, 0.8)',
                          color: '#fff',
                          outline: 'none',
                          fontSize: '1rem',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">-- Select a Stack --</option>
                        {userStacks.map(stack => (
                          <option key={stack.id} value={stack.id}>{stack.title}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginBottom: '1rem' }}>
                      {friendsList.length === 0 ? (
                        <div className="text-center text-gray-400 my-4" style={{ textAlign: 'center', color: '#9ca3af', margin: '1rem 0' }}>
                          No accepted friends found. Go to the Friends tab to add some!
                        </div>
                      ) : (
                        friendsList.map(friend => (
                          <div key={friend.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(30, 41, 59, 0.8)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <img src={friend.avatar_url || `https://api.dicebear.com/6.x/avataaars/svg?seed=${friend.username}`} alt={friend.username} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                              <span style={{ fontWeight: 'bold' }}>{friend.username}</span>
                            </div>
                            <button 
                              onClick={() => handleSendInvite(friend.id)}
                              disabled={!selectedStackId}
                              style={{ 
                                padding: '6px 12px', 
                                background: selectedStackId ? '#3b82f6' : '#475569', 
                                color: selectedStackId ? '#fff' : '#94a3b8', 
                                border: 'none', 
                                borderRadius: '6px', 
                                cursor: selectedStackId ? 'pointer' : 'not-allowed', 
                                fontWeight: 'bold',
                                opacity: selectedStackId ? 1 : 0.5
                              }}
                            >
                              Send Invite ⚔️
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                    <button 
                      onClick={() => setShowFriendModal(false)}
                      style={{ padding: '10px 20px', background: 'transparent', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', cursor: 'pointer', width: '100%' }}
                    >
                      Close
                    </button>
                  </>
                )}

                {!showFriendModal && duelState === 'lobby' && (
                  <>
                    <div className={styles.emoji6xl}>🌲</div>
                    <h2 className={styles.title}>Deep Forest Arena</h2>
                    <p className={styles.description}>
                      {!opponent ? 'Prepare yourself for the encounter!' : 'The Ancient Troll guards the path. Answer correctly before the timer runs out. You have 3 lives.'}
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={styles.startButton} 
                        style={{ flex: 1, backgroundColor: '#0ea5e9', borderBottomColor: '#0369a1' }}
                        onClick={() => { setIsHost(true); setDuelState('active'); }}
                      >
                        👤 PLAY SOLO
                      </motion.button>

                      {opponent ? (
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={styles.startButton} 
                          style={{ flex: 1, backgroundColor: '#e11d48', borderBottomColor: '#9f1239' }}
                          onClick={sendChallenge}
                        >
                          ⚔️ CHALLENGE {opponent?.name?.toUpperCase() || 'OPPONENT'}
                        </motion.button>
                      ) : (
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={styles.startButton} 
                          style={{ flex: 1, backgroundColor: '#e11d48', borderBottomColor: '#9f1239' }}
                          onClick={startMatchmaking}
                        >
                          ⚔️ FIND OPPONENT
                        </motion.button>
                      )}
                    </div>
                  </>
                )}

                {!showFriendModal && duelState === 'searching' && (
                  <>
                    <div className={styles.emoji6xl} style={{ animation: 'pulse 2s infinite' }}>🔍</div>
                    <h2 className={styles.title} style={{ color: '#fbbf24' }}>Loading Boss Battle...</h2>
                    <p className={styles.description}>Prepare your spells and focus your mind.</p>
                  </>
                )}

                {!showFriendModal && duelState === 'waiting_for_accept' && (
                  <>
                    {activeDuel?.challenger_id === currentUserId ? (
                      <>
                        <div className={styles.emoji6xl} style={{ animation: 'pulse 2s infinite' }}>⏳</div>
                        <h2 className={styles.title} style={{ color: '#fbbf24' }}>Challenge Sent!</h2>
                        <p className={styles.description}>Waiting for Opponent to accept...</p>
                      </>
                    ) : activeDuel?.opponent_id === currentUserId ? (
                      <>
                        <div className={styles.emoji6xl} style={{ animation: 'pulse 2s infinite' }}>⚔️</div>
                        <h2 className={styles.title} style={{ color: '#fbbf24' }}>INCOMING DUEL ⚔️</h2>
                        <p className={styles.description}>You have been challenged to a duel!</p>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', width: '100%' }}>
                          <button 
                            onClick={handleAcceptDuel}
                            style={{ flex: 1, padding: '10px', background: '#22c55e', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            Accept
                          </button>
                          <button 
                            onClick={() => { setDuelState('lobby'); setActiveDuel(null); }}
                            style={{ flex: 1, padding: '10px', background: '#ef4444', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            Decline
                          </button>
                        </div>
                      </>
                    ) : (
                       <p>Loading Duel State...</p>
                    )}
                  </>
                )}

                {!showFriendModal && duelState === 'finished' && (
                  <>
                    <h2 className={`${styles.title} ${playerHp > opponentHp ? styles.textEmerald : playerHp < opponentHp ? styles.textRed : styles.textIndigo}`} style={{ fontStyle: 'italic' }}>
                      {playerHp > 0 ? 'VICTORY!' : 'DEFEATED!'}
                    </h2>
                    <p className={styles.description}>
                      Final Status:<br/>
                      <strong style={{color: '#34d399'}}>You: {playerHp > 0 ? `${playerHp} HP` : 'K.O.'}</strong>
                    </p>
                    {earnedBuzz > 0 && (
                      <div className="text-2xl text-yellow-500 font-bold mb-4" style={{ fontSize: '1.5rem', color: '#eab308', fontWeight: 'bold', marginBottom: '1rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                        🎉 Rewards Earned: {earnedBuzz} Buzz! 🧁
                      </div>
                    )}
                    <button 
                      onClick={() => {
                        if (clearOpponent) clearOpponent();
                        if (setCurrentPage) setCurrentPage('home');
                      }}
                      className={styles.playAgainBtn}
                    >
                      CLAIM & RETURN
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {duelState === 'active' && (
          <>
            {/* HEADER STATS */}
            <div className={styles.headerStats}>
          <div className={styles.statsLeft}>
             <div className={styles.statBlockTarget}>
                <p className={styles.statLabel}>Target</p>
                <p className={styles.statValueAmber}>ANCIENT TROLL</p>
             </div>
             <div className={styles.statBlockLives}>
                <p className={styles.statLabel}>Player Lives</p>
                <div className={styles.hearts}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <span key={i} className={i < playerHp ? styles.heartActive : styles.heartInactive}>❤️</span>
                  ))}
                </div>
             </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className={styles.essenceRemaining}>Essence Remaining</p>
            <p className={styles.essenceValue}>
               {bossHp.toLocaleString()}
            </p>
            <div style={{ display: 'flex', gap: '10px', fontSize: '12px', justifyContent: 'flex-end', marginTop: '5px' }}>
              <span style={{ color: '#34d399', fontWeight: 'bold' }}>You: {playerHp} HP</span>
              <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{opponent?.name || 'Opp'}: {opponentHp} HP</span>
            </div>
          </div>
        </div>

        {/* COMBAT ARENA */}
        <div className={styles.combatArena}>
          
          <AnimatePresence>
            {combo > 1 && (
              <motion.div
                initial={{ opacity: 0, x: -50, scale: 0.5 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={styles.comboPopup}
              >
                <span className={styles.comboText}>{combo}x</span>
                <span className={styles.comboLabel}>Combo!</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* BOSS SECTION */}
          <div className={styles.bossSection}>
            
            <div className={styles.hpBarBg}>
               <motion.div 
                animate={{ width: `${(ghostHp/100000)*100}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className={styles.hpBarGhost} 
               />
               <motion.div 
                animate={{ width: `${(bossHp/100000)*100}%` }}
                transition={{ duration: 0.1 }}
                className={styles.hpBarFill} 
               />
            </div>
            
            <motion.div 
               variants={BOSS_VARIANTS}
               animate={phase === 'hitStop' ? 'idle' : phase === 'impact' ? 'impact' : phase === 'enemyAttacking' ? 'attacking' : 'idle'}
               className={styles.bossEmoji}
            >
              🧌
            </motion.div>

            <AnimatePresence>
              {floatingText.map(ft => (
                <motion.div
                  key={ft.id}
                  initial={{ opacity: 0, y: 0, scale: 0.5 }}
                  animate={{ opacity: 1, y: -120, scale: ft.isCrit ? 1.8 : 1.2 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={styles.floatingText}
                >
                  {ft.text}
                </motion.div>
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {phase === 'impact' && (
                <motion.div 
                  initial={{ opacity: 0, scaleY: 0, scaleX: 0 }} 
                  animate={{ opacity: 1, scaleY: 1, scaleX: 1 }} 
                  exit={{ opacity: 0 }}
                  className={styles.impactBeam}
                >
                  <div className={styles.impactBeamGradient} />
                </motion.div>
              )}
            </AnimatePresence>

            {sparks.map(s => (
              <motion.div
                key={s.id}
                initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                animate={{ x: s.x, y: s.y, opacity: 0, rotate: s.isLeaf ? 180 : 0 }}
                transition={{ duration: 0.5 + Math.random() * 0.3, ease: "easeOut" }}
                className={`${styles.spark} ${s.isLeaf ? styles.sparkLeaf : styles.sparkDot}`}
                style={{ width: s.size, height: s.isLeaf ? s.size * 1.5 : s.size }}
              />
            ))}
          </div>

          <AnimatePresence>
            {phase === 'traveling' && (
              <motion.div
                initial={{ x: 0, y: 350, scale: 0.5, opacity: 0 }}
                animate={{ x: 0, y: -200, scale: 1.5, opacity: 1 }}
                onAnimationComplete={onImpact}
                transition={{ duration: 0.5, ease: [0.175, 0.885, 0.32, 1.275] }}
                className={styles.travelingProjectile}
              >
                <div className={styles.projectileOrb} />
              </motion.div>
            )}
          </AnimatePresence>

          <div className={styles.playerSection}>
             <motion.div
               animate={
                 phase === 'casting' ? { y: [-3, 3, -3], filter: "drop-shadow(0 0 20px #10b981)" } 
                 : phase === 'enemyAttacking' ? { opacity: [1, 0.5, 1], filter: "brightness(0.5) sepia(1) hue-rotate(-50deg) saturate(3)" }
                 : { filter: "drop-shadow(0 10px 10px rgba(0,0,0,0.5))" }
               }
               transition={{ duration: 0.15 }}
               className={styles.playerEmoji}
             >
               🧙‍♂️
             </motion.div>
          </div>
        </div>

        {/* BOTTOM DASHBOARD - QUIZ UI */}
        <div className={styles.bottomDash}>
          
          <div className={styles.combatLogBox}>
             {combatLog.map((log, i) => (
               <p key={i} className={`${styles.logEntry} ${i === 0 ? styles.logEntryNew : styles.logEntryOld}`}>
                 <span className={styles.logArrow}>▶</span>{log}
               </p>
             ))}
          </div>

          <div className={styles.quizContainer}>
            {duelState === 'active' && currentQuestion ? (
              <>
                <div className={styles.quizHeader}>
                  <span className={styles.questionCount}>Question {currentQuestionIndex + 1}</span>
                  <span className={`${styles.timer} ${timeLeft <= 3 ? styles.timerBad : styles.timerGood}`}>
                    ⏳ {timeLeft}s
                  </span>
                </div>
                
                <p className={styles.questionText}>
                  {currentQuestion?.term || currentQuestion?.question || currentQuestion?.front_text}
                </p>

                {/* ⚡ CRITICAL: Troll is ALWAYS Multiple Choice */}
                <div className={styles.answersGrid}>
                  {multipleChoiceAnswers.map((answer, i) => (
                    <button
                      key={i}
                      onClick={() => submitAnswer(answer.isCorrect)}
                      disabled={phase !== 'idle'}
                      className={styles.answerBtnGeneral}
                    >
                      {answer.text}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                <p>Awaiting game start...</p>
              </div>
            )}
          </div>
        </div>
        </>
        )}
      </motion.div>
    </div>
    );
  }

  return null;
}
