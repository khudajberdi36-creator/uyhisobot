import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Qarzdorlar from './pages/Qarzdorlar';
import QarzdorForm from './pages/QarzdorForm';
import QarzdorDetail from './pages/QarzdorDetail';
import MuddatiOtgan from './pages/MuddatiOtgan';
import AdminPanel from './pages/AdminPanel';
import Sozlamalar from './pages/Sozlamalar';
import Mahsulotlar from './pages/Mahsulotlar';
import KirishTarixi from './pages/KirishTarixi';
import NaxtSotuv from './pages/NaxtSotuv';
import Byudjet from './pages/Byudjet';

import axios from 'axios';
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" toastOptions={{ style: { background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border2)' } }} />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="qarzdorlar" element={<Qarzdorlar />} />
              <Route path="qarzdorlar/yangi" element={<QarzdorForm />} />
              <Route path="qarzdorlar/:id" element={<QarzdorDetail />} />
              <Route path="qarzdorlar/:id/tahrirlash" element={<QarzdorForm />} />
              <Route path="muddati-otgan" element={<MuddatiOtgan />} />
              <Route path="mahsulotlar" element={<Mahsulotlar />} />
              <Route path="byudjet" element={<Byudjet />} />
              <Route path="admin" element={<AdminPanel />} />
              <Route path="kirish-tarixi" element={<KirishTarixi />} />
              <Route path="sozlamalar" element={<Sozlamalar />} />
              <Route path="naxt-sotuv" element={<NaxtSotuv />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}