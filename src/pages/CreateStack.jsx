import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import toast from 'react-hot-toast';

export default function CreateStack() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [gameMode, setGameMode] = useState('Multiple Choice');
  const [cards, setCards] = useState([{ term: '', definition: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddCard = () => {
    setCards([...cards, { term: '', definition: '' }]);
  };

  const handleRemoveCard = (index) => {
    if (cards.length <= 1) return;
    const newCards = [...cards];
    newCards.splice(index, 1);
    setCards(newCards);
  };

  const handleCardChange = (index, field, value) => {
    const newCards = [...cards];
    newCards[index][field] = value;
    setCards(newCards);
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a stack title.');
      return;
    }

    const invalidCard = cards.find(c => !c.term.trim() || !c.definition.trim());
    if (invalidCard) {
      toast.error('All cards must have both a question (term) and an answer (definition).');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      // 1. Insert Stack
      const { data: stackData, error: stackError } = await supabase
        .from('stacks')
        .insert({
          title: title.trim(),
          user_id: user.id,
          mode: gameMode
        })
        .select()
        .single();

      if (stackError) throw stackError;

      // 2. Prepare Cards
      const flashcardsToInsert = cards.map(c => ({
        stack_id: stackData.id,
        term: c.term.trim(),
        definition: c.definition.trim()
      }));

      // 3. Bulk Insert Cards
      const { error: cardsError } = await supabase
        .from('flashcards')
        .insert(flashcardsToInsert);

      if (cardsError) throw cardsError;

      toast.success('Stack Published!');
      navigate('/dashboard');
    } catch (err) {
      toast.error('Failed to create stack: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#fff',
      padding: '4rem 2rem',
      fontFamily: "'Poppins', sans-serif"
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '1.5rem',
        padding: '3rem',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
      }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '2rem', textAlign: 'center' }}>
          Create New Stack
        </h1>
        
        <form onSubmit={handlePublish}>
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1', fontWeight: 'bold' }}>Stack Title</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., General Chemistry 101"
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '1rem'
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1', fontWeight: 'bold' }}>Game Mode</label>
              <select 
                value={gameMode}
                onChange={(e) => setGameMode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                <option value="Multiple Choice">Multiple Choice</option>
                <option value="Spelling">Spelling</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#94a3b8' }}>Cards</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {cards.map((card, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'center',
                  backgroundColor: 'rgba(15, 23, 42, 0.5)',
                  padding: '1.5rem',
                  borderRadius: '1rem',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>Question (Term)</label>
                    <input 
                      type="text" 
                      value={card.term}
                      onChange={(e) => handleCardChange(idx, 'term', e.target.value)}
                      placeholder="e.g., What is the powerhouse of the cell?"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        backgroundColor: 'rgba(30, 41, 59, 0.8)',
                        color: '#fff',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>Answer (Definition)</label>
                    <input 
                      type="text" 
                      value={card.definition}
                      onChange={(e) => handleCardChange(idx, 'definition', e.target.value)}
                      placeholder="e.g., Mitochondria"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        backgroundColor: 'rgba(30, 41, 59, 0.8)',
                        color: '#fff',
                        outline: 'none'
                      }}
                    />
                  </div>
                  {cards.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => handleRemoveCard(idx)}
                      style={{
                        marginTop: '1.5rem',
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '1.5rem',
                        padding: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      title="Remove Card"
                    >
                      ✖
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            <button 
              type="button"
              onClick={handleAddCard}
              style={{
                marginTop: '1.5rem',
                width: '100%',
                padding: '1rem',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '2px dashed rgba(59, 130, 246, 0.5)',
                color: '#60a5fa',
                borderRadius: '1rem',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'}
            >
              + Add Card
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button 
              type="button"
              onClick={() => navigate('/dashboard')}
              style={{
                padding: '1rem 2rem',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#cbd5e1',
                borderRadius: '0.75rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '1rem 3rem',
                background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                border: 'none',
                color: '#fff',
                borderRadius: '0.75rem',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)'
              }}
            >
              {isSubmitting ? 'Publishing...' : 'Publish Stack'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
