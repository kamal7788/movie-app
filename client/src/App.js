import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProfileProvider } from './context/ProfileContext';
import Login from './pages/Login';
import Profiles from './pages/Profiles';
import Home from './pages/Home';
import Watch from './pages/Watch';
import Search from './pages/Search';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import './App.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;
  return user ? children : <Navigate to="/login" />;
};

const ProfileRoute = ({ children }) => {
  const { profiles } = useAuth();
  return profiles.length > 0 ? children : <Navigate to="/profiles" />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;
  return user?.is_admin ? children : <Navigate to="/" />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/profiles" element={<PrivateRoute><Profiles /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
      <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
      <Route path="/" element={<PrivateRoute><ProfileRoute><Home /></ProfileRoute></PrivateRoute>} />
      <Route path="/watch/:type/:id" element={<PrivateRoute><ProfileRoute><Watch /></ProfileRoute></PrivateRoute>} />
      <Route path="/search" element={<PrivateRoute><ProfileRoute><Search /></ProfileRoute></PrivateRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProfileProvider>
          <AppRoutes />
        </ProfileProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}