import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';

const AVATARS = ['🦊', '🐼', '🦁', '🐯', '🦄', '🐲', '🦅', '🐬'];
const COLORS = ['#e50914', '#1f1f1f', '#4a90d9', '#2ecc71', '#9b59b6', '#f39c12', '#e74c3c', '#16a085'];

export default function Profiles() {
  const { user, profiles, logout, addProfile, deleteProfile } = useAuth();
  const { currentProfile, selectProfile } = useProfile();
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProfile, setNewProfile] = useState({ name: '', avatar: AVATARS[0], color: COLORS[0] });

  const handleSelect = (profile) => {
    selectProfile(profile);
    navigate('/');
  };

  const handleAddProfile = async () => {
    if (!newProfile.name.trim()) return;
    await addProfile(newProfile);
    setShowAddForm(false);
    setNewProfile({ name: '', avatar: AVATARS[0], color: COLORS[0] });
  };

  return (
    <div className="profile-page">
      <h1>Who's Watching?</h1>
      <div className="profile-grid">
        {profiles.map(profile => (
          <div key={profile.id} className="profile-card" onClick={() => handleSelect(profile)}>
            <div className="profile-avatar" style={{ background: profile.color }}>
              {profile.avatar}
            </div>
            <span className="profile-name">{profile.name}</span>
          </div>
        ))}
        {profiles.length < 5 && (
          <div className="profile-card" onClick={() => setShowAddForm(true)}>
            <div className="profile-avatar profile-add">+</div>
            <span className="profile-name">Add Profile</span>
          </div>
        )}
      </div>
      
      {showAddForm && (
        <div className="modal active">
          <div className="modal-backdrop" onClick={() => setShowAddForm(false)}></div>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <button className="modal-close" onClick={() => setShowAddForm(false)}>✕</button>
            <div className="modal-body">
              <h2 className="modal-title">Add Profile</h2>
              <div className="form-group">
                <label>Name</label>
                <input type="text" value={newProfile.name} onChange={(e) => setNewProfile({...newProfile, name: e.target.value})} placeholder="Profile name" />
              </div>
              <div className="form-group">
                <label>Avatar</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {AVATARS.map(avatar => (
                    <div key={avatar} onClick={() => setNewProfile({...newProfile, avatar})} 
                      style={{ 
                        fontSize: '2rem', 
                        padding: '0.5rem', 
                        background: newProfile.avatar === avatar ? 'var(--primary)' : 'var(--surface)',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}>
                      {avatar}
                    </div>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Color</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {COLORS.map(color => (
                    <div key={color} onClick={() => setNewProfile({...newProfile, color})}
                      style={{ 
                        width: '40px', 
                        height: '40px', 
                        background: color, 
                        borderRadius: '8px',
                        cursor: 'pointer',
                        border: newProfile.color === color ? '3px solid white' : 'none'
                      }} />
                  ))}
                </div>
              </div>
              <button className="btn" onClick={handleAddProfile}>Create Profile</button>
            </div>
          </div>
        </div>
      )}

      <div className="profile-actions">
        <button onClick={logout}>Sign Out</button>
      </div>
    </div>
  );
}