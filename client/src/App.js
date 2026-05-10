import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProfileProvider } from './context/ProfileContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Profiles from './pages/Profiles';
import Home from './pages/Home';
import Watch from './pages/Watch';
import Search from './pages/Search';
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

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/profiles" element={<Profiles />} />
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