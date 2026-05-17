import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useSpring } from "framer-motion";
import "./GameFeelSimulator.css"; 

// ─── Web Audio API ────────────────────────────────────────────────────────────
const getAudioContext = (() => {
  let ctx = null;
  return () => {
    if (!ctx || ctx.state === "closed") {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };
})();

const playTypeSound = () => {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  } catch (_) {}
};

const playErrorSound = () => {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(55, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.22);
  } catch (_) {}
};

const playCritSound = () => {
  try {
    const ctx = getAudioContext();
    const notes = [261.63, 329.63, 392.0, 523.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "triangle";
      const t = ctx.currentTime + i * 0.085;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  } catch (_) {}
};

// ─── Floating Damage ──────────────────────────────────────────────────────────
const DamageFloat = ({ id, label, colorClass, x, y, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 1100);
    return () => clearTimeout(t);
  }, [onDone]);

  const colorMap = {
    "text-red-400": "#f87171",
    "text-yellow-300": "#fde047"
  };

  return (
    <motion.div
      className="gfs-abs-fill gfs-pointer-none gfs-z-30"
      style={{
        left: x, top: y, fontSize: "1.1rem", fontWeight: 900,
        color: colorMap[colorClass] || "#fff",
        textShadow: "0 2px 10px rgba(0,0,0,0.95), 0 0 20px currentColor",
        letterSpacing: "0.05em", whiteSpace: "nowrap"
      }}
      initial={{ opacity: 1, y: 0, scale: 0.7 }}
      animate={{ opacity: 0, y: -52, scale: 1.2 }}
      transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
    >
      {label}
    </motion.div>
  );
};

