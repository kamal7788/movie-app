import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/auth/verify', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUser(data.user);
            fetchProfiles(token);
          } else {
            localStorage.removeItem('token');
          }
        })
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfiles = async (token) => {
    try {
      const res = await fetch('/api/profiles', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setProfiles(data.profiles || []);
    } catch (err) {
      console.error('Error fetching profiles:', err);
    }
  };

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    await fetchProfiles(data.token);
    return data;
  };

  const register = async (email, password, name) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentProfile');
    setUser(null);
    setProfiles([]);
  };

  const addProfile = async (profile) => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(profile)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setProfiles([...profiles, data.profile]);
    return data.profile;
  };

  const updateProfile = async (id, profile) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/profiles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(profile)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setProfiles(profiles.map(p => p.id === id ? data.profile : p));
    return data.profile;
  };

  const deleteProfile = async (id) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/profiles/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to delete profile');
    setProfiles(profiles.filter(p => p.id !== id));
  };

  return (
    <AuthContext.Provider value={{ user, profiles, loading, login, register, logout, addProfile, updateProfile, deleteProfile }}>
      {children}
    </AuthContext.Provider>
  );
}