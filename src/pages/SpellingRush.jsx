import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import GameFeelSimulator from '../components/GameFeelSimulator (3)';
import BackButton from '../components/BackButton';

export default function SpellingRush() {
  const location = useLocation();
  const navigate = useNavigate();
  const { cards, stackName } = location.state || { cards: [], stackName: '' };

  if (!location.state || cards.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#0f172a', color: '#fff', fontFamily: "'Poppins', sans-serif" }}>
        <h2 style={{ marginBottom: '20px', color: '#fbbf24', fontSize: '1.5rem', textAlign: 'center' }}>No stack selected. Please return to your Study Stacks to start a game.</h2>
        <BackButton />
      </div>
    );
  }

  // Helper function dynamically formatting cards for Spelling Rush
  const generateGameData = (flashcards) => {
    return flashcards.map((item, index) => {
      const qText = item?.definition || item?.question || item?.meaning || item?.back || 'No hint provided.';
      const aText = item?.term || item?.answer || item?.word || item?.front || `WORD${index}`;
      
      return { 
        question: String(qText), 
        answer: String(aText).toUpperCase() 
      };
    });
  };

  const gameQuestions = generateGameData(cards);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', backgroundColor: '#0f172a' }}>
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 100 }}>
        <button 
          onClick={() => navigate('/stacks')}
          style={{ padding: '8px 16px', background: 'rgba(15, 23, 42, 0.8)', color: '#fff', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer', fontFamily: 'monospace' }}
        >
          &larr; Back to Stacks
        </button>
      </div>
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 100, color: '#fde047', fontSize: '1.2rem', fontWeight: 'bold', textShadow: '0 0 10px rgba(253,224,71,0.5)', fontFamily: "'Poppins', sans-serif" }}>
        Playing: {stackName}
      </div>
      <GameFeelSimulator questions={gameQuestions} onBattleEnd={() => navigate('/stacks')} />
    </div>
  );
}
