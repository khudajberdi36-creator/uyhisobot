import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Token bo'lsa, foydalanuvchini yuklash
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          setUser(res.data);
        })
        .catch(() => {
          localStorage.removeItem('token');
          setUser(null);
          setSessionExpired(true);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // 401 xatolikni ushlab olish (token muddati o'tganda)
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      res => res,
      err => {
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          setUser(null);
          setSessionExpired(true);
        }
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const login = useCallback(async (username, password) => {
    setSessionExpired(false);
    const res = await axios.post('/api/auth/login', { username, password });
    const { token, user: userData } = res.data;
    localStorage.setItem('token', token);
    setUser(userData);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    setSessionExpired(false);
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#0f172a', color: '#94a3b8',
        fontSize: 16, fontFamily: 'sans-serif'
      }}>
        Yuklanmoqda...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, sessionExpired, setSessionExpired }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}