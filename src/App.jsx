import React from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Duel from './components/Duel';
import Stacks from './pages/Stacks';
import SpellingRush from './pages/SpellingRush';
import Pricing from './pages/Pricing';
import DuelArena from './pages/DuelArena';
import CreateStack from './pages/CreateStack';


function App() {
  return (
    <Router>
      {/* The Toaster configured with your custom CSS theme */}
      <Toaster 
        position="top-center" 
        reverseOrder={false} 
        containerStyle={{
          zIndex: 10000, /* THE CALCULATED FIX: Just 1 layer higher than your 9999 background */
        }}
        toastOptions={{
          // Global default style
          style: {
            fontFamily: "'Poppins', sans-serif",
            fontSize: '13px',
            borderRadius: '14px',
            padding: '14px 16px',
            background: '#111711',
            color: '#e2ede2',
            border: '1px solid rgba(255,255,255,0.07)',
          },
          // 🌿 Success styling
          success: {
            icon: '🌱',
            style: {
              background: '#0a1f10',
              borderLeft: '4px solid #22c55e',
              color: '#bbf7d0',
            },
          },
          // 🔥 Error styling
          error: {
            icon: '🔥',
            style: {
              background: '#1f0a0a',
              borderLeft: '4px solid #ef4444',
              color: '#fecaca',
            },
          },
        }}
      />
      
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/duel-lobby" element={<Duel />} />
        <Route path="/duels" element={<Duel />} />
        <Route path="/stacks" element={<Stacks />} />
        <Route path="/spelling-rush" element={<SpellingRush />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/duel/:id" element={<DuelArena />} />
        <Route path="/create" element={<CreateStack />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
