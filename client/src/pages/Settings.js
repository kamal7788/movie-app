import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { changePassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem' }}>
      <div className="container" style={{ maxWidth: '500px' }}>
        <button 
          onClick={() => navigate('/')}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: 'var(--text-muted)', 
            cursor: 'pointer',
            marginBottom: '2rem',
            fontSize: '1rem'
          }}
          tabIndex={0}>
          ← Back to Home
        </button>

        <div className="auth-card">
          <h1 style={{ 
            fontFamily: "'Bebas Neue', sans-serif", 
            fontSize: '2rem', 
            color: 'var(--primary)', 
            marginBottom: '2rem',
            letterSpacing: '2px'
          }}>
            Account Settings
          </h1>

          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ 
                background: 'rgba(229, 9, 20, 0.1)', 
                color: 'var(--primary)', 
                padding: '1rem', 
                borderRadius: '8px', 
                marginBottom: '1rem',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}
            
            {success && (
              <div style={{ 
                background: 'rgba(46, 204, 113, 0.1)', 
                color: '#2ecc71', 
                padding: '1rem', 
                borderRadius: '8px', 
                marginBottom: '1rem',
                textAlign: 'center'
              }}>
                {success}
              </div>
            )}

            <div className="form-group">
              <label>Current Password</label>
              <input 
                type="password" 
                value={currentPassword} 
                onChange={(e) => setCurrentPassword(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group">
              <label>New Password</label>
              <input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                required 
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
                minLength={6}
              />
            </div>

            <button type="submit" className="btn" disabled={loading} style={{ marginTop: '1rem' }}>
              {loading ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}