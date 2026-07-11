import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { login, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(form.username, form.password);
      if (data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 16
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, margin: '0 auto 16px', boxShadow: '0 8px 32px rgba(99,102,241,0.35)'
          }}>🏪</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Uy Hisobot</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>Qarzlarni oson va qulay boshqaring</p>
        </div>

        <div className="table-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, textAlign: 'center' }}>
            🔐 Tizimga kirish
          </h2>

          {sessionExpired && (
            <div style={{
              background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              color: '#f59e0b', fontSize: 13, fontWeight: 600, textAlign: 'center'
            }}>
              ⏰ Sessiya muddati tugadi. Qayta kiring.
            </div>
          )}

          {error && (
            <div className="error-msg" style={{ marginBottom: 16 }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">FOYDALANUVCHI NOMI</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                className="form-input"
                placeholder="username"
                required
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">PAROL</label>
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="form-input"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: 12, bottom: 10,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text3)', fontSize: 16
                }}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '13px', marginTop: 8, fontSize: 15 }}
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : '🔑 Kirish'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', marginTop: 16 }}>
          🔒 Barcha ma'lumotlar faqat sizga ko'rinadi
        </p>
      </div>
    </div>
  );
}