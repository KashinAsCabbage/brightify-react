import React, { useState, useEffect } from 'react';
import styles from '../dashboard.module.css';
import supabase from '../supabaseClient';
import toast from 'react-hot-toast';
import Shop from './Shop';
import Duel from './Duel';
import ThroneDrops from './ThroneDrops';
import Calendar from './Calendar';
import Achievements from './Achievements';
import useStudyTimer from '../hooks/useStudyTimer';
import EmojiPicker from 'emoji-picker-react';
import ChatBox from './ChatBox';

const curatedNews = [
  {
    title: "The Pomodoro Technique: Mastering Time Management for Midterms",
    description: "Struggling to focus? Learn how 25-minute study intervals can drastically improve your memory retention.",
    url: "https://www.edutopia.org/article/pomodoro-technique-for-students"
  },
  {
    title: "Cultural Intelligence in Tourism: Welcoming Global Guests",
    description: "Essential reading for Tourism majors on how to adapt to international customs and improve guest satisfaction.",
    url: "https://www.tourism-review.com/cultural-intelligence-hospitality"
  },
  {
    title: "Safety First: The Evolution of Pre-Flight Inspection Protocols",
    description: "A deep dive for Aircraft Maintenance students on the modern safety checklists that keep the aviation industry secure.",
    url: "https://aviationweek.com/maintenance/modern-pre-flight-protocols"
  },
  {
    title: "Budgeting 101: Making Your Allowance Last the Whole Semester",
    description: "Practical financial advice for college students navigating inflation, transportation costs, and daily meals.",
    url: "https://www.nerdwallet.com/article/finance/college-student-budgeting"
  },
  {
    title: "Overcoming Academic Burnout: Strategies for Senior High Students",
    description: "Feeling exhausted? Discover healthy ways to manage your academic workload and protect your mental health.",
    url: "https://www.psychologytoday.com/us/blog/academic-burnout-prevention"
  },
  {
    title: "The Art of Persuasion: Structuring Arguments for Competitive Debate",
    description: "Master the 3rd speaker role: How to effectively weigh arguments and win the practicability clash.",
    url: "https://www.speechanddebate.org/structuring-effective-rebuttals"
  },
  {
    title: "Crafting the Perfect Resume for Hospitality Internships",
    description: "Stand out to top hotels and resorts with these actionable resume and interview tips for HM students.",
    url: "https://www.hospitalitynet.org/career/resume-tips-for-students.html"
  },
  {
    title: "Surviving Group Work: How to Lead Without Doing Everything",
    description: "A practical guide to delegating tasks, managing group chats, and ensuring your final thesis gets done on time.",
    url: "https://hbr.org/2023/student-group-work-leadership"
  },
  {
    title: "From SHS to College: Navigating the Freshman Transition",
    description: "What to expect in your first year of college, from finding your classes to managing a completely new schedule.",
    url: "https://www.collegexpress.com/articles/freshman-transition-guide"
  }
];

