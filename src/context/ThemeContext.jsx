import React, { createContext, useState, useEffect, useContext } from 'react';
import supabase from '../supabaseClient';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('custom-new-bg');
  const [particlesEnabled, setParticlesEnabled] = useState(true);
  const [userAvatar, setUserAvatar] = useState('/avatars/avatar-1.jpg');
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) {
          setUserProfile(data);
          if (data.avatar_url) {
            setUserAvatar(data.avatar_url);
          }
        }
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const value = {
    theme,
    setTheme,
    particlesEnabled,
    setParticlesEnabled,
    userAvatar,
    setUserAvatar,
    userProfile,
    setUserProfile
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
