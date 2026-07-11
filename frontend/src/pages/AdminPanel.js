import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function formatSum(n) { return Number(n || 0).toLocaleString('uz-UZ'); }

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', full_name: '', dokon_nomi: '', role: 'user' });
  const [passwordModal, setPasswordModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/'); return; }
    load();
  }, []);

  const load = async () => {
    try {
      const [s, u] = await Promise.all([
        axios.get('/api/admin/stats'),
        axios.get('/api/admin/users'),
      ]);
      setStats(s.data);
      setUsers(u.data);
    } catch (err) {
      toast.error('Xatolik');
    } finally {
      setLoading(false);
    }
  };

  const addUser = async () => {
    if (!form.username || !form.password || !form.full_name || !form.dokon_nomi)
      return toast.error('Barcha maydonlarni to\'ldiring');
    try {
      await axios.post('/api/admin/users', form);
      toast.success('Foydalanuvchi qo\'shildi');
      setModal(null);
      setForm({ username: '', password: '', full_name: '', dokon_nomi: '', role: 'user' });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Xatolik'); }
  };

  const deleteUser = async (id, username) => {
    if (!window.confirm(`${username} ni o'chirishga ishonchingiz komilmi?`)) return;
    try {
      await axios.delete(`/api/admin/users/${id}`);
      toast.success("O'chirildi");
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Xatolik'); }
  };

  const changePassword = async () => {
    if (!newPassword || newPassword.length < 6) return toast.error("Parol kamida 6 ta belgi bo'lsin");
    try {
      await axios.put(`/api/admin/users/${passwordModal}/password`, { new_password: newPassword });
      toast.success('Parol yangilandi');
      setPasswordModal(null);
      setNewPassword('');
    } catch (err) { toast.error(err.response?.data?.error || 'Xatolik'); }
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  if (user?.role !== 'admin') return null;

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>👑 Admin panel</h2>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>Barcha foydalanuvchilar statistikasi</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/kirish-tarixi')}>🔐 Kirish tarixi</button>
          <button className="btn btn-primary" onClick={() => setModal('add')}>➕ Foydalanuvchi</button>
        </div>
      </div>

      {/* Statistika */}
      <div className="table-card" style={{ marginBottom: 20 }}>
        <div className="table-header"><h3>📊 Foydalanuvchilar statistikasi</h3></div>
        <table>
          <thead>
            <tr>
              <th>Foydalanuvchi</th>
              <th>Oila/Uy</th>
              <th>A'zolar</th>
              <th>Jami qarz</th>
              <th>To'langan</th>
              <th>Qolgan</th>
            </tr>
          </thead>
          <tbody>
            {stats.map(u => (
              <tr key={u.id}>
                <td><span style={{ fontWeight: 600 }}>{u.full_name}</span><br /><span style={{ fontSize: 12, color: 'var(--text2)' }}>@{u.username}</span></td>
                <td>{u.dokon_nomi}</td>
                <td style={{ textAlign: 'center' }}>{u.jami_qarzdorlar}</td>
                <td><span className="amount amount-red">{formatSum(u.jami_qarz)}</span></td>
                <td><span className="amount amount-green">{formatSum(u.tolov_qilingan)}</span></td>
                <td><span className="amount amount-red">{formatSum(u.qolgan_qarz)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Foydalanuvchilar */}
      <div className="table-card">
        <div className="table-header"><h3>👥 Foydalanuvchilar</h3></div>
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Ism</th>
              <th>Oila/Uy</th>
              <th>Rol</th>
              <th>Harakatlar</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td><code>@{u.username}</code></td>
                <td>{u.full_name}</td>
                <td>{u.dokon_nomi}</td>
                <td><span className={`badge ${u.role === 'admin' ? 'badge-red' : 'badge-green'}`}>{u.role === 'admin' ? '👑 Admin' : '👤 User'}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setPasswordModal(u.id); setNewPassword(''); }}>🔑 Parol</button>
                    {u.id !== user.id && <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u.id, u.username)}>🗑️</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Yangi foydalanuvchi modali */}
      {modal === 'add' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ Yangi foydalanuvchi</h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              {[
                { label: 'Username *', key: 'username', placeholder: 'masalan: ali' },
                { label: 'Parol *', key: 'password', placeholder: 'kamida 6 ta belgi', type: 'password' },
                { label: 'To\'liq ism *', key: 'full_name', placeholder: 'Ali Valiyev' },
                { label: "Oila/Uy nomi *", key: 'dokon_nomi', placeholder: "Aliyevlar oilasi" },
              ].map(f => (
                <div key={f.key} className="form-group">
                  <label className="form-label">{f.label}</label>
                  <input className="form-input" type={f.type || 'text'} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Rol</label>
                <select className="form-input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="user">👤 Oddiy foydalanuvchi</option>
                  <option value="admin">👑 Admin</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Bekor</button>
              <button className="btn btn-primary" onClick={addUser}>Qo'shish</button>
            </div>
          </div>
        </div>
      )}

      {/* Parol o'zgartirish modali */}
      {passwordModal && (
        <div className="modal-overlay" onClick={() => setPasswordModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔑 Parolni yangilash</h3>
              <button className="modal-close" onClick={() => setPasswordModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Yangi parol</label>
                <input className="form-input" type="password" placeholder="Kamida 6 ta belgi" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setPasswordModal(null)}>Bekor</button>
              <button className="btn btn-primary" onClick={changePassword}>Saqlash</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}