export default function MainContent({ currentPage, setCurrentPage, searchQuery = '' }) {
  const { formattedHours } = useStudyTimer(14400); // 4.0 hours
  const [isWatering, setIsWatering] = useState(false);
  const [gardenData, setGardenData] = useState({ seed: null, xp: 0, lastWatered: null });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeOpponent, setActiveOpponent] = useState(null);
  const [friendsList, setFriendsList] = useState([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isLoadingPending, setIsLoadingPending] = useState(true);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [activeFriendsTab, setActiveFriendsTab] = useState('all');
  const [activeChatFriend, setActiveChatFriend] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    fetchUser();
  }, []);

  const [topUsers, setTopUsers] = useState([]);
  const [pomoTimeLeft, setPomoTimeLeft] = useState(25 * 60);
  const [isPomoActive, setIsPomoActive] = useState(false);
  const [pomoMode, setPomoMode] = useState('focus');
  const [pomoMinutesStudied, setPomoMinutesStudied] = useState(0);

  const [weeklyData, setWeeklyData] = useState([]);
  const [heatmapData, setHeatmapData] = useState({});
  const userStats = { buzz: 0, streak: 0 };

  const monthlyGoalHours = 100;
  const goalProgress = Math.min(((userStats.studyHours || 0) / monthlyGoalHours) * 100, 100);
  const [activeStackFilter, setActiveStackFilter] = useState('All');

  const calculateLevel = (xp) => {
    if (!xp) return 1;
    return Math.floor(xp / 1000) + 1;
  };

  const getPomoTotalSeconds = () => {
    if (pomoMode === 'focus') return 25 * 60;
    if (pomoMode === 'short') return 5 * 60;
    if (pomoMode === 'long') return 15 * 60;
    return 25 * 60;
  };

  const handlePomoMode = (mode) => {
    setPomoMode(mode);
    setIsPomoActive(false);
    if (mode === 'focus') setPomoTimeLeft(25 * 60);
    if (mode === 'short') setPomoTimeLeft(5 * 60);
    if (mode === 'long') setPomoTimeLeft(15 * 60);
  };

  const resetPomodoro = () => {
    setIsPomoActive(false);
    setPomoTimeLeft(getPomoTotalSeconds());
  };

  const handleStopAndSaveTimer = async () => {
    const totalSeconds = getPomoTotalSeconds();
    const elapsedSeconds = totalSeconds - pomoTimeLeft;
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);

    if (elapsedMinutes > 0) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.rpc('record_study_session', { p_user_id: user.id, p_session_minutes: elapsedMinutes, p_cards_studied: 0, p_cards_correct: 0 });
        toast.success(`Session saved! +${elapsedMinutes} minutes added to your stats.`);
        setPomoMinutesStudied(prev => prev + elapsedMinutes);
        fetchBuzzBalance(); // Refresh equivalent for now
      }
    } else {
        toast.error("Timer wasn't running long enough to save.");
    }
    resetPomodoro();
  };

  useEffect(() => {
    let interval = null;
    if (isPomoActive && pomoTimeLeft > 0) {
      interval = setInterval(() => {
        setPomoTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isPomoActive && pomoTimeLeft === 0) {
      setIsPomoActive(false);
      toast.success('Time is up!');
      handleStopAndSaveTimer();
    }
    return () => clearInterval(interval);
  }, [isPomoActive, pomoTimeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleDuelFriend = (friend) => {
    setActiveOpponent({ 
      id: friend.id, 
      name: friend.first_name ? `${friend.first_name} ${friend.last_name || ''}`.trim() : friend.name || 'Student' 
    });
    if (setCurrentPage) {
      setCurrentPage('duels');
    }
  };

  const handleSendFriendRequest = async () => {
    if (!friendSearchQuery.includes('#')) {
      toast.error("Please include the #tag (e.g., maven#1234)");
      return;
    }
    
    const [username, userTag] = friendSearchQuery.split('#');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: foundUser, error: searchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .eq('user_tag', '#' + userTag)
        .single();
        
      if (searchError || !foundUser) {
         toast.error("User not found. Check the spelling and tag!");
         return;
      }
      
      if (foundUser.id === user.id) {
         toast.error("You cannot send a friend request to yourself.");
         return;
      }
      
      const { error: insertError } = await supabase
        .from('friendships')
        .insert({
          requester_id: user.id,
          receiver_id: foundUser.id,
          status: 'pending'
        });
        
      if (insertError) {
        if (insertError.code === '23505') { 
          toast.error("Friend request already exists.");
        } else {
          throw insertError;
        }
      } else {
        toast.success(`Friend request sent to ${username}!`);
        setFriendSearchQuery('');
      }
    } catch (err) {
      console.error("Error sending friend request:", err);
      toast.error("Failed to send friend request. Try again later.");
    }
  };

  const [newStackTitle, setNewStackTitle] = useState('');
  const [newStackTopic, setNewStackTopic] = useState('');
  const [newStackIcon, setNewStackIcon] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [myStacks, setMyStacks] = useState([]);
  const [activeStackTab, setActiveStackTab] = useState('browse');
  const [flashcards, setFlashcards] = useState([{ term: '', definition: '' }]);
  const [stackMode, setStackMode] = useState('game');
  const [gameType, setGameType] = useState('spelling');
  const [portfolioStacks, setPortfolioStacks] = useState([]);
  const [publicStacks, setPublicStacks] = useState([]);
  const [buzzBalance, setBuzzBalance] = useState(0);

  const handleAddCard = () => {
    if (flashcards.length >= 50) {
      toast.error('You can only have up to 50 flashcards per stack.');
      return;
    }
    setFlashcards([...flashcards, { term: '', definition: '' }]);
  };

  const handleCardChange = (index, field, value) => {
    const updated = [...flashcards];
    updated[index][field] = value;
    setFlashcards(updated);
  };

  const handleRemoveCard = (index) => {
    if (flashcards.length <= 1) return;
    const updated = flashcards.filter((_, i) => i !== index);
    setFlashcards(updated);
  };

  useEffect(() => {
    if (currentPage === 'stacks' || currentPage === 'portfolio') {
      fetchMyStacks();
    }
    if (currentPage === 'portfolio') {
      fetchPortfolioStacks();
    }
    if (currentPage === 'stacks') {
      fetchPublicStacks();
    }
  }, [currentPage]);

  const fetchBuzzBalance = async () => {
    // Disabled to prevent infinite 400 errors
    setBuzzBalance(0);
  };

  const fetchFriends = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.id) return;
    
    setIsLoadingFriends(true);
    
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select('id, requester_id, receiver_id, status')
      .eq('status', 'accepted')
      .or(`requester_id.eq."${user.id}",receiver_id.eq."${user.id}"`);
      
    if (error) console.error("Error fetching friendships:", error);
      
    if (friendships && friendships.length > 0) {
      const friendIds = friendships.map(f => f.requester_id === user.id ? f.receiver_id : f.requester_id).filter(Boolean);
      
      if (friendIds.length > 0) {
        const { data: profiles, error: profError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', friendIds);
          
        if (profError) console.error("Error fetching profiles:", profError);
          
        if (profiles) {
          const mappedFriends = profiles.map(profile => {
             const friendship = friendships.find(f => f.requester_id === profile.id || f.receiver_id === profile.id);
             return { ...profile, friendship_id: friendship?.id };
          });
          setFriendsList(mappedFriends);
        } else {
          setFriendsList([]);
        }
      } else {
        setFriendsList([]);
      }
    } else {
      setFriendsList([]);
    }
    
    setIsLoadingFriends(false);
  };

  const fetchPendingRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.id) return;
    
    setIsLoadingPending(true);
    
    const { data: pending, error: pendingError } = await supabase
      .from('friendships')
      .select('id, requester_id, receiver_id, status')
      .eq('receiver_id', user.id)
      .eq('status', 'pending');
      
    console.log("Fetched pending requests:", pending, "Error:", pendingError);
      
    if (pending && pending.length > 0) {
      const requesterIds = pending.map(p => p.requester_id).filter(Boolean);
      
      if (requesterIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', requesterIds);
          
        console.log("Fetched requester profiles:", profiles, "Error:", profilesError);
          
        if (profiles && profiles.length > 0) {
          const pendingWithProfiles = pending.map(p => {
            const profile = profiles.find(prof => prof.id === p.requester_id);
            if (!profile) return null;
            return { ...profile, friendship_id: p.id };
          }).filter(Boolean);
          console.log("Setting pending requests state to:", pendingWithProfiles);
          setPendingRequests(pendingWithProfiles);
        } else {
          setPendingRequests([]);
        }
      } else {
        setPendingRequests([]);
      }
    } else {
      setPendingRequests([]);
    }
    
    setIsLoadingPending(false);
  };

  const handleAcceptRequest = async (friendshipId) => {
    console.log("Accept clicked for ID:", friendshipId);
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) {
        toast.error("Failed to accept request.");
        console.error(error);
      } else {
        toast.success("Friend request accepted!");
        fetchPendingRequests();
        fetchFriends();
      }
    } catch (err) {
      console.error("Try/catch error in handleAcceptRequest:", err);
      toast.error("An unexpected error occurred.");
    }
  };

  const handleDeclineRequest = async (friendshipId) => {
    console.log("Decline clicked for ID:", friendshipId);
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) {
        toast.error("Failed to decline request.");
        console.error(error);
      } else {
        toast.success("Friend request declined.");
        fetchPendingRequests();
      }
    } catch (err) {
      console.error("Try/catch error in handleDeclineRequest:", err);
      toast.error("An unexpected error occurred.");
    }
  };

  useEffect(() => {
    fetchBuzzBalance();
    fetchFriends();
    fetchPendingRequests();
    
    // Fetch Garden Data
    const fetchGardenData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.id) return;
      const { data } = await supabase.from('profiles').select('garden_seed, garden_xp, last_watered_at').eq('id', user.id).single();
      if (data) {
        setGardenData({
          seed: data.garden_seed,
          xp: data.garden_xp || 0,
          lastWatered: data.last_watered_at
        });
      }
    };
    fetchGardenData();
    
    // Fetch Study Logs for Analytics
    const fetchStudyLogs = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.id) return;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('study_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgo.toISOString());

      if (data) {
        const daysMap = { 'Sun': { minutes: 0, wits: 0 }, 'Mon': { minutes: 0, wits: 0 }, 'Tue': { minutes: 0, wits: 0 }, 'Wed': { minutes: 0, wits: 0 }, 'Thu': { minutes: 0, wits: 0 }, 'Fri': { minutes: 0, wits: 0 }, 'Sat': { minutes: 0, wits: 0 } };
        const hMap = {};

        data.forEach(log => {
          const d = new Date(log.created_at);
          const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
          if (daysMap[dayStr]) {
            daysMap[dayStr].minutes += (log.session_minutes || 0);
            daysMap[dayStr].wits += (log.wits_earned || log.wits || log.cards_correct || 0);
          }
          const hour = log.session_hour !== undefined ? log.session_hour : d.getHours();
          hMap[hour] = (hMap[hour] || 0) + (log.session_minutes || 0);
        });

        const orderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        setWeeklyData(orderedDays.map(d => ({ day: d, minutes: daysMap[d].minutes, wits: daysMap[d].wits })));
        setHeatmapData(hMap);
      }
    };
    fetchStudyLogs();
    
  }, []); 


  // YOUR NEW LEADERBOARD USEEFFECT
  useEffect(() => {
    const fetchTopUsers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, streak_count, xp, avatar_seed')
        .order('xp', { ascending: false })
        .limit(10);
      if (data) setTopUsers(data);
    };
    fetchTopUsers();
  }, []);

  // YOUR REALTIME WEBSOCKET USEEFFECT
  useEffect(() => {
    let channel;
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.id) return;

      channel = supabase
        .channel('active_duels_changes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'active_duels' },
          (payload) => {
            console.log('WebSocket Payload Received:', payload);
            if (payload.new.opponent_id === user.id) {
              toast((t) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.05rem' }}><strong>⚔️ You've been challenged!</strong></span>
                  <button
                    onClick={async () => {
                      toast.dismiss(t.id);
                      await supabase.rpc('accept_challenge', { target_duel_id: payload.new.id });
                      fetchBuzzBalance();
                      setActiveOpponent({ id: payload.new.challenger_id, name: 'Challenger' });
                      if (setCurrentPage) setCurrentPage('duels');
                    }}
                    style={{ padding: '8px 16px', background: 'var(--color-primary, #6366f1)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}
                  >
                    Accept Challenge
                  </button>
                </div>
              ), { duration: 30000 });
            }
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status);
        });
    };

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [setCurrentPage]);

  const fetchPublicStacks = async () => {
    const { data, error } = await supabase
      .from('stacks')
      .select('*, flashcards(count)');
    if (!error && data) {
      setPublicStacks(data);
    }
  };

  const fetchPortfolioStacks = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user || !session.user.id) return;
    const { data, error } = await supabase
      .from('stacks')
      .select('*, flashcards(count)')
      .eq('user_id', session.user.id);
    if (!error && data) {
      setPortfolioStacks(data);
    }
  };

  const handleDeletePortfolioStack = async (stackId) => {
    const { error } = await supabase.from('stacks').delete().eq('id', stackId);
    if (error) {
      toast.error('Error deleting stack: ' + error.message);
    } else {
      toast.success('Stack deleted');
      fetchPortfolioStacks();
      fetchMyStacks();
    }
  };

  const fetchMyStacks = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user || !session.user.id) return;
    const { data, error } = await supabase
      .from('stacks')
      .select('*')
      .eq('user_id', session.user.id);
    if (!error && data) {
      setMyStacks(data);
    }
  };

  const handleCreateStack = async (e) => {
    if (e) e.preventDefault();

    if (!newStackTitle.trim() || !newStackTopic.trim()) {
      toast.error('Please enter a title and a topic.');
      return;
    }

    let validCards = [];
    if (stackMode === 'game') {
      validCards = flashcards.filter(c => c.term.trim() !== '' || c.definition.trim() !== '');
      if (validCards.length === 0) {
        toast.error('Please add at least one non-empty flashcard.');
        return;
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('You must be logged in.');
      return;
    }

    const { data: stackData, error: stackError } = await supabase
        .from('stacks')
        .insert([{ 
            title: newStackTitle, 
            category: newStackTopic, 
            emoji: newStackIcon || '📚',
            mode: stackMode,
            user_id: session.user.id 
        }])
        .select()
        .single();
    
    if (stackError) {
      toast.error('Error creating stack: ' + stackError.message);
      return;
    }

    if (stackMode === 'review') {
      console.log("PDF Upload to Bucket TBD");
      toast.success('PDF Review Stack created successfully! 🌱');
    } else {
      const cardsToInsert = validCards.map(c => {
        const cardData = {
          stack_id: stackData.id,
          term: c.term,
          definition: c.definition,
          type: gameType
        };
        
        if (gameType === 'multiple-choice') {
          cardData.wrong_1 = c.distractor1 || '';
          cardData.wrong_2 = c.distractor2 || '';
          cardData.wrong_3 = c.distractor3 || '';
        }
        
        return cardData;
      });

      const { error: cardsError } = await supabase
          .from('flashcards')
          .insert(cardsToInsert);

      if (cardsError) {
        toast.error('Error saving flashcards: ' + cardsError.message);
        return;
      }

      toast.success('Game Stack created successfully! 🌱');
    }

    setNewStackTitle('');
    setNewStackTopic('');
    setNewStackIcon('');
    setFlashcards([{ term: '', definition: '' }]);
    setActiveStackTab('browse');
    fetchMyStacks();
  };

  const handleWaterPlant = async () => {
    const today = new Date().toDateString();
    
    if (gardenData.lastWatered && new Date(gardenData.lastWatered).toDateString() === today) {
      toast.error("Already watered today! Come back tomorrow.");
      return;
    }

    setIsWatering(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        setIsWatering(false);
        return;
    }

    // ✨ THE FIX: Award 25 XP per watering!
    const { error } = await supabase
        .from('profiles')
        .update({ 
            garden_xp: gardenData.xp + 25, 
            last_watered_at: new Date().toISOString() 
        })
        .eq('id', user.id);

    if (error) {
      toast.error('Failed to water plant: ' + error.message);
      setIsWatering(false);
    } else {
      setGardenData(prev => ({
          ...prev,
          xp: prev.xp + 25,
          lastWatered: new Date().toISOString()
      }));
      toast.success('Plant watered! +25 XP 💧');
      
      setTimeout(() => setIsWatering(false), 500);
      fetchBuzzBalance(); 
    }
  };

  const handleBuyFertilizer = async () => {
    const { error } = await supabase.rpc('process_buzz_transaction', {
      amount_to_add: -50,
      transaction_reason: 'Bought Eco-Garden Fertilizer'
    });

    if (error) {
      toast.error('Failed to buy fertilizer: ' + error.message);
    } else {
      toast.success('Successfully bought Eco-Garden Fertilizer!');
    }
  };

  const handlePurchase = async (cost, itemName) => {
    if (buzzBalance < cost) {
      toast.error(`Not enough Buzz for ${itemName}!`);
      return;
    }
    const { error } = await supabase.rpc('process_buzz_transaction', {
      amount_to_add: -cost,
      transaction_reason: `Bought ${itemName}`
    });

    if (error) {
      toast.error(`Failed to purchase ${itemName}: ` + error.message);
    } else {
      toast.success(`Successfully purchased ${itemName}!`);
      fetchBuzzBalance();
    }
  };


  const publicStacksData = [
    { title: 'Chemistry 101', author: 'By Dr. Einstein', icon: '🧪', cat: 'science', themeClass: 'theme-science', tags: ['Atoms', 'Periodic Table'] },
    { title: 'French Grammar', author: 'By Mme. Bovary', icon: '🥐', cat: 'language', themeClass: 'theme-language', tags: ['Verbs', 'Tenses'] },
    { title: 'Algebra Basics', author: 'By Prof. Newton', icon: '📐', cat: 'math', themeClass: 'theme-math', tags: ['Equations', 'Graphs'] },
    { title: 'World War II', author: 'By Mr. Churchill', icon: '🏛️', cat: 'history', themeClass: 'theme-history', tags: ['1939', 'Europe'] }
  ];

  const getAvatarUrl = (seed) => {
    if (seed === 'DragonSage') return '/white-dragon.png';
    if (seed === 'CyberNinja') return 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f977.svg';
    return `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;
  };

  const getTreeEmoji = (seed) => {
    if (seed === 'Kamagong') return '🪵';
    if (seed === 'Almaciga' || seed === 'Apitong') return '🌲';
    if (seed === 'Tindalo') return '🌺';
    return '🌳';
  };

  const handlePrevNews = () => {
    setCurrentIndex((prev) => (prev === 0 ? curatedNews.length - 1 : prev - 1));
  };

  const handleNextNews = () => {
    setCurrentIndex((prev) => (prev === curatedNews.length - 1 ? 0 : prev + 1));
  };

  const currentArticle = curatedNews[currentIndex];

  return (
    <div id="content-area" className={styles['content-area']}>

            
            <section id="home" className={`${styles['page-section']} ${currentPage === 'home' ? styles['fade-in'] : styles['hidden-page']}`}>

                
                {/* Educational News & Announcements Grid */}
                <div className={styles['news-grid']}>
                  
                  {/* Large Featured Article (Left Side) */}
                  <div className={`${styles['news-card']} ${styles['featured']}`} style={{
                    position: 'relative',
                    backgroundImage: 'linear-gradient(to right bottom, #1e293b, #0f172a)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}>
                    {/* Carousel Controls */}
                    {curatedNews.length > 1 && (
                      <>
                        <button 
                          onClick={handlePrevNews}
                          style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', zIndex: 10, transition: 'background 0.2s' }}
                          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.4)'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                        >
                          <i className="fa-solid fa-chevron-left"></i>
                        </button>
                        <button 
                          onClick={handleNextNews}
                          style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', zIndex: 10, transition: 'background 0.2s' }}
                          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.4)'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                        >
                          <i className="fa-solid fa-chevron-right"></i>
                        </button>
                        <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.5)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', color: '#fff' }}>
                          {currentIndex + 1} / {curatedNews.length}
                        </div>
                      </>
                    )}

                    <span className={styles['news-tag']}>Featured</span>
                    <h3 style={{ padding: '0 2rem' }}>{currentArticle?.title}</h3>
                    <p style={{ padding: '0 2rem' }}>{currentArticle?.description}</p>
                    <a 
                      href={currentArticle?.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles['news-read-btn']}
                      style={{ position: 'relative', zIndex: 5, marginLeft: '2rem', display: 'inline-block', textDecoration: 'none' }}
                    >
                      Read Article
                    </a>
                  </div>

                  {/* Smaller Articles (Right Side) */}
                  <div className={styles['news-side-column']}>
                    
                    <div className={styles['news-card-small']}>
                      <span className={styles['news-tag']} style={{ background: '#f59e0b' }}>DAILY QUEST</span>
                      <h4>Win 3 Arena Duels</h4>
                      <p>Test your knowledge against other scholars. Win 3 matches to claim your daily reward.</p>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold', color: '#f59e0b' }}>
                        Reward: +50 Buzz 🍯
                      </div>
                    </div>

                    <div className={styles['news-card-small']}>
                      <span className={styles['news-tag']} style={{ background: '#10b981' }}>
                        <i className="fa-solid fa-circle-dot fa-fade" style={{ color: '#ef4444', marginRight: '5px' }}></i>
                        LIVE EVENT
                      </span>
                      <h4>The Arena: Weekend Clash</h4>
                      <p>The arena is currently open! Equip your avatars and battle other scholars to climb the leaderboard.</p>
                      <button 
                        onClick={() => setCurrentPage && setCurrentPage('duels')}
                        style={{
                          marginTop: '0.75rem',
                          width: '100%',
                          padding: '0.6rem',
                          backgroundColor: 'var(--theme-primary, #003F91)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-secondary, #002c66)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--theme-primary, #003F91)'}
                      >
                        Enter The Arena ⚔️
                      </button>
                    </div>

                  </div>
                </div>

                
                {/* Dashboard Middle Row: Eco-Garden & Sidebar */}
                <div className={styles['dashboard-middle-row']}>
                  
                  {/* Left: Eco-Garden Card */}
                  <div className={styles['eco-garden-card']}>
                    <h3>LuntiGrow</h3>
                    <p>Keep your streak alive to plant real trees via Ecosia!</p>
                    
                    {!gardenData.seed ? (
                        <>
                            <div className={styles['plant-container']} style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0' }}>
                                <span style={{ fontSize: '4rem' }}>🕳️</span>
                            </div>
                            <p style={{ textAlign: 'center', marginBottom: '2rem', color: '#64748b' }}>Your plot is empty. Head to the Shop to buy a seed!</p>
                            <div className={styles['garden-actions']}>
                                <button onClick={() => { if (setCurrentPage) setCurrentPage('shop'); }} className={styles['btn-water']} style={{width: '100%'}}>Go to Shop</button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className={styles['plant-container']} style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0' }}>
                              <div className={`${styles['animate-float']} ${isWatering ? styles['animate-grow'] : ''}`} style={{ fontSize: '6rem', lineHeight: '1' }}>
                                {/* ✨ THE FIX: Growth Engine Logic */}
                                {gardenData.xp < 100 ? '🌱' : gardenData.xp < 250 ? '🌿' : getTreeEmoji(gardenData.seed)}
                              </div>
                            </div>
                            
                            <div className={styles['progress-section']}>
                              <div className={styles['progress-labels']}>
                                <span>
                                  {gardenData.xp < 100 ? 'Level 1: Sprout' : gardenData.xp < 250 ? 'Level 2: Sapling' : `Level 3: ${gardenData.seed}`}
                                </span>
                                <span>
                                  {gardenData.xp}/{gardenData.xp < 100 ? 100 : gardenData.xp < 250 ? 250 : 'MAX'} XP
                                </span>
                              </div>
                              <div className={styles['progress-bar-bg']}>
                                <div 
                                  className={styles['progress-bar-fill']} 
                                  style={{ 
                                    width: `${gardenData.xp < 100 ? gardenData.xp : gardenData.xp < 250 ? ((gardenData.xp - 100) / 150) * 100 : 100}%` 
                                  }}>
                                </div>
                              </div>
                            </div>

                            <div className={styles['garden-actions']}>
                              <button 
                                onClick={handleWaterPlant} 
                                className={styles['btn-water']}
                                disabled={isWatering || (gardenData.lastWatered && new Date(gardenData.lastWatered).toDateString() === new Date().toDateString())}
                                style={{ 
                                  opacity: (gardenData.lastWatered && new Date(gardenData.lastWatered).toDateString() === new Date().toDateString()) ? 0.5 : 1, 
                                  cursor: (gardenData.lastWatered && new Date(gardenData.lastWatered).toDateString() === new Date().toDateString()) ? 'not-allowed' : 'pointer' 
                                }}
                              >
                                {isWatering ? 'Watering...' : (gardenData.lastWatered && new Date(gardenData.lastWatered).toDateString() === new Date().toDateString() ? 'Watered 💧' : 'Water (1/1)')}
                              </button>
                              <button onClick={handleBuyFertilizer} className={styles['btn-fertilizer']}>Buy Fertilizer</button>
                            </div>
                        </>
                    )}
                  </div>

                  {/* Right: Stats & Friends Column */}
                  <div className={styles['home-sidebar-column']}>
                    
                    {/* Stats Card */}
                    <div className={styles['stats-card']}>
                      <div className={styles['stat-item']}>
                        <div className={styles['stat-circle']} style={{ background: '#dcfce7' }}></div>
                        <div className={styles['stat-info']}>
                          <span className={styles['stat-label']}>ACCURACY</span>
                          <span className={styles['stat-value']}>87%</span>
                        </div>
                      </div>
                      <div className={styles['stat-item']}>
                        <div className={styles['stat-circle']} style={{ background: '#f3e8ff' }}></div>
                        <div className={styles['stat-info']}>
                          <span className={styles['stat-label']}>STUDY TIME</span>
                          <span className={styles['stat-value']}>{formattedHours}h</span>
                        </div>
                      </div>
                    </div>

                    {/* Top Friends Card */}
                    <div className={styles['top-friends-card']}>
                      <div className={styles['friends-header']}>
                        <h3>Top Friends</h3>
                        <button onClick={() => { if (setCurrentPage) setCurrentPage('duels'); }} className={styles['view-all-btn']}>View All</button>
                      </div>
                      
                      {/* Friend Row dynamic map */}
                      {friendsList.length > 0 ? friendsList.map((friend, idx) => (
                        <div className={styles['friend-row']} key={friend.id}>
                          <div className={styles['friend-left']}>
                            <img src={getAvatarUrl(friend.avatar_seed || friend.first_name || friend.id)} alt="friend" className={styles['friend-avatar']} />
                            <span className={styles['friend-name']}>{friend.first_name || 'Student'} {friend.last_name ? friend.last_name.charAt(0) + '.' : ''}</span>
                          </div>
                          <div className={styles['friend-right']}>
                            <span className={styles['friend-xp']}>{2410 - (idx * 300)} XP</span>
                            <button className={styles['btn-duel']} onClick={() => handleDuelFriend(friend)}>Duel</button>
                          </div>
                        </div>
                      )) : (
                        <p style={{ fontSize: '0.9rem', color: '#9ca3af' }}>No friends found.</p>
                      )}
                    </div>

                  </div>
                </div>

            </section>

                
                <div className={styles['fog-demo-section']}>
                    <div className={styles['fog-demo-header']}>
                        <div>
                            <h3 className={styles['section-heading']}>🧠 Brain Fog Session</h3>
                            <p className={styles['fog-demo-subtitle']}>Answer these cards — the detector monitors your mental clarity in real time.</p>
                        </div>
                        <button className={styles['fog-open-btn']} onClick={() => { /* TODO: hook up toggleFogPanel() */ }}>
                            <i className={`${styles['fa-solid']} ${styles['fa-brain']}`}></i> View Full Report
                        </button>
                    </div>
                    <div className={styles['fog-flashcard-wrapper']}>
                        <div className={styles['fog-flashcard']} id="fog-flashcard" onClick={() => { /* TODO: hook up flipCard() */ }}>
                            <div className={styles['fog-card-inner']} id="fog-card-inner">
                                <div className={styles['fog-card-front']}>
                                    <span className={styles['fog-card-tag']} id="fog-card-tag">Science</span>
                                    <p className={styles['fog-card-question']} id="fog-card-question">Loading...</p>
                                    <p className={styles['fog-card-hint']}>Click to reveal answer</p>
                                </div>
                                <div className={styles['fog-card-back']}>
                                    <p className={styles['fog-card-answer']} id="fog-card-answer">—</p>
                                </div>
                            </div>
                        </div>
                        <div className={styles['fog-card-dots']} id="fog-card-dots"></div>
                    </div>
                    <div className={`${styles['fog-answer-btns']} ${styles['hidden']}`} id="fog-answer-btns">
                        <button className={styles['fog-ans-wrong']} onClick={() => { /* TODO: hook up recordAnswer(false) */ }}>
                            <i className={`${styles['fa-solid']} ${styles['fa-xmark']}`}></i> Did not Know
                        </button>
                        <button className={styles['fog-ans-correct']} onClick={() => { /* TODO: hook up recordAnswer(true) */ }}>
                            <i className={`${styles['fa-solid']} ${styles['fa-check']}`}></i> Got It!
                        </button>
                    </div>
                    <div className={styles['fog-inline-hud']}>
                        <div className={styles['fog-hud-item']}><i className={`${styles['fa-solid']} ${styles['fa-stopwatch']}`}></i><span>Response: <strong id="hud-response">—</strong></span></div>
                        <div className={styles['fog-hud-item']}><i className={`${styles['fa-solid']} ${styles['fa-triangle-exclamation']}`}></i><span>Hesitations: <strong id="hud-hesitation">0</strong></span></div>
                        <div className={styles['fog-hud-item']}><i className={`${styles['fa-solid']} ${styles['fa-brain']}`}></i><span>Clarity: <strong id="hud-clarity">100%</strong></span></div>
                        <div className={styles['fog-hud-status']} id="hud-status-badge">⚡ Sharp</div>
                    </div>
                </div>

            
            <section id="stacks" className={`${styles['page-section']} ${currentPage === 'stacks' ? styles['fade-in'] : styles['hidden-page']}`}>

                
                <div className={styles['stacks-view-tabs']}>
                    <button className={`${styles['stacks-tab']} ${activeStackTab === 'browse' ? styles['active'] : ''}`} id="tab-browse" onClick={() => setActiveStackTab('browse')}>
                        <i className={`${styles['fa-solid']} ${styles['fa-layer-group']}`}></i> Browse Stacks
                    </button>
                    <button className={`${styles['stacks-tab']} ${activeStackTab === 'create' ? styles['active'] : ''}`} id="tab-create" onClick={() => setActiveStackTab('create')}>
                        <i className={`${styles['fa-solid']} ${styles['fa-plus']}`}></i> Create Stack
                    </button>
                    <button className={`${styles['stacks-tab']} ${activeStackTab === 'mystacks' ? styles['active'] : ''}`} id="tab-mystacks" onClick={() => setActiveStackTab('mystacks')}>
                        <i className={`${styles['fa-solid']} ${styles['fa-bookmark']}`}></i> My Stacks
                    </button>
                </div>

                
                {activeStackTab === 'browse' && (
                <div id="stacks-browse-view">
                    <div className={styles['stacks-header']}>
                        <h2 className={`${styles['section-heading']} ${styles['large']}`}>Public Stacks</h2>
                    </div>
                    <div className={styles['filter-bar']}>
                        {['All', 'Multiple Choice', 'Spelling'].map(mode => (
                          <button 
                            key={mode} 
                            className={`${styles['filter-chip']} ${activeStackFilter === mode ? styles['active'] : ''}`} 
                            onClick={() => setActiveStackFilter(mode)}
                          >
                            {mode}
                          </button>
                        ))}
                    </div>
                    <div className={styles['stacks-grid']} id="public-stacks-grid">
                        {publicStacks
                          .filter(stack => (stack.title || '').toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((stack, index) => (
                            <div key={index} onClick={() => { /* TODO: hook up openStackModal(stack.title) */ }} className={`${styles['stack-card']} ${styles['expanded']} ${styles['theme-science']}`} data-cat={stack.category}>
                                <div className={styles['stack-card-header']}><div className={`${styles['stack-icon']} ${styles['small']}`}>📚</div><i className={`${styles['fa-regular']} ${styles['fa-bookmark']} ${styles['stack-bookmark-icon']}`}></i></div>
                                <h3 className={`${styles['stack-title']} ${styles['large']}`}>{stack.title}</h3>
                                <p className={styles['stack-author']}>By Student User</p>
                                <div className={styles['stack-tags-row']}>
                                    <span className={`${styles['stack-tag']} ${styles['theme-gray']}`}>{stack.category || 'General'}</span>
                                    <span className={`${styles['stack-tag']} ${styles['theme-gray']}`}>{stack.flashcards?.[0]?.count || 0} Terms</span>
                                </div>
                            </div>
                          ))
                        }
                    </div>
                </div>
                )}

                
                {activeStackTab === 'create' && (
                <div id="stacks-create-view">
                    <div className={styles['create-stack-form']}>
                        <h2 className={`${styles['section-heading']} ${styles['large']}`}>✨ Create New Stack</h2>
                        <p className={styles['create-stack-subtitle']}>Build your flashcard set step by step — just like Quizlet!</p>

                        
                        <div className={styles['create-meta-row']}>
                            <div className={styles['create-field']}>
                                <label className={styles['create-label']}>Stack Title *</label>
                                <input type="text" id="new-stack-title" className={styles['create-input']} placeholder="e.g. Biology: Cell Division" maxLength="60" value={newStackTitle} onChange={(e) => setNewStackTitle(e.target.value)}/>
                            </div>
                            <div className={styles['create-field']}>
                                <label className={styles['create-label']}>Subject / Topic</label>
                                <input type="text" id="new-stack-topic" className={styles['create-input']} placeholder="e.g. Science, Math, History…" value={newStackTopic} onChange={(e) => setNewStackTopic(e.target.value)}/>
                            </div>
                            <div className={styles['create-field']} style={{ position: 'relative' }}>
                                <label className={styles['create-label']}>Emoji Icon</label>
                                <div 
                                    id="new-stack-emoji" 
                                    className={`${styles['create-input']} ${styles['emoji-input']}`} 
                                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                                    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '2rem', cursor: 'pointer' }}
                                >
                                    {newStackIcon || '🧬'}
                                </div>
                                {showEmojiPicker && (
                                  <div style={{ position: 'absolute', zIndex: 50, marginTop: '10px' }}>
                                    <EmojiPicker 
                                      onEmojiClick={(emojiObject) => {
                                        setNewStackIcon(emojiObject.emoji);
                                        setShowEmojiPicker(false);
                                      }} 
                                    />
                                  </div>
                                )}
                            </div>
                        </div>

                        
                        <div className={styles['create-meta-row']} style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                            <div className={styles['create-field']} style={{ width: '100%' }}>
                                <label className={styles['create-label']}>What type of stack is this?</label>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                    <label style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem 1.5rem', border: stackMode === 'game' ? '2px solid var(--color-primary)' : '2px solid rgba(255,255,255,0.1)', borderRadius: '12px', background: stackMode === 'game' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.03)', transition: 'all 0.2s', fontWeight: stackMode === 'game' ? 'bold' : 'normal', color: stackMode === 'game' ? '#fff' : '#9ca3af' }}>
                                        <input type="radio" name="stackMode" value="game" checked={stackMode === 'game'} onChange={(e) => setStackMode(e.target.value)} style={{ display: 'none' }} />
                                        🎮 Game Deck
                                    </label>
                                    <label style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem 1.5rem', border: stackMode === 'review' ? '2px solid var(--color-primary)' : '2px solid rgba(255,255,255,0.1)', borderRadius: '12px', background: stackMode === 'review' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.03)', transition: 'all 0.2s', fontWeight: stackMode === 'review' ? 'bold' : 'normal', color: stackMode === 'review' ? '#fff' : '#9ca3af' }}>
                                        <input type="radio" name="stackMode" value="review" checked={stackMode === 'review'} onChange={(e) => setStackMode(e.target.value)} style={{ display: 'none' }} />
                                        📄 PDF Reviewer
                                    </label>
                                </div>
                            </div>
                        </div>

                        {stackMode === 'review' ? (
                            <div className={styles['create-field']} style={{ marginTop: '2rem', textAlign: 'center' }}>
                                <label className={styles['create-label']}>Upload PDF Material</label>
                                <div style={{ marginTop: '1rem', border: '2px dashed rgba(255,255,255,0.2)', borderRadius: '16px', padding: '4rem 2rem', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'} onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}>
                                    <i className={`${styles['fa-regular']} ${styles['fa-file-pdf']}`} style={{ fontSize: '3.5rem', color: '#ef4444' }}></i>
                                    <div>
                                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: '#fff' }}>Drag & Drop your PDF</h4>
                                        <p style={{ margin: '0', color: '#9ca3af', fontSize: '0.9rem' }}>Or click the button below to browse your files</p>
                                    </div>
                                    <input type="file" accept="application/pdf" style={{ display: 'none' }} id="pdf-upload" />
                                    <label htmlFor="pdf-upload" className={`${styles['hero-btn']} ${styles['small-btn']}`} style={{ cursor: 'pointer', marginTop: '0.5rem' }}>Select PDF File</label>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className={styles['create-meta-row']} style={{ marginBottom: '1.5rem' }}>
                                    <div className={styles['create-field']} style={{ width: '100%' }}>
                                        <label className={styles['create-label']}>Game Format</label>
                                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                            <label style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem 1rem', border: gameType === 'spelling' ? '2px solid var(--color-primary)' : '2px solid rgba(255,255,255,0.1)', borderRadius: '8px', background: gameType === 'spelling' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.02)', transition: 'all 0.2s', color: gameType === 'spelling' ? '#fff' : '#9ca3af' }}>
                                                <input type="radio" name="gameType" value="spelling" checked={gameType === 'spelling'} onChange={(e) => setGameType(e.target.value)} style={{ display: 'none' }} />
                                                ⌨️ Spelling (Typing)
                                            </label>
                                            <label style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem 1rem', border: gameType === 'multiple-choice' ? '2px solid var(--color-primary)' : '2px solid rgba(255,255,255,0.1)', borderRadius: '8px', background: gameType === 'multiple-choice' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.02)', transition: 'all 0.2s', color: gameType === 'multiple-choice' ? '#fff' : '#9ca3af' }}>
                                                <input type="radio" name="gameType" value="multiple-choice" checked={gameType === 'multiple-choice'} onChange={(e) => setGameType(e.target.value)} style={{ display: 'none' }} />
                                                🔢 Multiple Choice (4 Options)
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles['stack-preview-wrap']}>
                                    <p className={styles['create-label']} style={{ marginBottom: '0.5rem' }}>Preview</p>
                                    <div className={`${styles['stack-card']} ${styles['expanded']} ${styles['theme-science']}`} id="stack-preview-card" style={{ cursor: 'default', maxWidth: '260px' }}>
                                        <div className={styles['stack-card-header']}>
                                            <div className={`${styles['stack-icon']} ${styles['small']}`} id="preview-emoji">{newStackIcon || '📚'}</div>
                                        </div>
                                        <h3 className={`${styles['stack-title']} ${styles['large']}`} id="preview-title">{newStackTitle || 'Your Stack Title'}</h3>
                                        <p className={styles['stack-author']}>By Student User</p>
                                        <div className={styles['stack-tags-row']}>
                                            <span className={`${styles['stack-tag']} ${styles['theme-gray']}`} id="preview-topic">{newStackTopic || 'Topic'}</span>
                                            <span className={`${styles['stack-tag']} ${styles['theme-gray']}`} id="preview-count">{flashcards.length} Terms</span>
                                        </div>
                                    </div>
                                </div>

                                
                                <div className={styles['cards-editor']}>
                                    <div className={styles['cards-editor-header']}>
                                        <h3 className={styles['section-heading']} style={{ margin: '0' }}>Flashcards</h3>
                                        <button className={`${styles['hero-btn']} ${styles['small-btn']}`} onClick={handleAddCard}>
                                            <i className={`${styles['fa-solid']} ${styles['fa-plus']}`}></i> Add Card
                                        </button>
                                    </div>
                                    <div id="cards-list" className={styles['cards-list']}>
                                        {flashcards.map((card, index) => (
                                            <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem', padding: '1.5rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                                                <div style={{ position: 'absolute', top: '-12px', left: '20px', background: 'var(--color-bg, #0f172a)', padding: '0 10px', fontWeight: 'bold', color: 'var(--color-primary)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>{index + 1}</div>
                                                
                                                {flashcards.length > 1 && (
                                                    <button onClick={() => handleRemoveCard(index)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '5px', color: '#ef4444' }} title="Remove Card">
                                                        <i className={`${styles['fa-solid']} ${styles['fa-trash']}`}></i>
                                                    </button>
                                                )}

                                                {gameType === 'spelling' ? (
                                                    <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '0.5rem' }}>
                                                        <div className={styles['create-field']} style={{ flex: 1, margin: 0 }}>
                                                            <label className={styles['create-label']} style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>Question</label>
                                                            <input type="text" className={styles['create-input']} placeholder="e.g. What is the powerhouse of the cell?" value={card.term} onChange={(e) => handleCardChange(index, 'term', e.target.value)} />
                                                        </div>
                                                        <div className={styles['create-field']} style={{ flex: 1, margin: 0 }}>
                                                            <label className={styles['create-label']} style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>Exact Answer</label>
                                                            <input type="text" className={styles['create-input']} placeholder="e.g. Mitochondria" value={card.definition} onChange={(e) => handleCardChange(index, 'definition', e.target.value)} />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className={styles['create-field']} style={{ margin: 0, marginTop: '0.5rem' }}>
                                                            <label className={styles['create-label']} style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>Question</label>
                                                            <input type="text" className={styles['create-input']} placeholder="e.g. Which of the following is a noble gas?" value={card.term} onChange={(e) => handleCardChange(index, 'term', e.target.value)} />
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                            <div className={styles['create-field']} style={{ margin: 0 }}>
                                                                <label className={styles['create-label']} style={{ fontSize: '0.8rem', marginBottom: '0.5rem', color: '#10b981' }}>Correct Answer</label>
                                                                <input type="text" className={styles['create-input']} style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }} placeholder="e.g. Argon" value={card.definition} onChange={(e) => handleCardChange(index, 'definition', e.target.value)} />
                                                            </div>
                                                            <div className={styles['create-field']} style={{ margin: 0 }}>
                                                                <label className={styles['create-label']} style={{ fontSize: '0.8rem', marginBottom: '0.5rem', color: '#ef4444' }}>Distractor 1</label>
                                                                <input type="text" className={styles['create-input']} style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }} placeholder="Wrong Answer" value={card.distractor1 || ''} onChange={(e) => handleCardChange(index, 'distractor1', e.target.value)} />
                                                            </div>
                                                            <div className={styles['create-field']} style={{ margin: 0 }}>
                                                                <label className={styles['create-label']} style={{ fontSize: '0.8rem', marginBottom: '0.5rem', color: '#ef4444' }}>Distractor 2</label>
                                                                <input type="text" className={styles['create-input']} style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }} placeholder="Wrong Answer" value={card.distractor2 || ''} onChange={(e) => handleCardChange(index, 'distractor2', e.target.value)} />
                                                            </div>
                                                            <div className={styles['create-field']} style={{ margin: 0 }}>
                                                                <label className={styles['create-label']} style={{ fontSize: '0.8rem', marginBottom: '0.5rem', color: '#ef4444' }}>Distractor 3</label>
                                                                <input type="text" className={styles['create-input']} style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }} placeholder="Wrong Answer" value={card.distractor3 || ''} onChange={(e) => handleCardChange(index, 'distractor3', e.target.value)} />
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className={styles['cards-editor-footer']}>
                                        <button className={styles['add-card-big-btn']} onClick={handleAddCard}>
                                            <i className={`${styles['fa-solid']} ${styles['fa-plus']}`}></i> Add Another Card
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        
                        <div className={styles['create-save-row']}>
                            <button className={`${styles['btn-water']} ${styles['create-save-btn']}`} onClick={handleCreateStack}>
                                <i className={`${styles['fa-solid']} ${styles['fa-floppy-disk']}`}></i> Save Stack
                            </button>
                            <button className={styles['btn-shop']} onClick={() => setActiveStackTab('browse')} style={{ padding: '0.75rem 1.5rem' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
                )}

                
                {activeStackTab === 'mystacks' && (
                <div id="stacks-mystacks-view">
                    <h2 className={`${styles['section-heading']} ${styles['large']}`} style={{ marginBottom: '1rem' }}>My Stacks</h2>
                    <div className={styles['stacks-grid']} id="my-stacks-grid">
                        <div className={`${styles['stack-card']} ${styles['expanded']} ${styles['theme-science']}`} style={{ border: '2px dashed #d1d5db', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.5rem', cursor: 'pointer', minHeight: '160px' }} onClick={() => setActiveStackTab('create')}>
                            <i className={`${styles['fa-solid']} ${styles['fa-plus']}`} style={{ fontSize: '2rem', color: '#9ca3af' }}></i>
                            <p style={{ color: '#9ca3af', fontWeight: '600' }}>Create your first stack</p>
                        </div>
                        {myStacks.map(stack => (
                            <div key={stack.id} className={`${styles['stack-card']} ${styles['expanded']} ${styles['theme-science']}`} data-cat={stack.category}>
                                <div className={styles['stack-card-header']}><div className={`${styles['stack-icon']} ${styles['small']}`}>📚</div></div>
                                <h3 className={`${styles['stack-title']} ${styles['large']}`}>{stack.title}</h3>
                                <div className={styles['stack-tags-row']}><span className={`${styles['stack-tag']} ${styles['theme-gray']}`}>{stack.category}</span></div>
                            </div>
                        ))}
                    </div>
                </div>
                )}

            </section>

            
            <section id="portfolio" className={`${styles['page-section']} ${currentPage === 'portfolio' ? styles['fade-in'] : styles['hidden-page']}`}>
                <h2 className={`${styles['section-heading']} ${styles['large']}`}>My Portfolio</h2>

                
                {/* Hardcoded folders removed as requested */}

                <h3 className={styles['section-heading']}>My Stacks</h3>
                <div className={styles['portfolio-table-container']}>
                    <table className={styles['portfolio-table']}>
                        <thead>
                            <tr>
                                <th>Stack Name</th>
                                <th>Terms</th>
                                <th>Last Studied</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {portfolioStacks.length > 0 ? portfolioStacks.map((stack) => (
                                <tr key={stack.id}>
                                    <td className={styles['cell-title']}>{stack.title}</td>
                                    <td className={styles['cell-meta']}>{stack.flashcards?.[0]?.count || 0}</td>
                                    <td className={styles['cell-meta']}>Recently</td>
                                    <td>
                                        <span onClick={() => handleDeletePortfolioStack(stack.id)} style={{ cursor: 'pointer', fontSize: '1.2rem' }} title="Delete">🗑️</span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '1rem' }}>No stacks found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {currentPage === 'duels' && (
                <Duel 
                  fetchBuzzBalance={fetchBuzzBalance} 
                  opponent={activeOpponent} 
                  clearOpponent={() => setActiveOpponent(null)} 
                  setCurrentPage={setCurrentPage}
                />
            )}
            
            {/* THIS IS THE NEW SHOP COMPONENT THAT REPLACED THE OLD THRONE SECTION */}
            <ThroneDrops 
                currentPage={currentPage} 
                topUsers={topUsers} 
                calculateLevel={calculateLevel} 
                buzzBalance={buzzBalance} 
                fetchBuzzBalance={fetchBuzzBalance} 
            />

            <Shop currentPage={currentPage} buzzBalance={buzzBalance} handlePurchase={handlePurchase} />


            
            <section id="analytics" className={`${styles['page-section']} ${currentPage === 'analytics' ? styles['fade-in'] : styles['hidden-page']}`}>
                <h2 className={`${styles['section-heading']} ${styles['large']}`}>📊 Study Analytics</h2>
                
                
                <div className={styles['analytics-tabs']}>
                    <button className={`${styles['analytics-tab']} ${styles['active']}`} onClick={() => { /* TODO: hook up switchAnalyticsTab('overview') */ }}>
                        <i className={`${styles['fa-solid']} ${styles['fa-chart-pie']}`}></i> Overview
                    </button>
                    <button className={styles['analytics-tab']} onClick={() => { /* TODO: hook up switchAnalyticsTab('subjects') */ }}>
                        <i className={`${styles['fa-solid']} ${styles['fa-book']}`}></i> Subjects
                    </button>
                    <button className={styles['analytics-tab']} onClick={() => { /* TODO: hook up switchAnalyticsTab('history') */ }}>
                        <i className={`${styles['fa-solid']} ${styles['fa-clock-rotate-left']}`}></i> History
                    </button>
                    <button className={styles['analytics-tab']} onClick={() => { /* TODO: hook up switchAnalyticsTab('srs') */ }}>
                        <i className={`${styles['fa-solid']} ${styles['fa-brain']}`}></i> SRS
                    </button>
                </div>

                
                <div id="analytics-overview" className={styles['analytics-content']}>
                    
                    <div className={styles['analytics-stats-row']}>
                        <div className={styles['analytics-stat-card']}>
                            <div className={`${styles['analytics-stat-icon']} ${styles['bg-blue']}`}>
                                <i className={`${styles['fa-solid']} ${styles['fa-fire']}`}></i>
                            </div>
                            <div className={styles['analytics-stat-info']}>
                                <p className={styles['analytics-stat-value']} id="stat-streak">{userStats.streak || 0}</p>
                                <p className={styles['analytics-stat-label']}>Day Streak</p>
                            </div>
                        </div>
                        <div className={styles['analytics-stat-card']}>
                            <div className={`${styles['analytics-stat-icon']} ${styles['bg-green']}`}>
                                <i className={`${styles['fa-solid']} ${styles['fa-bolt']}`}></i>
                            </div>
                            <div className={styles['analytics-stat-info']}>
                                <p className={styles['analytics-stat-value']} id="stat-wits">{userStats.xp || 0}</p>
                                <p className={styles['analytics-stat-label']}>Total Wits</p>
                            </div>
                        </div>
                        <div className={styles['analytics-stat-card']}>
                            <div className={`${styles['analytics-stat-icon']} ${styles['bg-purple']}`}>
                                <i className={`${styles['fa-solid']} ${styles['fa-clock']}`}></i>
                            </div>
                            <div className={styles['analytics-stat-info']}>
                                <p className={styles['analytics-stat-value']} id="stat-study-time">{userStats.studyHours ? Number(userStats.studyHours).toFixed(1) : '0.0'}h</p>
                                <p className={styles['analytics-stat-label']}>Study Time</p>
                            </div>
                        </div>
                        <div className={styles['analytics-stat-card']}>
                            <div className={`${styles['analytics-stat-icon']} ${styles['bg-orange']}`}>
                                <i className={`${styles['fa-solid']} ${styles['fa-bullseye']}`}></i>
                            </div>
                            <div className={styles['analytics-stat-info']}>
                                <p className={styles['analytics-stat-value']} id="stat-accuracy">{userStats.accuracy || 0}%</p>
                                <p className={styles['analytics-stat-label']}>Accuracy</p>
                            </div>
                        </div>
                    </div>

                    
                    <div className={styles['analytics-chart-card']}>
                        <h3 className={styles['analytics-chart-title']}>📅 Weekly Progress</h3>
                        <div className={styles['weekly-chart']} id="weekly-chart" style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '150px' }}>
                            {weeklyData.map(d => (
                              <div key={d.day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '100%', paddingBottom: '8px' }}>
                                  <div style={{ width: '12px', background: '#5DA9E9', borderRadius: '4px', height: `${Math.min((d.minutes / 120) * 100, 100)}%` }}></div>
                                  <div style={{ width: '12px', background: '#22c55e', borderRadius: '4px', height: `${Math.min((d.wits / 300) * 100, 100)}%` }}></div>
                                </div>
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{d.day}</span>
                              </div>
                            ))}
                        </div>
                        <div className={styles['weekly-legend']}>
                            <span><i className={`${styles['fa-solid']} ${styles['fa-square']}`} style={{ color: '#5DA9E9' }}></i> Cards Studied</span>
                            <span><i className={`${styles['fa-solid']} ${styles['fa-square']}`} style={{ color: '#22c55e' }}></i> Wits Earned</span>
                        </div>
                    </div>

                    
                    <div className={styles['analytics-chart-card']}>
                        <h3 className={styles['analytics-chart-title']}>🕐 Best Study Time</h3>
                        <div className={styles['time-heatmap']} id="time-heatmap">
                            <div className={styles['time-slot']} data-hour="6am"><span>6am</span><div className={styles['heat-bar']} style={{ height: `${Math.max((heatmapData['6'] || 0) / 60 * 100, 5)}%` }}></div></div>
                            <div className={styles['time-slot']} data-hour="8am"><span>8am</span><div className={styles['heat-bar']} style={{ height: `${Math.max((heatmapData['8'] || 0) / 60 * 100, 5)}%` }}></div></div>
                            <div className={styles['time-slot']} data-hour="10am"><span>10am</span><div className={styles['heat-bar']} style={{ height: `${Math.max((heatmapData['10'] || 0) / 60 * 100, 5)}%` }}></div></div>
                            <div className={styles['time-slot']} data-hour="12pm"><span>12pm</span><div className={styles['heat-bar']} style={{ height: `${Math.max((heatmapData['12'] || 0) / 60 * 100, 5)}%` }}></div></div>
                            <div className={styles['time-slot']} data-hour="2pm"><span>2pm</span><div className={styles['heat-bar']} style={{ height: `${Math.max((heatmapData['14'] || 0) / 60 * 100, 5)}%` }}></div></div>
                            <div className={styles['time-slot']} data-hour="4pm"><span>4pm</span><div className={styles['heat-bar']} style={{ height: `${Math.max((heatmapData['16'] || 0) / 60 * 100, 5)}%` }}></div></div>
                            <div className={styles['time-slot']} data-hour="6pm"><span>6pm</span><div className={styles['heat-bar']} style={{ height: `${Math.max((heatmapData['18'] || 0) / 60 * 100, 5)}%` }}></div></div>
                            <div className={styles['time-slot']} data-hour="8pm"><span>8pm</span><div className={styles['heat-bar']} style={{ height: `${Math.max((heatmapData['20'] || 0) / 60 * 100, 5)}%` }}></div></div>
                            <div className={styles['time-slot']} data-hour="10pm"><span>10pm</span><div className={styles['heat-bar']} style={{ height: `${Math.max((heatmapData['22'] || 0) / 60 * 100, 5)}%` }}></div></div>
                        </div>
                        <p className={styles['insight-text']}>💡 You study best in the evening! Keep your evening sessions.</p>
                    </div>

                    
                    <div className={`${styles['analytics-chart-card']} ${styles['goal-card']}`}>
                        <h3 className={styles['analytics-chart-title']}>🎯 Monthly Goal</h3>
                        <div className={styles['goal-progress']}>
                            <div className={styles['goal-circle']}>
                                <svg viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8"/>
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#5DA9E9" strokeWidth="8"
                                        strokeDasharray="283" strokeDashoffset={283 - (283 * goalProgress) / 100} strokeLinecap="round"
                                        transform="rotate(-90 50 50)"/>
                                </svg>
                                <div className={styles['goal-text']}>
                                    <span className={styles['goal-percent']}>{Math.round(goalProgress)}%</span>
                                    <span className={styles['goal-label']}>Complete</span>
                                </div>
                            </div>
                            <div className={styles['goal-details']}>
                                <p><strong>{Number(userStats.studyHours || 0).toFixed(1)} / {monthlyGoalHours}</strong> hours studied</p>
                                <p className={styles['goal-remaining']}>{Math.max(monthlyGoalHours - (userStats.studyHours || 0), 0).toFixed(1)} hours left to reach your goal!</p>
                            </div>
                        </div>
                    </div>
                </div>

                
                <div id="analytics-subjects" className={`${styles['analytics-content']} ${styles['hidden-page']}`} style={{ display: 'none' }}>
                    <h3 className={styles['section-heading']}>📚 Subject Performance</h3>
                    <div className={styles['subject-performance-grid']} id="subject-performance-grid">
                        
                        <div className={styles['subject-perf-card']}>
                            <div className={styles['subject-perf-header']}>
                                <span className={styles['subject-emoji']}>🧬</span>
                                <span className={styles['subject-name']}>Science</span>
                            </div>
                            <div className={styles['subject-perf-stats']}>
                                <div className={styles['subject-perf-stat']}>
                                    <span className={styles['perf-value']}>92%</span>
                                    <span className={styles['perf-label']}>Accuracy</span>
                                </div>
                                <div className={styles['subject-perf-stat']}>
                                    <span className={styles['perf-value']}>156</span>
                                    <span className={styles['perf-label']}>Cards</span>
                                </div>
                                <div className={styles['subject-perf-stat']}>
                                    <span className={styles['perf-value']}>2.1h</span>
                                    <span className={styles['perf-label']}>Time</span>
                                </div>
                            </div>
                            <div className={styles['subject-perf-bar']}>
                                <div className={styles['perf-bar-fill']} style={{ width: '92%', background: 'linear-gradient(90deg,#10b981,#34d399)' }}></div>
                            </div>
                        </div>
                        
                        <div className={styles['subject-perf-card']}>
                            <div className={styles['subject-perf-header']}>
                                <span className={styles['subject-emoji']}>📐</span>
                                <span className={styles['subject-name']}>Math</span>
                            </div>
                            <div className={styles['subject-perf-stats']}>
                                <div className={styles['subject-perf-stat']}>
                                    <span className={styles['perf-value']}>78%</span>
                                    <span className={styles['perf-label']}>Accuracy</span>
                                </div>
                                <div className={styles['subject-perf-stat']}>
                                    <span className={styles['perf-value']}>89</span>
                                    <span className={styles['perf-label']}>Cards</span>
                                </div>
                                <div className={styles['subject-perf-stat']}>
                                    <span className={styles['perf-value']}>1.5h</span>
                                    <span className={styles['perf-label']}>Time</span>
                                </div>
                            </div>
                            <div className={styles['subject-perf-bar']}>
                                <div className={styles['perf-bar-fill']} style={{ width: '78%', background: 'linear-gradient(90deg,#f59e0b,#fbbf24)' }}></div>
                            </div>
                        </div>
                        
                        <div className={styles['subject-perf-card']}>
                            <div className={styles['subject-perf-header']}>
                                <span className={styles['subject-emoji']}>🏛️</span>
                                <span className={styles['subject-name']}>History</span>
                            </div>
                            <div className={styles['subject-perf-stats']}>
                                <div className={styles['subject-perf-stat']}>
                                    <span className={styles['perf-value']}>85%</span>
                                    <span className={styles['perf-label']}>Accuracy</span>
                                </div>
                                <div className={styles['subject-perf-stat']}>
                                    <span className={styles['perf-value']}>67</span>
                                    <span className={styles['perf-label']}>Cards</span>
                                </div>
                                <div className={styles['subject-perf-stat']}>
                                    <span className={styles['perf-value']}>0.8h</span>
                                    <span className={styles['perf-label']}>Time</span>
                                </div>
                            </div>
                            <div className={styles['subject-perf-bar']}>
                                <div className={styles['perf-bar-fill']} style={{ width: '85%', background: 'linear-gradient(90deg,#8b5cf6,#a78bfa)' }}></div>
                            </div>
                        </div>
                        
                        <div className={styles['subject-perf-card']}>
                            <div className={styles['subject-perf-header']}>
                                <span className={styles['subject-emoji']}>🇪🇸</span>
                                <span className={styles['subject-name']}>Language</span>
                            </div>
                            <div className={styles['subject-perf-stats']}>
                                <div className={styles['subject-perf-stat']}>
                                    <span className={styles['perf-value']}>88%</span>
                                    <span className={styles['perf-label']}>Accuracy</span>
                                </div>
                                <div className={styles['subject-perf-stat']}>
                                    <span className={styles['perf-value']}>102</span>
                                    <span className={styles['perf-label']}>Cards</span>
                                </div>
                                <div className={styles['subject-perf-stat']}>
                                    <span className={styles['perf-value']}>1.2h</span>
                                    <span className={styles['perf-label']}>Time</span>
                                </div>
                            </div>
                            <div className={styles['subject-perf-bar']}>
                                <div className={styles['perf-bar-fill']} style={{ width: '88%', background: 'linear-gradient(90deg,#ec4899,#f472b6)' }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                
                <div id="analytics-history" className={`${styles['analytics-content']} ${styles['hidden-page']}`} style={{ display: 'none' }}>
                    <h3 className={styles['section-heading']}>📜 Study History</h3>
                    <div className={styles['study-history-list']} id="study-history-list">
                        <div className={styles['history-item']}>
                            <div className={styles['history-date']}>Today</div>
                            <div className={styles['history-details']}>
                                <span className={styles['history-stack']}>Biology: Mitosis</span>
                                <span className={styles['history-stats']}>24 cards • 92% • 15 min</span>
                            </div>
                            <div className={styles['history-xp']}>+120 XP</div>
                        </div>
                        <div className={styles['history-item']}>
                            <div className={styles['history-date']}>Yesterday</div>
                            <div className={styles['history-details']}>
                                <span className={styles['history-stack']}>AP History 101</span>
                                <span className={styles['history-stats']}>30 cards • 85% • 22 min</span>
                            </div>
                            <div className={styles['history-xp']}>+95 XP</div>
                        </div>
                        <div className={styles['history-item']}>
                            <div className={styles['history-date']}>2 days ago</div>
                            <div className={styles['history-details']}>
                                <span className={styles['history-stack']}>Spanish Vocab</span>
                                <span className={styles['history-stats']}>15 cards • 100% • 10 min</span>
                            </div>
                            <div className={styles['history-xp']}>+80 XP</div>
                        </div>
                        <div className={styles['history-item']}>
                            <div className={styles['history-date']}>3 days ago</div>
                            <div className={styles['history-details']}>
                                <span className={styles['history-stack']}>Calculus Derivatives</span>
                                <span className={styles['history-stats']}>12 cards • 67% • 18 min</span>
                            </div>
                            <div className={styles['history-xp']}>+45 XP</div>
                        </div>
                    </div>
                    <button className={styles['hero-btn']} onClick={() => { /* TODO: hook up exportStudyHistory() */ }}>
                        <i className={`${styles['fa-solid']} ${styles['fa-download']}`}></i> Export History
                    </button>
                </div>

                
                <div id="analytics-srs" className={`${styles['analytics-content']} ${styles['hidden-page']}`} style={{ display: 'none' }}>
                    <h3 className={styles['section-heading']}>🧠 Spaced Repetition System</h3>
                    <div className={styles['srs-info-card']}>
                        <div className={styles['srs-icon']}>📚</div>
                        <h4>Smart Review Scheduling</h4>
                        <p>SRS shows you cards right before you'd forget them, maximizing retention with minimum effort.</p>
                    </div>
                    <div className={styles['srs-dashboard']}>
                        <div className={styles['srs-stat']}>
                            <span className={styles['srs-stat-num']} id="srs-due">12</span>
                            <span className={styles['srs-stat-label']}>Cards Due Today</span>
                        </div>
                        <div className={styles['srs-stat']}>
                            <span className={styles['srs-stat-num']} id="srs-new">8</span>
                            <span className={styles['srs-stat-label']}>New Cards</span>
                        </div>
                        <div className={styles['srs-stat']}>
                            <span className={styles['srs-stat-num']} id="srs-review">24</span>
                            <span className={styles['srs-stat-label']}>To Review</span>
                        </div>
                    </div>
                    <button className={`${styles['hero-btn']} ${styles['start-srs-btn']}`} onClick={() => { /* TODO: hook up startSRSSession() */ }}>
                        <i className={`${styles['fa-solid']} ${styles['fa-play']}`}></i> Start SRS Review
                    </button>
                </div>
            </section>

            
            <section id="friends" className={`${styles['page-section']} ${currentPage === 'friends' ? styles['fade-in'] : styles['hidden-page']}`}>
                <h2 className={`${styles['section-heading']} ${styles['large']}`}>👥 Friends</h2>
                
                
                <div className={styles['friends-tabs']}>
                    <button className={`${styles['friends-tab']} ${activeFriendsTab === 'all' ? styles['active'] : ''}`} onClick={() => setActiveFriendsTab('all')}>All Friends</button>
                    <button className={`${styles['friends-tab']} ${activeFriendsTab === 'online' ? styles['active'] : ''}`} onClick={() => setActiveFriendsTab('online')}>Online</button>
                    <button className={`${styles['friends-tab']} ${activeFriendsTab === 'pending' ? styles['active'] : ''}`} onClick={() => setActiveFriendsTab('pending')}>Pending</button>
                    <button className={`${styles['friends-tab']} ${activeFriendsTab === 'add' ? styles['active'] : ''}`} onClick={() => setActiveFriendsTab('add')}>Add Friend</button>
                </div>

                
                <div id="friends-all" className={`${styles['friends-content']} ${activeFriendsTab === 'all' ? '' : styles['hidden-page']}`} style={{ display: activeFriendsTab === 'all' ? 'block' : 'none' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <input 
                            type="text" 
                            value={friendSearchQuery}
                            onChange={(e) => setFriendSearchQuery(e.target.value)}
                            placeholder="Enter username#tag (e.g. maven#9260)"
                            className={styles['create-input']}
                            style={{ flex: 1, margin: 0, background: 'rgba(30, 41, 59, 0.5)', color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}
                        />
                        <button className={styles['btn-shop']} onClick={handleSendFriendRequest} style={{ padding: '0 1.5rem', background: '#a855f7', color: 'white', border: 'none' }}>
                            Add Friend
                        </button>
                    </div>
                    <div className={styles['friends-grid']} id="friends-grid">
                        {isLoadingFriends ? (
                            <p className={styles['no-drops-msg']} style={{ gridColumn: '1 / -1', margin: '2rem 0' }}>Loading friends...</p>
                        ) : friendsList.length > 0 ? (
                            friendsList.map(friend => (
                                <div className={styles['friend-card']} key={friend.id}>
                                    <div className={styles['friend-card-header']}>
                                        <img src={friend.avatar_url || '/avatars/avatar-1.jpg'} className={styles['friend-card-avatar']} />
                                        <div className={styles['online-badge']}></div>
                                    </div>
                                    <h4 className={styles['friend-card-name']}>
                                        {friend.username}#{friend.user_tag}
                                    </h4>
                                    <p className={styles['friend-card-level']}>
                                        {friend.rank || 'Scholar'}
                                    </p>
                                    <div className={styles['friend-card-stats']}>
                                        <span><i className={`${styles['fa-solid']} ${styles['fa-fire']}`}></i> {friend.streak || 0}🔥</span>
                                        <span><i className={`${styles['fa-solid']} ${styles['fa-bolt']}`}></i> {friend.xp || 0}</span>
                                    </div>
                                    <div className={styles['friend-card-actions']}>
                                        <button className={`${styles['friend-action-btn']} ${styles['duel']}`} onClick={() => handleDuelFriend(friend)}>⚔️ Duel</button>
                                        <button className={`${styles['friend-action-btn']} ${styles['message']}`} onClick={() => setActiveChatFriend(friend)}>💬 Chat</button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className={styles['no-drops-msg']} style={{ gridColumn: '1 / -1', margin: '2rem 0' }}>No friends found.</p>
                        )}
                    </div>
                </div>

                
                <div id="friends-online" className={`${styles['friends-content']} ${activeFriendsTab === 'online' ? '' : styles['hidden-page']}`} style={{ display: activeFriendsTab === 'online' ? 'block' : 'none' }}>
                    <h3 className={styles['section-heading']}>🟢 Online Now</h3>
                    <div className={styles['friends-grid']} id="online-friends-grid">
                        {friendsList.length > 0 ? (
                            friendsList.map(friend => (
                                <div className={styles['friend-card']} key={friend.id}>
                                    <div className={styles['friend-card-header']}>
                                        <img 
                                             src={friend.avatar_url || '/avatars/your-image-name.jpg'} 
                                              alt="Friend Avatar"
                                               style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover' }} 
                                                    />     
                                       </div>
                                    <h4 className={styles['friend-card-name']}>
                                        {friend.first_name} {friend.last_name}
                                    </h4>
                                    <p className={styles['friend-card-level']}>
                                        {friend.rank || 'Scholar'}
                                    </p>
                                    <div className={styles['friend-card-stats']}>
                                        <span><i className={`${styles['fa-solid']} ${styles['fa-fire']}`}></i> {friend.streak || 0}🔥</span>
                                        <span><i className={`${styles['fa-solid']} ${styles['fa-bolt']}`}></i> {friend.xp || 0}</span>
                                    </div>
                                    <div className={styles['friend-card-actions']}>
                                        <button className={`${styles['friend-action-btn']} ${styles['duel']}`} onClick={() => handleDuelFriend(friend)}>⚔️ Duel</button>
                                        <button className={`${styles['friend-action-btn']} ${styles['message']}`} onClick={() => setActiveChatFriend(friend)}>💬 Chat</button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className={styles['no-drops-msg']} style={{ gridColumn: '1 / -1', margin: '2rem 0' }}>No friends are currently online.</p>
                        )}
                    </div>
                </div>

                
                <div id="friends-pending" className={`${styles['friends-content']} ${activeFriendsTab === 'pending' ? '' : styles['hidden-page']}`} style={{ display: activeFriendsTab === 'pending' ? 'block' : 'none' }}>
                    <h3 className={styles['section-heading']}>⏳ Pending Requests</h3>
                    <div className={styles['pending-requests']} id="pending-requests">
                        {isLoadingPending ? (
                            <p className={styles['no-drops-msg']} style={{ margin: '2rem 0' }}>Loading pending requests...</p>
                        ) : pendingRequests && pendingRequests.length > 0 ? (
                            pendingRequests.map(req => (
                                <div className={styles['pending-item']} key={req.friendship_id}>
                                    <img src={req.avatar_url || '/avatars/avatar-1.jpg'} className={styles['pending-avatar']} />
                                    <div className={styles['pending-info']}>
                                        <p className={styles['pending-name']}>{req.username}#{req.user_tag}</p>
                                        <p className={styles['pending-sub']}>Wants to be your friend</p>
                                    </div>
                                    <div className={styles['pending-actions']}>
                                        <button className={styles['accept-btn']} onClick={() => handleAcceptRequest(req.friendship_id)}>✓</button>
                                        <button className={styles['decline-btn']} onClick={() => handleDeclineRequest(req.friendship_id)}>✕</button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className={styles['no-drops-msg']} style={{ margin: '2rem 0' }}>No pending friend requests.</p>
                        )}
                    </div>
                </div>

                
                <div id="friends-add" className={`${styles['friends-content']} ${activeFriendsTab === 'add' ? '' : styles['hidden-page']}`} style={{ display: activeFriendsTab === 'add' ? 'block' : 'none' }}>
                    <div className={styles['add-friend-form']}>
                        <h3 className={styles['section-heading']}>➕ Add New Friend</h3>
                        <div className={styles['add-friend-search']}>
                            <i className={`${styles['fa-solid']} ${styles['fa-magnifying-glass']}`}></i>
                            <input type="text" id="friend-search-input" placeholder="Search by username or email..." />
                        </div>
                        <div className={styles['add-friend-results']} id="add-friend-results">
                            <p className={styles['search-hint']}>Search for friends by username or email address</p>
                        </div>
                        <div className={styles['invite-link-section']}>
                            <h4>🔗 Share Your Profile</h4>
                            <p>Share your unique link to let others find you:</p>
                            <div className={styles['invite-link-box']}>
                                <input type="text" value="brightify.app/invite/felix123" readOnly id="invite-link" />
                                <button onClick={() => { /* TODO: hook up copyInviteLink() */ }}><i className={`${styles['fa-regular']} ${styles['fa-copy']}`}></i> Copy</button>
                            </div>
                        </div>
                    </div>
                </div>

                
              <div className={styles['friends-leaderboard-section']}>
                        <h3 className={styles['section-heading']}>🏆 Friends Leaderboard</h3>
                        <div className={styles['friends-lb-table']}>
                            <div className={styles['lb-header']}>
                                <span>Rank</span>
                                <span>Friend</span>
                                <span>Streak</span>
                                <span>XP</span>
                            </div>
                            {topUsers.map((u, idx) => {
                                let rankClass = '';
                                let rankIcon = idx + 1;
                                
                                if (idx === 0) { rankClass = styles['gold']; rankIcon = '🥇'; }
                                else if (idx === 1) { rankClass = styles['silver']; rankIcon = '🥈'; }
                                else if (idx === 2) { rankClass = styles['bronze']; rankIcon = '🥉'; }
                                else { rankClass = styles['you']; }

                                return (
                                    <div key={idx} className={`${styles['lb-row']} ${rankClass}`}>
                                        <span className={styles['lb-rank']}>{rankIcon}</span>
                                        <span className={styles['lb-user']}>
                                  <img src={getAvatarUrl(u.avatar_seed && u.avatar_seed !== 'default' ? u.avatar_seed : u.first_name || 'anon')} />
                                            {u.first_name || 'Anonymous'}
                                        </span>
                                        <span>{u.streak_count || 0}🔥</span>
                                        <span>{u.xp || 0}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
            </section>

            
            <section id="calendar" className={`${styles['page-section']} ${currentPage === 'calendar' ? styles['fade-in'] : styles['hidden-page']}`}>
                <h2 className={`${styles['section-heading']} ${styles['large']}`}>📅 Study Calendar</h2>
                <Calendar />
            </section>

            
            <section id="achievements" className={`${styles['page-section']} ${currentPage === 'achievements' ? styles['fade-in'] : styles['hidden-page']}`}>
                <h2 className={`${styles['section-heading']} ${styles['large']}`}>🏆 Achievements</h2>
                
                
                <div className={styles['achievement-stats']}>
                    <div className={styles['ach-stat']}>
                        <span className={styles['ach-stat-num']} id="total-badges">8</span>
                        <span className={styles['ach-stat-label']}>Badges Earned</span>
                    </div>
                    <div className={styles['ach-stat']}>
                        <span className={styles['ach-stat-num']} id="total-points">2,450</span>
                        <span className={styles['ach-stat-label']}>Achievement Points</span>
                    </div>
                    <div className={styles['ach-stat']}>
                        <span className={styles['ach-stat-num']} id="completion-rate">35%</span>
                        <span className={styles['ach-stat-label']}>Completion</span>
                    </div>
                </div>

                
                <div className={styles['achievement-categories']}>
                    <button className={`${styles['ach-cat']} ${styles['active']}`} onClick={() => { /* TODO: hook up filterAchievements('all') */ }}>All</button>
                    <button className={styles['ach-cat']} onClick={() => { /* TODO: hook up filterAchievements('streak') */ }}>🔥 Streaks</button>
                    <button className={styles['ach-cat']} onClick={() => { /* TODO: hook up filterAchievements('study') */ }}>📚 Study</button>
                    <button className={styles['ach-cat']} onClick={() => { /* TODO: hook up filterAchievements('social') */ }}>👥 Social</button>
                    <button className={styles['ach-cat']} onClick={() => { /* TODO: hook up filterAchievements('eco') */ }}>🌳 Eco</button>
                </div>

                
                <div className={styles['achievement-grid']} id="achievement-grid">
                    
                    <div className={`${styles['achievement-card']} ${styles['earned']}`} data-category="streak">
                        <div className={styles['ach-icon']}>🔥</div>
                        <div className={styles['ach-info']}>
                            <h4>Week Warrior</h4>
                            <p>Maintain a 7-day streak</p>
                        </div>
                        <div className={`${styles['ach-status']} ${styles['earned-badge']}`}>✓ Earned</div>
                        <div className={styles['ach-points']}>+100 pts</div>
                    </div>
                    <div className={`${styles['achievement-card']} ${styles['earned']}`} data-category="streak">
                        <div className={styles['ach-icon']}>🔥</div>
                        <div className={styles['ach-info']}>
                            <h4>Two Week Titan</h4>
                            <p>Maintain a 14-day streak</p>
                        </div>
                        <div className={`${styles['ach-status']} ${styles['earned-badge']}`}>✓ Earned</div>
                        <div className={styles['ach-points']}>+250 pts</div>
                    </div>
                    <div className={styles['achievement-card']} data-category="streak">
                        <div className={styles['ach-icon']}>🔥</div>
                        <div className={styles['ach-info']}>
                            <h4>Month Master</h4>
                            <p>Maintain a 30-day streak</p>
                        </div>
                        <div className={styles['ach-status']}>🔒 18 days to go</div>
                        <div className={styles['ach-points']}>+500 pts</div>
                    </div>
                    <div className={styles['achievement-card']} data-category="streak">
                        <div className={styles['ach-icon']}>🔥</div>
                        <div className={styles['ach-info']}>
                            <h4>Century Scholar</h4>
                            <p>Maintain a 100-day streak</p>
                        </div>
                        <div className={styles['ach-status']}>🔒 88 days to go</div>
                        <div className={styles['ach-points']}>+2000 pts</div>
                    </div>

                    
                    <div className={`${styles['achievement-card']} ${styles['earned']}`} data-category="study">
                        <div className={styles['ach-icon']}>📚</div>
                        <div className={styles['ach-info']}>
                            <h4>First Steps</h4>
                            <p>Study your first stack</p>
                        </div>
                        <div className={`${styles['ach-status']} ${styles['earned-badge']}`}>✓ Earned</div>
                        <div className={styles['ach-points']}>+50 pts</div>
                    </div>
                    <div className={`${styles['achievement-card']} ${styles['earned']}`} data-category="study">
                        <div className={styles['ach-icon']}>📚</div>
                        <div className={styles['ach-info']}>
                            <h4>Card Collector</h4>
                            <p>Study 100 cards</p>
                        </div>
                        <div className={`${styles['ach-status']} ${styles['earned-badge']}`}>✓ Earned</div>
                        <div className={styles['ach-points']}>+150 pts</div>
                    </div>
                    <div className={styles['achievement-card']} data-category="study">
                        <div className={styles['ach-icon']}>📚</div>
                        <div className={styles['ach-info']}>
                            <h4>Knowledge Seeker</h4>
                            <p>Study 500 cards</p>
                        </div>
                        <div className={styles['ach-status']}>🔒 287 to go</div>
                        <div className={styles['ach-points']}>+400 pts</div>
                    </div>
                    <div className={styles['achievement-card']} data-category="study">
                        <div className={styles['ach-icon']}>🎯</div>
                        <div className={styles['ach-info']}>
                            <h4>Perfect Score</h4>
                            <p>Get 100% on 10 sessions</p>
                        </div>
                        <div className={styles['ach-status']}>🔒 7 to go</div>
                        <div className={styles['ach-points']}>+300 pts</div>
                    </div>

                    
                    <div className={`${styles['achievement-card']} ${styles['earned']}`} data-category="social">
                        <div className={styles['ach-icon']}>🤝</div>
                        <div className={styles['ach-info']}>
                            <h4>Social Butterfly</h4>
                            <p>Add your first friend</p>
                        </div>
                        <div className={`${styles['ach-status']} ${styles['earned-badge']}`}>✓ Earned</div>
                        <div className={styles['ach-points']}>+75 pts</div>
                    </div>
                    <div className={styles['achievement-card']} data-category="social">
                        <div className={styles['ach-icon']}>⚔️</div>
                        <div className={styles['ach-info']}>
                            <h4>Duel Champion</h4>
                            <p>Win 10 duels</p>
                        </div>
                        <div className={styles['ach-status']}>🔒 8 to go</div>
                        <div className={styles['ach-points']}>+350 pts</div>
                    </div>
                    <div className={styles['achievement-card']} data-category="social">
                        <div className={styles['ach-icon']}>👥</div>
                        <div className={styles['ach-info']}>
                            <h4>Study Squad</h4>
                            <p>Create or join a study group</p>
                        </div>
                        <div className={styles['ach-status']}>🔒 Not started</div>
                        <div className={styles['ach-points']}>+200 pts</div>
                    </div>

                    
                    <div className={`${styles['achievement-card']} ${styles['earned']}`} data-category="eco">
                        <div className={styles['ach-icon']}>🌱</div>
                        <div className={styles['ach-info']}>
                            <h4>Green Thumb</h4>
                            <p>Plant your first tree</p>
                        </div>
                        <div className={`${styles['ach-status']} ${styles['earned-badge']}`}>✓ Earned</div>
                        <div className={styles['ach-points']}>+100 pts</div>
                    </div>
                    <div className={styles['achievement-card']} data-category="eco">
                        <div className={styles['ach-icon']}>🌳</div>
                        <div className={styles['ach-info']}>
                            <h4>Forest Guardian</h4>
                            <p>Adopt 5 Philippine trees</p>
                        </div>
                        <div className={styles['ach-status']}>🔒 3 to go</div>
                        <div className={styles['ach-points']}>+500 pts</div>
                    </div>
                    <div className={styles['achievement-card']} data-category="eco">
                        <div className={styles['ach-icon']}>🦜</div>
                        <div className={styles['ach-info']}>
                            <h4>Wildlife Protector</h4>
                            <p>Save an endangered species</p>
                        </div>
                        <div className={styles['ach-status']}>🔒 1 more endangered</div>
                        <div className={styles['ach-points']}>+750 pts</div>
                    </div>
                </div>
            </section>

            
            <section id="challenges" className={`${styles['page-section']} ${currentPage === 'challenges' ? styles['fade-in'] : styles['hidden-page']}`}>
                <h2 className={`${styles['section-heading']} ${styles['large']}`}>🎯 Challenges</h2>
                
                
                <div className={styles['challenge-tabs']}>
                    <button className={`${styles['challenge-tab']} ${styles['active']}`} onClick={() => { /* TODO: hook up switchChallengeTab('daily') */ }}>Daily</button>
                    <button className={styles['challenge-tab']} onClick={() => { /* TODO: hook up switchChallengeTab('weekly') */ }}>Weekly</button>
                    <button className={styles['challenge-tab']} onClick={() => { /* TODO: hook up switchChallengeTab('special') */ }}>Special Events</button>
                </div>

                
                <div id="challenges-daily" className={styles['challenge-content']}>
                    <div className={styles['challenge-timer-banner']}>
                        <i className={`${styles['fa-solid']} ${styles['fa-clock']}`}></i>
                        <span>Resets in <strong id="daily-reset-time">14 hours</strong></span>
                    </div>

                    <div className={styles['challenges-list']}>
                        
                        <div className={`${styles['challenge-card']} ${styles['daily-challenge']} ${styles['completed']}`}>
                            <div className={styles['challenge-progress-ring']}>
                                <svg viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8"/>
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#22c55e" strokeWidth="8"
                                        strokeDasharray="283" strokeDashoffset="0" strokeLinecap="round"
                                        transform="rotate(-90 50 50)"/>
                                </svg>
                                <span className={styles['ring-icon']}>✓</span>
                            </div>
                            <div className={styles['challenge-info']}>
                                <h4>Morning Study</h4>
                                <p>Study before 10 AM</p>
                                <div className={styles['challenge-reward']}>
                                    <span className={styles['reward-xp']}>+50 XP</span>
                                    <span className={styles['reward-wits']}>+25 Wits</span>
                                </div>
                            </div>
                            <div className={`${styles['challenge-status']} ${styles['completed']}`}>Completed!</div>
                        </div>

                        
                        <div className={`${styles['challenge-card']} ${styles['daily-challenge']} ${styles['in-progress']}`}>
                            <div className={styles['challenge-progress-ring']}>
                                <svg viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8"/>
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#5DA9E9" strokeWidth="8"
                                        strokeDasharray="283" strokeDashoffset="70" strokeLinecap="round"
                                        transform="rotate(-90 50 50)"/>
                                </svg>
                                <span className={styles['ring-text']}>6/10</span>
                            </div>
                            <div className={styles['challenge-info']}>
                                <h4>Card Crusher</h4>
                                <p>Study 10 flashcard sessions</p>
                                <div className={styles['challenge-reward']}>
                                    <span className={styles['reward-xp']}>+75 XP</span>
                                    <span className={styles['reward-wits']}>+40 Wits</span>
                                </div>
                            </div>
                            <div className={styles['challenge-status']}>60% Complete</div>
                        </div>

                        
                        <div className={`${styles['challenge-card']} ${styles['daily-challenge']}`}>
                            <div className={styles['challenge-progress-ring']}>
                                <svg viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8"/>
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#8b5cf6" strokeWidth="8"
                                        strokeDasharray="283" strokeDashoffset="200" strokeLinecap="round"
                                        transform="rotate(-90 50 50)"/>
                                </svg>
                                <span className={styles['ring-text']}>3/10</span>
                            </div>
                            <div className={styles['challenge-info']}>
                                <h4>Perfect Streak</h4>
                                <p>Get 90%+ accuracy in 3 sessions</p>
                                <div className={styles['challenge-reward']}>
                                    <span className={styles['reward-xp']}>+100 XP</span>
                                    <span className={styles['reward-wits']}>+50 Wits</span>
                                </div>
                            </div>
                            <div className={styles['challenge-status']}>30% Complete</div>
                        </div>

                        
                        <div className={`${styles['challenge-card']} ${styles['daily-challenge']}`}>
                            <div className={styles['challenge-progress-ring']}>
                                <svg viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8"/>
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#f59e0b" strokeWidth="8"
                                        strokeDasharray="283" strokeDashoffset="255" strokeLinecap="round"
                                        transform="rotate(-90 50 50)"/>
                                </svg>
                                <span className={styles['ring-text']}>1/5</span>
                            </div>
                            <div className={styles['challenge-info']}>
                                <h4>Social Scholar</h4>
                                <p>Challenge a friend to a duel</p>
                                <div className={styles['challenge-reward']}>
                                    <span className={styles['reward-xp']}>+80 XP</span>
                                    <span className={styles['reward-wits']}>+35 Wits</span>
                                </div>
                            </div>
                            <div className={styles['challenge-status']}>Not Started</div>
                        </div>
                    </div>
                </div>

                
                <div id="challenges-weekly" className={`${styles['challenge-content']} ${styles['hidden-page']}`} style={{ display: 'none' }}>
                    <div className={`${styles['challenge-timer-banner']} ${styles['weekly']}`}>
                        <i className={`${styles['fa-solid']} ${styles['fa-calendar-week']}`}></i>
                        <span>Resets in <strong id="weekly-reset-time">5 days</strong></span>
                    </div>

                    <div className={styles['challenges-list']}>
                        <div className={`${styles['challenge-card']} ${styles['weekly-challenge']} ${styles['in-progress']}`}>
                            <div className={styles['challenge-progress-bar']}>
                                <div className={styles['bar-fill']} style={{ width: '65%' }}></div>
                            </div>
                            <div className={styles['challenge-info']}>
                                <h4>Marathon Runner</h4>
                                <p>Study for 10 hours this week</p>
                                <div className={styles['challenge-reward']}>
                                    <span className={styles['reward-xp']}>+300 XP</span>
                                    <span className={styles['reward-wits']}>+150 Wits</span>
                                </div>
                            </div>
                            <div className={styles['challenge-status']}>6.5 / 10 hours</div>
                        </div>

                        <div className={`${styles['challenge-card']} ${styles['weekly-challenge']}`}>
                            <div className={styles['challenge-progress-bar']}>
                                <div className={styles['bar-fill']} style={{ width: '40%' }}></div>
                            </div>
                            <div className={styles['challenge-info']}>
                                <h4>Variety Pack</h4>
                                <p>Study 4 different subjects</p>
                                <div className={styles['challenge-reward']}>
                                    <span className={styles['reward-xp']}>+200 XP</span>
                                    <span className={styles['reward-wits']}>+100 Wits</span>
                                </div>
                            </div>
                            <div className={styles['challenge-status']}>2 / 4 subjects</div>
                        </div>

                        <div className={`${styles['challenge-card']} ${styles['weekly-challenge']}`}>
                            <div className={styles['challenge-progress-bar']}>
                                <div className={styles['bar-fill']} style={{ width: '80%' }}></div>
                            </div>
                            <div className={styles['challenge-info']}>
                                <h4>Accuracy Ace</h4>
                                <p>Maintain 85%+ average all week</p>
                                <div className={styles['challenge-reward']}>
                                    <span className={styles['reward-xp']}>+250 XP</span>
                                    <span className={styles['reward-wits']}>+125 Wits</span>
                                </div>
                            </div>
                            <div className={styles['challenge-status']}>Current: 87%</div>
                        </div>
                    </div>
                </div>

                
                <div id="challenges-special" className={`${styles['challenge-content']} ${styles['hidden-page']}`} style={{ display: 'none' }}>
                    <div className={styles['special-event-banner']}>
                        <span className={styles['event-tag']}>🎉 LIMITED TIME</span>
                        <h3>New Year Challenge</h3>
                        <p>Complete special challenges to earn exclusive rewards!</p>
                    </div>

                    <div className={styles['challenges-list']}>
                        <div className={`${styles['challenge-card']} ${styles['special']} ${styles['in-progress']}`}>
                            <div className={styles['special-badge']}>🎖️</div>
                            <div className={styles['challenge-info']}>
                                <h4>Resolution Runner</h4>
                                <p>Study every day for 7 days straight</p>
                                <div className={`${styles['challenge-reward']} ${styles['special']}`}>
                                    <span className={styles['reward-xp']}>+500 XP</span>
                                    <span className={styles['reward-wits']}>+250 Wits</span>
                                    <span className={styles['reward-special']}>🎁 Rare Avatar</span>
                                </div>
                            </div>
                            <div className={styles['challenge-status']}>4 / 7 days</div>
                        </div>

                        <div className={`${styles['challenge-card']} ${styles['special']}`}>
                            <div className={styles['special-badge']}>🏆</div>
                            <div className={styles['challenge-info']}>
                                <h4>Top of the Class</h4>
                                <p>Reach #1 on the weekly leaderboard</p>
                                <div className={`${styles['challenge-reward']} ${styles['special']}`}>
                                    <span className={styles['reward-xp']}>+1000 XP</span>
                                    <span className={styles['reward-wits']}>+500 Wits</span>
                                    <span className={styles['reward-special']}>👑 Crown Profile Frame</span>
                                </div>
                            </div>
                            <div className={styles['challenge-status']}>Current Rank: #4</div>
                        </div>
                    </div>
                </div>
            </section>

            
            <section id="timer" className={`${styles['page-section']} ${currentPage === 'timer' ? styles['fade-in'] : styles['hidden-page']}`}>
                <h2 className={`${styles['section-heading']} ${styles['large']}`}>🍅 Focus Timer</h2>
                <div className={styles['pomodoro-widget']} style={{ margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
                    <div className={styles['pomodoro-modes']}>
                    <button className={`${styles['pomo-mode']} ${pomoMode === 'focus' ? styles['active'] : ''}`} onClick={() => handlePomoMode('focus')}>Focus</button>
                    <button className={`${styles['pomo-mode']} ${pomoMode === 'short' ? styles['active'] : ''}`} onClick={() => handlePomoMode('short')}>Short Break</button>
                    <button className={`${styles['pomo-mode']} ${pomoMode === 'long' ? styles['active'] : ''}`} onClick={() => handlePomoMode('long')}>Long Break</button>
                </div>
                <div className={styles['pomodoro-timer']}>
                    <svg className={styles['pomo-svg']} viewBox="0 0 200 200">
                        <circle cx="100" cy="100" r="90" fill="none" stroke="#e5e7eb" strokeWidth="12"/>
                        <circle cx="100" cy="100" r="90" fill="none" stroke="#ef4444" strokeWidth="12"
                            strokeDasharray="565" strokeDashoffset={565 - (pomoTimeLeft / getPomoTotalSeconds()) * 565} strokeLinecap="round"
                            transform="rotate(-90 100 100)" id="pomo-circle"/>
                    </svg>
                    <div className={styles['pomo-time']} id="pomo-time-display">{formatTime(pomoTimeLeft)}</div>
                </div>
                <div className={styles['pomodoro-controls']}>
                    <button className={`${styles['pomo-btn']} ${styles['primary']}`} id="pomo-start-btn" onClick={() => isPomoActive ? handleStopAndSaveTimer() : setIsPomoActive(true)}>
                        <i className={`${styles['fa-solid']} ${isPomoActive ? styles['fa-stop'] : styles['fa-play']}`}></i> {isPomoActive ? 'Stop & Save' : 'Start'}
                    </button>
                    <button className={`${styles['pomo-btn']} ${styles['secondary']}`} onClick={resetPomodoro}>
                        <i className={`${styles['fa-solid']} ${styles['fa-rotate-right']}`}></i>
                    </button>
                </div>
                <div className={styles['pomodoro-stats']}>
                    <div className={styles['pomo-stat']}>
                        <span id="pomo-sessions">-</span>
                        <span>Sessions</span>
                    </div>
                    <div className={styles['pomo-stat']}>
                        <span id="pomo-minutes">{pomoMinutesStudied}</span>
                        <span>Minutes</span>
                    </div>
                </div>
                </div>
            </section>
            
            <Calendar currentPage={currentPage} />
            <Achievements currentPage={currentPage} />

            {/* ChatBox Overlay */}
            {activeChatFriend && (
                <div style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    zIndex: 9999,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    borderRadius: '12px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: 'var(--color-royal, #003F91)',
                        padding: '10px 15px',
                        color: 'white',
                        fontWeight: 'bold'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img 
                                src={activeChatFriend.avatar_url || '/avatars/avatar-1.jpg'} 
                                alt="avatar" 
                                style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} 
                            />
                            <span>{activeChatFriend.first_name || activeChatFriend.username || 'Friend'}</span>
                        </div>
                        <button 
                            onClick={() => setActiveChatFriend(null)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '1.2rem'
                            }}
                        >
                            ✕
                        </button>
                    </div>
                    <ChatBox currentUserId={currentUserId} friendId={activeChatFriend.id} />
                </div>
            )}
        </div>
  );
}