import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const ProfileContext = createContext();

export function useProfile() {
  return useContext(ProfileContext);
}

export function ProfileProvider({ children }) {
  const [currentProfile, setCurrentProfile] = useState(null);
  const { user, profiles } = useAuth();

  useEffect(() => {
    const saved = localStorage.getItem('currentProfile');
    if (saved && profiles.find(p => p.id === saved)) {
      setCurrentProfile(profiles.find(p => p.id === saved));
    } else if (profiles.length > 0) {
      selectProfile(profiles[0]);
    }
  }, [profiles]);

  const selectProfile = (profile) => {
    setCurrentProfile(profile);
    localStorage.setItem('currentProfile', profile.id);
  };

  return (
    <ProfileContext.Provider value={{ currentProfile, selectProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}