// ─── Sprites ──────────────────────────────────────────────────────────────────
const WizardSprite = ({ isRunning, isHurt }) => (
  <div className="gfs-sprite-col">
    <motion.div
      className="gfs-sprite-emoji"
      animate={isHurt ? { x: [-5, 5, -5, 5, 0], rotate: [-10, 10, -10, 10, 0], scale: [1, 1.1, 1] } : isRunning ? { y: [0, -5, 0] } : { y: [-2, 2, -2] }}
      transition={isHurt ? { duration: 0.28, ease: "easeInOut" } : isRunning ? { repeat: Infinity, duration: 0.32, ease: "easeInOut" } : { repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
      style={{ filter: isHurt ? "drop-shadow(0 0 12px #ef4444) brightness(1.4)" : "drop-shadow(0 0 8px #818cf8)" }}
    >
      🧙
    </motion.div>
    <span className="gfs-sprite-label" style={{ color: "#818cf8" }}>WIZARD</span>
  </div>
);

const BeeSprite = ({ isAngry, isHit, hp }) => {
  const isEnraged = hp <= 2;
  const currentFilter = isHit ? "drop-shadow(0 0 18px #fff) brightness(3)" : isAngry ? "drop-shadow(0 0 16px #f59e0b) brightness(1.3)" : isEnraged ? "drop-shadow(0 0 14px #ef4444) brightness(1.5)" : "drop-shadow(0 0 6px #fbbf24)";
  const idleDuration = isEnraged ? 0.8 : 2.2;

  return (
    <div className="gfs-sprite-col">
      <motion.div
        className="gfs-sprite-emoji"
        animate={isHit ? { scale: [1, 0.8, 1.2, 0.9, 1], rotate: [-8, 8, -6, 6, 0] } : isAngry ? { scale: [1, 1.3, 1.1], rotate: [-5, 5, -5, 5, 0] } : { y: [-2, 2, -2] }}
        transition={isHit ? { duration: 0.5, ease: "easeInOut" } : isAngry ? { duration: 0.35 } : { repeat: Infinity, duration: idleDuration, ease: "easeInOut" }}
        style={{ filter: currentFilter, transform: "scaleX(-1)", transition: "filter 0.15s ease" }}
      >
        🐝
      </motion.div>
      <span
        className="gfs-sprite-label"
        style={{
          color: isEnraged ? "#ef4444" : "#fbbf24",
          textShadow: isEnraged ? "0 0 8px #ef4444" : "none",
          transition: "color 0.3s ease, text-shadow 0.3s ease",
        }}
      >
        {isEnraged ? "⚡ ENRAGED ⚡" : "BOSS BEE"}
      </span>
    </div>
  );
};

// ─── Health Bar ───────────────────────────────────────────────────────────────
const HealthBar = ({ current, max, color, label, icon }) => {
  const pct = Math.max(0, current / max) * 100;
  const barColor = color === "player" ? pct > 50 ? "#34d399" : pct > 25 ? "#facc15" : "#ef4444" : pct > 50 ? "#fbbf24" : pct > 25 ? "#f97316" : "#dc2626";
  const glowColor = color === "player" ? "rgba(52,211,153,0.65)" : "rgba(251,191,36,0.65)";

  return (
    <div className="gfs-health-bar-wrapper">
      <div className="gfs-health-header">
        <span className="gfs-health-label">{icon} {label}</span>
        <motion.span key={current} className="gfs-health-value" initial={{ scale: 1.5, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 400, damping: 18 }}>
          {current}/{max}
        </motion.span>
      </div>
      <div className="gfs-health-track" style={{ background: "rgba(15,23,42,0.8)", boxShadow: "inset 0 2px 6px rgba(0,0,0,0.6)" }}>
        <motion.div className="gfs-health-fill" initial={false} animate={{ width: `${pct}%`, backgroundColor: barColor }} transition={{ type: "spring", stiffness: 180, damping: 22 }} style={{ boxShadow: `0 0 10px ${glowColor}, 0 0 4px ${glowColor}` }} />
      </div>
      <div className="gfs-health-pips">
        {Array.from({ length: max }).map((_, i) => (
          <motion.div key={i} className="gfs-health-pip" animate={{ backgroundColor: i < current ? color === "player" ? "#10b981" : "#f59e0b" : "#1e293b" }} transition={{ duration: 0.3 }} />
        ))}
      </div>
    </div>
  );
};

// ─── Screen Flash ─────────────────────────────────────────────────────────────
const ScreenFlash = ({ color }) => (
  <motion.div
    className="gfs-abs-fill gfs-pointer-none gfs-z-50"
    style={{ borderRadius: "0.75rem", backgroundColor: color }}
    initial={{ opacity: 0.6 }} animate={{ opacity: 0 }} transition={{ duration: 0.5 }}
  />
);

// ─── End Screen ───────────────────────────────────────────────────────────────
const EndScreen = ({ won, onRestart, score }) => (
  <motion.div className="gfs-abs-fill gfs-z-40 gfs-end-screen" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} style={{ background: "rgba(2,6,23,0.93)", backdropFilter: "blur(12px)" }}>
    <motion.div className="gfs-end-emoji" animate={{ rotate: [0, -10, 10, -8, 8, 0], scale: [1, 1.25, 1] }} transition={{ duration: 0.65, delay: 0.15 }}>
      {won ? "🏆" : "💀"}
    </motion.div>
    <h2 className="gfs-end-title" style={{ color: won ? "#facc15" : "#ef4444", textShadow: won ? "0 0 24px #fbbf24" : "0 0 24px #ef4444" }}>
      {won ? "VICTORY!" : "DEFEATED!"}
    </h2>
    <p className="gfs-end-desc">
      {won ? `THE GIANT BEE FALLS · ${score} QUESTIONS ANSWERED` : "THE WIZARD'S KNOWLEDGE WAS NOT ENOUGH"}
    </p>
    <motion.button onClick={onRestart} className="gfs-btn" whileHover={{ scale: 1.05, boxShadow: "0 0 24px rgba(99,102,241,0.55)" }} whileTap={{ scale: 0.96 }} style={{ textShadow: "0 0 8px rgba(165,180,252,0.8)" }}>
      ▶ CHALLENGE AGAIN
    </motion.button>
  </motion.div>
);

// ─── Combo Badge ──────────────────────────────────────────────────────────────
const ComboBadge = ({ comboCount }) => (
  <AnimatePresence>
    {comboCount >= 5 && (
      <motion.div key="combo-badge" initial={{ scale: 0.4, opacity: 0, y: -12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.5, opacity: 0, y: -8 }} transition={{ type: "spring", stiffness: 520, damping: 22 }}>
        <motion.div className="gfs-combo-badge" animate={{ boxShadow: ["0 0 12px rgba(250,204,21,0.7), 0 0 28px rgba(34,211,238,0.4)", "0 0 22px rgba(250,204,21,0.95), 0 0 44px rgba(34,211,238,0.7)", "0 0 12px rgba(250,204,21,0.7), 0 0 28px rgba(34,211,238,0.4)"] }} transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }} style={{ background: "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(8,47,73,0.95))", border: "1px solid rgba(34,211,238,0.6)", color: "#fde047", textShadow: "0 0 12px #fde047, 0 0 24px rgba(34,211,238,0.8)" }}>
          🔥
          <motion.span key={comboCount} initial={{ scale: 1.6, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 500, damping: 18 }}>
            {comboCount}x COMBO!
          </motion.span>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ─── Answer Blanks ────────────────────────────────────────────────────────────
const AnswerBlanks = ({ answer, userInput, isStunned, isWordComplete, isOvercharged }) => {
  const nextIdx = userInput.length;
  const revealedColor = isOvercharged ? "#fde047" : "#34d399";
  const completedColor = isOvercharged ? "#67e8f9" : "#6ee7b7";
  const revealedGlow = isOvercharged ? "0 0 14px rgba(253,224,71,0.9), 0 0 28px rgba(34,211,238,0.6)" : "0 0 10px rgba(52,211,153,0.65)";
  const completedGlow = isOvercharged ? "0 0 18px rgba(253,224,71,0.95), 0 0 38px rgba(34,211,238,0.7)" : "0 0 18px rgba(110,231,183,0.95), 0 0 36px rgba(52,211,153,0.5)";
  const underlineActive = isOvercharged ? ["#f59e0b", "#fde047", "#f59e0b"] : ["#6366f1", "#a78bfa", "#6366f1"];
  const underlineGlow = isOvercharged ? ["0 0 6px #f59e0b", "0 0 14px #fde047", "0 0 6px #f59e0b"] : ["0 0 4px #6366f1", "0 0 12px #a78bfa", "0 0 4px #6366f1"];
  const underlineRevealed = isOvercharged ? "#fde047" : "#34d399";
  const underlineRevGlow = isOvercharged ? "0 0 8px rgba(253,224,71,0.8)" : "0 0 6px rgba(52,211,153,0.4)";
  const underlineCompleted = isOvercharged ? "#67e8f9" : "#6ee7b7";
  const underlineCompGlow = isOvercharged ? "0 0 12px rgba(103,232,249,0.9)" : "0 0 10px rgba(110,231,183,0.8)";

  return (
    <div className="gfs-blanks-container">
      {answer.split("").map((char, idx) => {
        const isRevealed = idx < userInput.length;
        const isNext = idx === nextIdx;

        return (
          <div key={`${answer}-${idx}`} className="gfs-blank-col">
            <motion.div className="gfs-blank-letter-box" initial={false} animate={isWordComplete && isRevealed ? { scale: [1, 1.15, 1], y: [0, -3, 0] } : isRevealed ? { scale: [1.25, 1], opacity: 1 } : {}} transition={isWordComplete ? { duration: 0.45, delay: idx * 0.04, ease: "easeInOut" } : { type: "spring", stiffness: 400, damping: 20 }}>
              {isRevealed ? (
                <span className="gfs-blank-letter" style={{ color: isWordComplete ? completedColor : revealedColor, textShadow: isWordComplete ? completedGlow : revealedGlow, transition: "color 0.2s ease, text-shadow 0.2s ease" }}>
                  {userInput[idx]}
                </span>
              ) : (
                <span className="gfs-blank-letter" style={{ color: "#334155" }}>_</span>
              )}
            </motion.div>

            <motion.div
              className="gfs-blank-underline"
              animate={isWordComplete && isRevealed ? { backgroundColor: underlineCompleted, boxShadow: underlineCompGlow } : isNext && !isStunned ? { backgroundColor: underlineActive, boxShadow: underlineGlow } : isRevealed ? { backgroundColor: underlineRevealed, boxShadow: underlineRevGlow } : { backgroundColor: "#334155", boxShadow: "none" }}
              transition={isNext && !isWordComplete ? { repeat: Infinity, duration: 1.1, ease: "easeInOut" } : { duration: 0.2 }}
            />
          </div>
        );
      })}
    </div>
  );
};

// ─── Loading State ────────────────────────────────────────────────────────────
const LoadingState = () => (
  <div className="gfs-wrapper">
    <div className="gfs-container">
      <div className="gfs-title-container">
        <h1 className="gfs-main-title" style={{ backgroundImage: "linear-gradient(130deg, #a5b4fc, #e879f9, #fb923c)" }}>FILL IN THE BLANKS</h1>
        <p className="gfs-subtitle">⚔ Identification Boss Battle ⚔</p>
      </div>

      <motion.div className="gfs-loading-card" style={{ background: "linear-gradient(175deg, #0f172a 0%, #1e293b 55%, #0f172a 100%)" }} animate={{ boxShadow: ["0 0 30px rgba(99,102,241,0.15), 0 0 60px rgba(168,85,247,0.08)", "0 0 60px rgba(99,102,241,0.35), 0 0 100px rgba(168,85,247,0.18)", "0 0 30px rgba(99,102,241,0.15), 0 0 60px rgba(168,85,247,0.08)"], borderColor: ["rgba(99,102,241,0.4)", "rgba(168,85,247,0.7)", "rgba(99,102,241,0.4)"] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
        <motion.div style={{ fontSize: "3.75rem", filter: "drop-shadow(0 0 16px #818cf8)" }} animate={{ y: [-4, 4, -4], rotate: [-5, 5, -5] }} transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}>
          🧙
        </motion.div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
          <p style={{ color: "#a5b4fc", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.1em", fontSize: "0.875rem", margin: 0 }}>AWAITING QUESTIONS...</p>
          <div className="gfs-dot-row">
            {[0, 1, 2].map((i) => (
              <motion.div key={i} className="gfs-dot" animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }} transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2, ease: "easeInOut" }} />
            ))}
          </div>
        </div>
        <p style={{ color: "#475569", fontSize: "0.75rem", fontFamily: "monospace", letterSpacing: "0.1em", textAlign: "center", margin: 0 }}>PASS A `questions` PROP TO BEGIN</p>
      </motion.div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GameFeelSimulator({ questions, onBattleEnd }) {
  const hasQuestions = Array.isArray(questions) && questions.length > 0;

  const pickQuiz = useCallback((excludeAnswer = "") => {
    if (!hasQuestions) return { question: "", answer: "" };
    const pool = questions.filter((q) => q.answer !== excludeAnswer);
    const source = pool.length > 0 ? pool : questions;
    return source[Math.floor(Math.random() * source.length)];
  }, [questions, hasQuestions]);

  const [currentQuiz, setCurrentQuiz] = useState({ question: "", answer: "" });
  const [userInput, setUserInput] = useState("");
  const [isStunned, setIsStunned] = useState(false);
  const [playerHp, setPlayerHp] = useState(3);
  const [bossHp, setBossHp] = useState(5);
  const [gameState, setGameState] = useState("playing");
  const [score, setScore] = useState(0);
  const [revealAnswer, setRevealAnswer] = useState(false);
  const [damageFloats, setDamageFloats] = useState([]);
  const [containerShake, setContainerShake] = useState(false);
  const [arenaFlashColor, setArenaFlashColor] = useState(null);
  const [isWordComplete, setIsWordComplete] = useState(false);
  const [isBeeHit, setIsBeeHit] = useState(false);
  const [wrongShake, setWrongShake] = useState(false);
  const [comboCount, setComboCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);

  const isOvercharged = comboCount >= 5;
  const isEnraged = bossHp <= 2;

  const inputRef = useRef(null);
  const trackRef = useRef(null);
  const stunTimerRef = useRef(null);
  const floatIdRef = useRef(0);
  const [trackWidth, setTrackWidth] = useState(500);

  // Audio unlocker logic
  const unlockAudio = useCallback(() => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0;
    osc.start();
    osc.stop(ctx.currentTime + 0.001);
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  }, []);

  useEffect(() => {
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, [unlockAudio]);

  useEffect(() => {
    if (hasQuestions) setCurrentQuiz(pickQuiz());
  }, [hasQuestions, pickQuiz]);

  useEffect(() => {
    const measure = () => { if (trackRef.current) setTrackWidth(trackRef.current.offsetWidth - 130); };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (gameState === "playing") inputRef.current?.focus();
  }, [gameState]);

  useEffect(() => {
    if (gameState === "won" || gameState === "lost") {
      onBattleEnd?.({ score, status: gameState });
    }
  }, [gameState, onBattleEnd, score]);

  const progressRatio = currentQuiz.answer.length > 0 ? userInput.length / currentQuiz.answer.length : 0;
  const wizardX = progressRatio * trackWidth;
  const beeSpringX = useSpring(0, { stiffness: 300, damping: 20 });

  useEffect(() => {
    if (isStunned) beeSpringX.set(-(trackWidth - wizardX + 16));
    else beeSpringX.set(0);
  }, [isStunned, wizardX, trackWidth, beeSpringX]);

  const spawnFloat = useCallback((label, colorClass, x, y) => {
    const id = floatIdRef.current++;
    setDamageFloats((f) => [...f, { id, label, colorClass, x, y }]);
  }, []);
  const removeFloat = useCallback((id) => {
    setDamageFloats((f) => f.filter((fl) => fl.id !== id));
  }, []);


  const loadNextQuiz = useCallback((currentAnswer) => {
    setCurrentQuiz(pickQuiz(currentAnswer));
    setUserInput("");
    setRevealAnswer(false);
    setIsWordComplete(false);
    setIsStunned(false);
    setTimeLeft(10);
  }, [pickQuiz]);

  const handleChange = useCallback((e) => {
    if (gameState !== "playing" || isStunned) { e.target.value = userInput; return; }
    const raw = e.target.value;
    if (raw.length < userInput.length) { e.target.value = userInput; return; }
    const newChar = raw.slice(userInput.length).slice(-1).toUpperCase();
    if (!newChar) return;

    const nextIdx = userInput.length;
    const expected = currentQuiz.answer[nextIdx];

    if (newChar === expected) {
      setComboCount((c) => c + 1);
      playTypeSound();
      const next = userInput + newChar;
      setUserInput(next);

      if (next === currentQuiz.answer) {
        const newBossHp = bossHp - 1;
        setBossHp(newBossHp);
        setScore((s) => s + 1);
        playCritSound();

        spawnFloat("-1 BOSS HP", "text-yellow-300", "62%", "32%");
        setIsWordComplete(true);
        setIsBeeHit(true);
        setTimeout(() => setIsBeeHit(false), 550);

        setArenaFlashColor(isOvercharged ? "rgba(34,211,238,0.22)" : "rgba(251,191,36,0.22)");
        setTimeout(() => setArenaFlashColor(null), 400);

        if (newBossHp <= 0) {
          setTimeout(() => setGameState("won"), 400);
        } else {
          setTimeout(() => loadNextQuiz(currentQuiz.answer), 600);
        }
      }
    } else {
      setComboCount(0);
      playErrorSound();
      e.target.value = userInput;
      const newPlayerHp = playerHp - 1;
      setPlayerHp(newPlayerHp);
      setIsStunned(true);

      spawnFloat("-1 HP", "text-red-400", "14%", "28%");
      setContainerShake(true);
      setTimeout(() => setContainerShake(false), 320);
      setArenaFlashColor("rgba(185,28,28,0.28)");
      setTimeout(() => setArenaFlashColor(null), 500);
      setWrongShake(true);
      setTimeout(() => setWrongShake(false), 350);

      clearTimeout(stunTimerRef.current);
      stunTimerRef.current = setTimeout(() => {
        setIsStunned(false);
        if (newPlayerHp <= 0) {
          setRevealAnswer(true);
          setTimeout(() => setGameState("lost"), 900);
        }
      }, 500);
    }
  }, [gameState, isStunned, userInput, currentQuiz, bossHp, playerHp, isOvercharged, spawnFloat, loadNextQuiz]);
  useEffect(() => {
    let timer;
    if (gameState === "playing" && !isStunned && !isWordComplete && timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [gameState, isStunned, isWordComplete, timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && gameState === "playing" && !isWordComplete && !isStunned) {
      // ⚡ CRITICAL FIX: Instantly change timeLeft to -1 so this effect ONLY runs once!
      setTimeLeft(-1); 
      
      setComboCount(0);
      setRevealAnswer(true); // Show them the answer
      setIsStunned(true);    // Freeze input
      playErrorSound();

      const newHp = playerHp - 1;
      setPlayerHp(newHp);
      spawnFloat("-1 HP (TIME)", "text-red-400", "14%", "28%");
      
      setContainerShake(true);
      setTimeout(() => setContainerShake(false), 320);
      setArenaFlashColor("rgba(185,28,28,0.28)");
      setTimeout(() => setArenaFlashColor(null), 500);
      setWrongShake(true);
      setTimeout(() => setWrongShake(false), 350);

      clearTimeout(stunTimerRef.current);

      if (newHp <= 0) {
        // Player died: Wait 1.5s so they see the answer, then show Defeat screen
        stunTimerRef.current = setTimeout(() => setGameState("lost"), 1500);
      } else {
        // Player survived: Wait 2.5s so they can read the answer, then move on
        stunTimerRef.current = setTimeout(() => {
          if (questions && questions.length <= 1) {
            // If it's a 1-card deck, just reset the board
            setUserInput("");
            setIsStunned(false);
            setRevealAnswer(false);
            setTimeLeft(10);
          } else {
            // Load next question (ensure loadNextQuiz resets timeLeft to 10 inside its own definition)
            loadNextQuiz(currentQuiz.answer);
          }
        }, 2500);
      }
    }
  }, [timeLeft, gameState, isWordComplete, isStunned, playerHp, questions, currentQuiz.answer, loadNextQuiz, spawnFloat]);

  const handleRestart = () => {
    setCurrentQuiz(pickQuiz());
    setUserInput("");
    setIsStunned(false);
    setPlayerHp(3);
    setBossHp(5);
    setScore(0);
    setDamageFloats([]);
    setRevealAnswer(false);
    setIsWordComplete(false);
    setIsBeeHit(false);
    setComboCount(0);
    setTimeLeft(10);
    setGameState("playing");
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const trailBackground = isOvercharged ? "linear-gradient(90deg, #f59e0b, #fde047, #22d3ee)" : "linear-gradient(90deg, #4f46e5, #a855f7)";
  const trailGlow = isOvercharged ? "0 0 14px #fde047, 0 0 28px rgba(34,211,238,0.5)" : "0 0 10px #818cf8, 0 0 20px rgba(129,140,248,0.3)";

  if (!hasQuestions) return <LoadingState />;

  return (
    <div className="gfs-wrapper" onClick={() => gameState === "playing" && inputRef.current?.focus()}>
      <input ref={inputRef} type="text" onChange={handleChange} onBlur={() => { if (gameState === "playing") setTimeout(() => inputRef.current?.focus(), 40); }} style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }} autoFocus inputMode="text" autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} data-form-type="other" tabIndex={-1} aria-hidden="true" />

      <div className="gfs-container">
        <button 
          onClick={() => onBattleEnd?.({ score, status: "quit" })}
          style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 100, padding: '8px 16px', background: 'rgba(15, 23, 42, 0.8)', color: '#fff', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer', fontFamily: 'monospace' }}
        >
          ← Quit Battle
        </button>
        <div className="gfs-title-container">
          <h1 className="gfs-main-title" style={{ backgroundImage: "linear-gradient(130deg, #6ee7b7, #3b82f6)" }}>BRIGHTIFY ARENA</h1>
          <p className="gfs-subtitle">⚔ Identification Boss Battle ⚔</p>
        </div>

        <motion.div
          className="gfs-arena-card"
          animate={containerShake ? { x: [0, -10, 10, -10, 10, -6, 6, 0], borderColor: ["#334155", "#991b1b", "#334155"] } : { x: 0, borderColor: isEnraged ? "rgba(185,28,28,0.5)" : "#334155" }}
          transition={containerShake ? { duration: 0.3, ease: "easeInOut" } : { duration: 0.25 }}
          style={{ background: "linear-gradient(175deg, #0f172a 0%, #1e293b 55%, #0f172a 100%)", boxShadow: isOvercharged ? "0 0 70px rgba(250,204,21,0.18), 0 0 120px rgba(34,211,238,0.1), 0 4px 80px rgba(0,0,0,0.7)" : "0 0 70px rgba(99,102,241,0.12), 0 4px 80px rgba(0,0,0,0.7)", transition: "box-shadow 0.4s ease" }}
        >
          <AnimatePresence>
            {arenaFlashColor && <ScreenFlash key={`flash-${arenaFlashColor}-${Date.now()}`} color={arenaFlashColor} />}
          </AnimatePresence>

          <AnimatePresence>
            {isEnraged && (
              <motion.div key="enrage-ring" className="gfs-abs-fill gfs-pointer-none gfs-z-10" style={{ borderRadius: "0.75rem" }} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], boxShadow: ["inset 0 0 0px rgba(185,28,28,0)", "inset 0 0 40px rgba(185,28,28,0.5), 0 0 30px rgba(185,28,28,0.35)", "inset 0 0 0px rgba(185,28,28,0)"] }} exit={{ opacity: 0 }} transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut" }} />
            )}
          </AnimatePresence>

          {damageFloats.map((f) => <DamageFloat key={f.id} {...f} onDone={() => removeFloat(f.id)} />)}
          <AnimatePresence>
            {gameState !== "playing" && <EndScreen key={`end-${gameState}`} won={gameState === "won"} onRestart={handleRestart} score={score} />}
          </AnimatePresence>

          <div className="gfs-arena-padding">
            <div className="gfs-health-grid">
              <HealthBar current={playerHp} max={3} color="player" label="Wizard" icon="🧙" />
              <HealthBar current={bossHp} max={5} color="boss" label="Giant Bee" icon="🐝" />
            </div>

            <div className="gfs-score-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <span className="gfs-score-text">QUESTIONS ANSWERED:&nbsp;<motion.span key={score} style={{ color: "#34d399", fontWeight: 700 }} initial={{ scale: 1.6, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 350, damping: 18 }}>{score}</motion.span></span>
                <span style={{ color: timeLeft <= 3 ? '#ef4444' : '#fbbf24', fontWeight: 'bold', fontSize: '1rem', animation: timeLeft <= 3 ? 'pulse 0.5s infinite' : 'none', textShadow: timeLeft <= 3 ? '0 0 10px rgba(239, 68, 68, 0.8)' : '0 0 8px rgba(251, 191, 36, 0.5)' }}>⏳ TIME LEFT: {timeLeft}s</span>
              </div>
              <ComboBadge comboCount={comboCount} />
            </div>

            <motion.div
              ref={trackRef}
              className="gfs-track"
              style={{ background: "linear-gradient(180deg, #020617 0%, #0f172a 55%, #1a2e4a 100%)", boxShadow: isStunned ? "inset 0 0 30px rgba(185,28,28,0.12)" : "none", border: "1px solid" }}
              animate={isEnraged ? { borderColor: ["rgba(185,28,28,0.3)", "rgba(220,38,38,0.9)", "rgba(185,28,28,0.3)"] } : isStunned ? { borderColor: "rgba(185,28,28,0.6)" } : { borderColor: "rgba(51,65,85,0.8)" }}
              transition={isEnraged ? { repeat: Infinity, duration: 0.9, ease: "easeInOut" } : { duration: 0.2 }}
            >
              {[...Array(14)].map((_, i) => <div key={i} className="gfs-star" style={{ left: `${(i * 7.1) + 1}%`, top: `${8 + (i % 5) * 10}%`, opacity: 0.25 + (i % 3) * 0.15 }} />)}
              
              <div className="gfs-track-ground" style={{ background: isOvercharged ? "linear-gradient(90deg, transparent 0%, #f59e0b 20%, #22d3ee 60%, #f59e0b 80%, transparent 100%)" : "linear-gradient(90deg, transparent 0%, #4f46e5 20%, #a855f7 60%, #6366f1 80%, transparent 100%)", filter: isOvercharged ? "drop-shadow(0 0 5px #fde047)" : "drop-shadow(0 0 4px #818cf8)", opacity: 0.5, transition: "background 0.4s ease, filter 0.4s ease" }} />
              <motion.div className="gfs-track-trail" style={{ background: trailBackground, boxShadow: trailGlow, opacity: 0.75, transition: "background 0.4s ease, box-shadow 0.4s ease" }} animate={{ width: `${progressRatio * 100}%` }} transition={{ type: "tween", ease: "linear", duration: 0.08 }} />

              <motion.div className="gfs-wizard-container" animate={{ x: wizardX }} transition={{ type: "tween", ease: "linear", duration: 0.09 }}>
                <WizardSprite isRunning={userInput.length > 0 && !isStunned} isHurt={isStunned} />
              </motion.div>
              <motion.div className="gfs-bee-container" style={{ x: beeSpringX }}>
                <BeeSprite isAngry={isStunned} isHit={isBeeHit} hp={bossHp} />
              </motion.div>

              <AnimatePresence>
                {isStunned && <motion.div key="stun-banner" className="gfs-banner" initial={{ opacity: 0, y: -8, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.8 }} style={{ color: "#f87171", backgroundColor: "rgba(15,23,42,0.85)", border: "1px solid #7f1d1d", textShadow: "0 0 10px #ef4444" }}>⚡ BEE ATTACKS!</motion.div>}
              </AnimatePresence>
              <AnimatePresence>
                {isEnraged && !isStunned && <motion.div key="enrage-banner" className="gfs-banner" initial={{ opacity: 0, y: -8, scale: 0.8 }} animate={{ opacity: [1, 0.6, 1], y: 0, scale: 1, color: ["#ef4444", "#f97316", "#ef4444"], borderColor: ["rgba(185,28,28,0.8)", "rgba(249,115,22,0.8)", "rgba(185,28,28,0.8)"] }} exit={{ opacity: 0, y: -8, scale: 0.8 }} transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut" }} style={{ backgroundColor: "rgba(15,23,42,0.85)", textShadow: "0 0 10px #ef4444" }}>🔥 ENRAGED!</motion.div>}
              </AnimatePresence>
            </motion.div>

            <AnimatePresence mode="wait">
              <motion.div key={`quiz-${currentQuiz.answer}`} className="gfs-quiz-card" style={{ background: "rgba(15,23,42,0.65)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderColor: isWordComplete ? isOvercharged ? "rgba(34,211,238,0.55)" : "rgba(52,211,153,0.45)" : isOvercharged ? "rgba(250,204,21,0.3)" : "rgba(51,65,85,0.8)", boxShadow: isWordComplete ? isOvercharged ? "0 0 28px rgba(34,211,238,0.2), inset 0 1px 0 rgba(255,255,255,0.05)" : "0 0 24px rgba(52,211,153,0.15), inset 0 1px 0 rgba(255,255,255,0.05)" : isOvercharged ? "0 0 18px rgba(250,204,21,0.1), inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4)" : "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4)", transition: "border-color 0.3s ease, box-shadow 0.3s ease" }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.28 }}>
                <motion.div animate={wrongShake ? { x: [-6, 6, -6, 6, -4, 4, 0] } : {}} transition={{ duration: 0.32 }}>
                  <div className="gfs-question-row">
                    <span className="gfs-question-q" style={{ color: "#34d399" }}>Q:</span>
                    <p className="gfs-question-text">{currentQuiz.question}</p>
                  </div>
                </motion.div>

                <div className="gfs-answer-meta">
                  <span style={{ color: "#475569" }}>ANSWER:</span>
                  <span style={{ color: "#64748b" }}>{currentQuiz.answer.length} letters</span>
                  {revealAnswer && <motion.span style={{ color: "#fbbf24", marginLeft: "0.5rem" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>→ {currentQuiz.answer}</motion.span>}
                </div>

                <AnswerBlanks answer={currentQuiz.answer} userInput={userInput} isStunned={isStunned} isWordComplete={isWordComplete} isOvercharged={isOvercharged} />

                <div className="gfs-progress-container">
                  <div className="gfs-progress-track" style={{ background: "rgba(15,23,42,0.8)", boxShadow: "inset 0 1px 4px rgba(0,0,0,0.5)" }}>
                    <motion.div style={{ height: "100%", borderRadius: "9999px", background: isWordComplete ? isOvercharged ? "linear-gradient(90deg, #22d3ee, #67e8f9)" : "linear-gradient(90deg, #10b981, #6ee7b7)" : isOvercharged ? "linear-gradient(90deg, #f59e0b, #fde047)" : "linear-gradient(90deg, #6366f1, #c084fc)", boxShadow: isWordComplete ? isOvercharged ? "0 0 12px rgba(34,211,238,0.7)" : "0 0 10px rgba(110,231,183,0.6)" : isOvercharged ? "0 0 8px rgba(253,224,71,0.6)" : "0 0 6px rgba(192,132,252,0.5)", transition: "background 0.35s ease, box-shadow 0.35s ease" }} animate={{ width: `${progressRatio * 100}%` }} transition={{ type: "spring", stiffness: 280, damping: 28 }} />
                  </div>
                  <div className="gfs-progress-meta-row">
                    <span>{userInput.length} / {currentQuiz.answer.length} letters filled</span>
                    <span>{Math.round(progressRatio * 100)}%</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            <p className="gfs-footer-text">TYPE YOUR ANSWER · CORRECT LETTERS ADVANCE THE WIZARD · WRONG LETTERS TRIGGER THE BEE</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}