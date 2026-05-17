import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function BackButton() {
  const navigate = useNavigate();

  return (
    <button 
      onClick={() => navigate(-1)} 
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'none',
        border: 'none',
        color: '#ffffff', // Assuming dark theme or dark background based on instructions
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 'bold',
        padding: '10px 0',
        marginBottom: '20px'
      }}
    >
      <span>&larr;</span> Back
    </button>
  );
}
