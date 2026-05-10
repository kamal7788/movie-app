import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user, createUser, deleteUser, resetUserPassword, getAllUsers } = useAuth();
  const navigate = useNavigate();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.is_admin) {
      navigate('/');
      return;
    }
    loadUsers();
  }, [user, navigate, getAllUsers]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      await createUser(newUser);
      setSuccess('User created successfully');
      setNewUser({ email: '', password: '', name: '' });
      setShowAddForm(false);
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Are you sure you want to delete this user? All profiles and watchlist will be deleted.')) {
      return;
    }
    
    try {
      await deleteUser(id);
      setSuccess('User deleted successfully');
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResetPassword = async (id) => {
    const newPassword = prompt('Enter new password for this user:');
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    
    try {
      await resetUserPassword(id, newPassword);
      alert('Password reset successfully');
    } catch (err) {
      alert('Failed to reset password: ' + err.message);
    }
  };

  if (user?.is_admin !== true) {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem 0' }}>
      <div className="container">
        <button 
          onClick={() => navigate('/')}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: 'var(--text-muted)', 
            cursor: 'pointer',
            marginBottom: '2rem',
            fontSize: '1rem'
          }}>
          ← Back to Home
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ 
            fontFamily: "'Bebas Neue', sans-serif", 
            fontSize: '2.5rem', 
            color: 'var(--primary)',
            letterSpacing: '2px'
          }}>
            Admin Panel
          </h1>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn"
            style={{ maxWidth: '200px' }}
          >
            {showAddForm ? 'Cancel' : '+ Add User'}
          </button>
        </div>

        {error && (
          <div style={{ 
            background: 'rgba(229, 9, 20, 0.1)', 
            color: 'var(--primary)', 
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '1rem'
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
            marginBottom: '1rem'
          }}>
            {success}
          </div>
        )}

        {showAddForm && (
          <div className="auth-card" style={{ maxWidth: '500px', marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Add New User</h2>
            <form onSubmit={handleAddUser}>
              <div className="form-group">
                <label>Name</label>
                <input 
                  type="text" 
                  value={newUser.name} 
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  value={newUser.email} 
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input 
                  type="password" 
                  value={newUser.password} 
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  required 
                  minLength={6}
                />
              </div>
              <button type="submit" className="btn">Create User</button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="empty-state"><div className="spinner"></div></div>
        ) : (
          <div style={{ 
            background: 'var(--surface)', 
            borderRadius: '12px', 
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Email</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Profiles</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Admin</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem' }}>{u.name}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{u.email}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>{u.profile_count}/5</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {u.is_admin ? (
                        <span style={{ color: 'var(--primary)' }}>✓</span>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleResetPassword(u.id)}
                        style={{ 
                          background: 'var(--surface-hover)', 
                          border: 'none', 
                          color: 'var(--text)', 
                          padding: '0.5rem 1rem', 
                          borderRadius: '6px',
                          cursor: 'pointer',
                          marginRight: '0.5rem'
                        }}
                      >
                        Reset Password
                      </button>
                      {!u.is_admin && (
                        <button 
                          onClick={() => handleDeleteUser(u.id)}
                          style={{ 
                            background: 'var(--primary)', 
                            border: 'none', 
                            color: 'white', 
                            padding: '0.5rem 1rem', 
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}