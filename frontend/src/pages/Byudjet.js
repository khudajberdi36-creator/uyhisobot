import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { useAuth } from '../context/AuthContext';

function formatSum(n) {
  if (!n) return '0';
  return Number(n).toLocaleString('uz-UZ');
}

function formatSumShort(n) {
  const num = Number(n);
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(0) + 'K';
  return String(num);
}

function currentOy() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const CHIQIM_KATEGORIYALAR = [
  { val: 'oziq_ovqat',   label: 'Oziq-ovqat',         emoji: '🍽️', color: '#ef4444' },
  { val: 'kommunal',     label: "Kommunal to'lovlar", emoji: '💡', color: '#f59e0b' },
  { val: 'transport',    label: 'Transport',           emoji: '🚗', color: '#3b82f6' },
  { val: 'talim',        label: "Ta'lim",              emoji: '📚', color: '#8b5cf6' },
  { val: 'kiyim_kechak', label: 'Kiyim-kechak',        emoji: '👕', color: '#ec4899' },
  { val: 'boshqa',       label: 'Boshqa',               emoji: '📦', color: '#64748b' },
];

const KIRIM_MANBALAR = [
  { val: 'maosh',      label: 'Oylik maosh',        emoji: '💼' },
  { val: 'qoshimcha',  label: "Qo'shimcha daromad", emoji: '💵' },
  { val: 'boshqa',     label: 'Boshqa',              emoji: '📥' },
];

function katInfo(val) {
  return CHIQIM_KATEGORIYALAR.find(k => k.val === val) || CHIQIM_KATEGORIYALAR[CHIQIM_KATEGORIYALAR.length - 1];
}
function manbaInfo(val) {
  return KIRIM_MANBALAR.find(k => k.val === val) || KIRIM_MANBALAR[KIRIM_MANBALAR.length - 1];
}

// ─── Kirim qo'shish/tahrirlash modali ─────────────────────────────────────────
function KirimModal({ initial, onClose, onSaved, fullName }) {
  const [form, setForm] = useState(initial || {
    sana: new Date().toISOString().slice(0, 10),
    tavsif: '',
    summa: '',
    manba: 'maosh',
    kim_kiritgan: fullName || '',
    izoh: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.tavsif.trim() || !form.summa) {
      toast.error("Tavsif va summani to'ldiring");
      return;
    }
    setSaving(true);
    try {
      if (initial?.id) {
        const res = await axios.put(`/api/byudjet/kirimlar/${initial.id}`, form);
        onSaved(res.data, true);
      } else {
        const res = await axios.post('/api/byudjet/kirimlar', form);
        onSaved(res.data, false);
      }
      toast.success(initial?.id ? 'Kirim yangilandi' : "Kirim qo'shildi");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Xatolik yuz berdi');
    }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>💰 {initial?.id ? 'Kirimni tahrirlash' : 'Yangi kirim'}</h2>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} style={{ padding: '20px 24px' }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Sana</label>
              <input type="date" className="form-input" value={form.sana}
                onChange={e => setForm({ ...form, sana: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Summa (so'm)</label>
              <input type="number" min="0" step="1000" className="form-input" value={form.summa}
                onChange={e => setForm({ ...form, summa: e.target.value })} placeholder="0" required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tavsif</label>
            <input type="text" className="form-input" value={form.tavsif}
              onChange={e => setForm({ ...form, tavsif: e.target.value })}
              placeholder="Masalan: Iyul oyi maoshi" required />
          </div>

          <div className="form-group">
            <label className="form-label">Manba</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {KIRIM_MANBALAR.map(m => (
                <button
                  type="button"
                  key={m.val}
                  className={`btn btn-sm ${form.manba === m.val ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setForm({ ...form, manba: m.val })}
                >
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Kim kiritgan</label>
            <input type="text" className="form-input" value={form.kim_kiritgan || ''}
              onChange={e => setForm({ ...form, kim_kiritgan: e.target.value })}
              placeholder="Ism" />
          </div>

          <div className="form-group" style={{ marginBottom: 4 }}>
            <label className="form-label">Izoh (ixtiyoriy)</label>
            <input type="text" className="form-input" value={form.izoh || ''}
              onChange={e => setForm({ ...form, izoh: e.target.value })} />
          </div>

          <div className="modal-footer" style={{ padding: '20px 0 0' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Bekor qilish</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saqlanmoqda...' : '💾 Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Chiqim qo'shish/tahrirlash modali ────────────────────────────────────────
function ChiqimModal({ initial, onClose, onSaved, fullName }) {
  const [form, setForm] = useState(initial || {
    sana: new Date().toISOString().slice(0, 10),
    tavsif: '',
    summa: '',
    kategoriya: 'oziq_ovqat',
    kim_kiritgan: fullName || '',
    izoh: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.tavsif.trim() || !form.summa) {
      toast.error("Tavsif va summani to'ldiring");
      return;
    }
    setSaving(true);
    try {
      if (initial?.id) {
        const res = await axios.put(`/api/byudjet/chiqimlar/${initial.id}`, form);
        onSaved(res.data, true);
      } else {
        const res = await axios.post('/api/byudjet/chiqimlar', form);
        onSaved(res.data, false);
      }
      toast.success(initial?.id ? 'Chiqim yangilandi' : "Chiqim qo'shildi");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Xatolik yuz berdi');
    }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>💸 {initial?.id ? 'Chiqimni tahrirlash' : 'Yangi chiqim'}</h2>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} style={{ padding: '20px 24px' }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Sana</label>
              <input type="date" className="form-input" value={form.sana}
                onChange={e => setForm({ ...form, sana: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Summa (so'm)</label>
              <input type="number" min="0" step="1000" className="form-input" value={form.summa}
                onChange={e => setForm({ ...form, summa: e.target.value })} placeholder="0" required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tavsif</label>
            <input type="text" className="form-input" value={form.tavsif}
              onChange={e => setForm({ ...form, tavsif: e.target.value })}
              placeholder="Masalan: Bozordan sabzavot" required />
          </div>

          <div className="form-group">
            <label className="form-label">Kategoriya</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CHIQIM_KATEGORIYALAR.map(k => (
                <button
                  type="button"
                  key={k.val}
                  className={`btn btn-sm ${form.kategoriya === k.val ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setForm({ ...form, kategoriya: k.val })}
                >
                  {k.emoji} {k.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Kim kiritgan</label>
            <input type="text" className="form-input" value={form.kim_kiritgan || ''}
              onChange={e => setForm({ ...form, kim_kiritgan: e.target.value })}
              placeholder="Ism" />
          </div>

          <div className="form-group" style={{ marginBottom: 4 }}>
            <label className="form-label">Izoh (ixtiyoriy)</label>
            <input type="text" className="form-input" value={form.izoh || ''}
              onChange={e => setForm({ ...form, izoh: e.target.value })} />
          </div>

          <div className="modal-footer" style={{ padding: '20px 0 0' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Bekor qilish</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saqlanmoqda...' : '💾 Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Byudjet() {
  const { user } = useAuth();
  const [oy, setOy] = useState(currentOy());
  const [balans, setBalans] = useState(null);
  const [kirimlar, setKirimlar] = useState([]);
  const [chiqimlar, setChiqimlar] = useState([]);
  const [katStat, setKatStat] = useState([]);
  const [oylik, setOylik] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('umumiy'); // umumiy | kirim | chiqim
  const [showKirimModal, setShowKirimModal] = useState(null); // null | {} | row
  const [showChiqimModal, setShowChiqimModal] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      axios.get(`/api/byudjet/balans?oy=${oy}`),
      axios.get(`/api/byudjet/kirimlar?oy=${oy}`),
      axios.get(`/api/byudjet/chiqimlar?oy=${oy}`),
      axios.get(`/api/byudjet/kategoriya-stat?oy=${oy}`),
      axios.get('/api/byudjet/oylik'),
    ]).then(([b, k, c, ks, o]) => {
      setBalans(b.data);
      setKirimlar(k.data);
      setChiqimlar(c.data);
      setKatStat(ks.data);
      setOylik(o.data);
    }).catch(err => {
      console.error('Byudjet yuklash xatosi:', err);
      toast.error("Ma'lumotlarni yuklab bo'lmadi");
    }).finally(() => setLoading(false));
  }, [oy]);

  useEffect(() => { load(); }, [load]);

  const deleteKirim = async (id) => {
    if (!window.confirm("Bu kirimni o'chirishni tasdiqlaysizmi?")) return;
    try {
      await axios.delete(`/api/byudjet/kirimlar/${id}`);
      toast.success("Kirim o'chirildi");
      load();
    } catch { toast.error("O'chirishda xatolik"); }
  };
  const deleteChiqim = async (id) => {
    if (!window.confirm("Bu chiqimni o'chirishni tasdiqlaysizmi?")) return;
    try {
      await axios.delete(`/api/byudjet/chiqimlar/${id}`);
      toast.success("Chiqim o'chirildi");
      load();
    } catch { toast.error("O'chirishda xatolik"); }
  };

  if (loading && !balans) return <div className="loading-page"><div className="spinner" /></div>;

  const qoldiq = balans?.qoldiq ?? 0;

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>💰 Kirim-Chiqim</h2>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>Oilaviy byudjet — kirim, chiqim va qoldiq</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="month"
            className="form-input"
            style={{ width: 160 }}
            value={oy}
            onChange={e => setOy(e.target.value)}
          />
          <button className="btn btn-primary btn-sm" onClick={() => setShowKirimModal({})}>➕ Kirim</button>
          <button className="btn btn-danger btn-sm" onClick={() => setShowChiqimModal({})}>➖ Chiqim</button>
        </div>
      </div>

      {/* Balans kartalari */}
      <div className="stats-grid">
        <div className="stat-card green">
          <div className="stat-icon">💰</div>
          <div className="stat-label">Kirim (bu oy)</div>
          <div className="stat-value">{formatSum(balans?.kirim)}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon">💸</div>
          <div className="stat-label">Chiqim (bu oy)</div>
          <div className="stat-value">{formatSum(balans?.chiqim)}</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon">🧾</div>
          <div className="stat-label">Yangi qarzlar (bu oy)</div>
          <div className="stat-value">{formatSum(balans?.qarz)}</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon">📊</div>
          <div className="stat-label">Oyning qoldig'i</div>
          <div className="stat-value" style={{ color: qoldiq >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {qoldiq >= 0 ? '+' : ''}{formatSum(qoldiq)}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: -12, marginBottom: 20 }}>
        Formula: Kirim − Chiqim − Yangi qarzlar = Qoldiq. Umumiy yopilmagan qarz: <strong>{formatSum(balans?.umumiy_qolgan_qarz)} so'm</strong>
      </div>

      {/* Grafiklar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div className="table-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>📈 Oylik kirim / chiqim (6 oy)</h3>
          {oylik.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text2)', padding: '40px 0', fontSize: 13 }}>Ma'lumot yo'q</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={oylik}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,140,180,0.15)" />
                <XAxis dataKey="oy" tick={{ fontSize: 11, fill: 'var(--text2)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text2)' }} tickFormatter={formatSumShort} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                  formatter={(v, name) => [formatSum(v) + " so'm", name === 'kirim' ? 'Kirim' : 'Chiqim']}
                />
                <Legend formatter={v => v === 'kirim' ? 'Kirim' : 'Chiqim'} wrapperStyle={{ fontSize: 12, color: 'var(--text2)' }} />
                <Bar dataKey="kirim" fill="var(--green)" radius={[4, 4, 0, 0]} name="kirim" />
                <Bar dataKey="chiqim" fill="var(--red)" radius={[4, 4, 0, 0]} name="chiqim" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="table-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>🥧 Kategoriya bo'yicha chiqim</h3>
          {katStat.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text2)', padding: '40px 0', fontSize: 13 }}>Bu oyda chiqim qayd etilmagan</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={katStat} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="jami" nameKey="kategoriya">
                  {katStat.map((entry, i) => (
                    <Cell key={i} fill={katInfo(entry.kategoriya).color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                  formatter={(v, _n, p) => [formatSum(v) + " so'm", katInfo(p.payload.kategoriya).label]}
                />
                <Legend
                  formatter={(v, entry) => katInfo(entry.payload.kategoriya).emoji + ' ' + katInfo(entry.payload.kategoriya).label}
                  wrapperStyle={{ fontSize: 12, color: 'var(--text2)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Tab tugmalari */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={`btn btn-sm ${tab === 'umumiy' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('umumiy')}>📋 Barchasi</button>
        <button className={`btn btn-sm ${tab === 'kirim' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('kirim')}>💰 Kirimlar ({kirimlar.length})</button>
        <button className={`btn btn-sm ${tab === 'chiqim' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('chiqim')}>💸 Chiqimlar ({chiqimlar.length})</button>
      </div>

      {/* Kirimlar jadvali */}
      {(tab === 'umumiy' || tab === 'kirim') && (
        <div className="table-card" style={{ marginBottom: 20 }}>
          <div className="table-header">
            <h3>💰 Kirimlar</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowKirimModal({})}>➕ Qo'shish</button>
          </div>
          {kirimlar.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 20px' }}>
              <div style={{ fontSize: 32 }}>💰</div>
              <h3>Bu oyda kirim yo'q</h3>
              <p>Yangi kirim qo'shish uchun tugmani bosing</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>Tavsif</th>
                  <th>Manba</th>
                  <th>Kim kiritgan</th>
                  <th style={{ textAlign: 'right' }}>Summa</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {kirimlar.map(k => (
                  <tr key={k.id}>
                    <td>{new Date(k.sana).toLocaleDateString('uz-UZ')}</td>
                    <td style={{ fontWeight: 600 }}>{k.tavsif}</td>
                    <td><span className="badge badge-green">{manbaInfo(k.manba).emoji} {manbaInfo(k.manba).label}</span></td>
                    <td style={{ color: 'var(--text2)' }}>{k.kim_kiritgan || '—'}</td>
                    <td style={{ textAlign: 'right' }}><span className="amount amount-green">+{formatSum(k.summa)} so'm</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowKirimModal(k)}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteKirim(k.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Chiqimlar jadvali */}
      {(tab === 'umumiy' || tab === 'chiqim') && (
        <div className="table-card">
          <div className="table-header">
            <h3>💸 Chiqimlar</h3>
            <button className="btn btn-danger btn-sm" onClick={() => setShowChiqimModal({})}>➖ Qo'shish</button>
          </div>
          {chiqimlar.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 20px' }}>
              <div style={{ fontSize: 32 }}>💸</div>
              <h3>Bu oyda chiqim yo'q</h3>
              <p>Yangi chiqim qo'shish uchun tugmani bosing</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>Tavsif</th>
                  <th>Kategoriya</th>
                  <th>Kim kiritgan</th>
                  <th style={{ textAlign: 'right' }}>Summa</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {chiqimlar.map(c => (
                  <tr key={c.id}>
                    <td>{new Date(c.sana).toLocaleDateString('uz-UZ')}</td>
                    <td style={{ fontWeight: 600 }}>{c.tavsif}</td>
                    <td>
                      <span className="badge" style={{ background: katInfo(c.kategoriya).color + '20', color: katInfo(c.kategoriya).color }}>
                        {katInfo(c.kategoriya).emoji} {katInfo(c.kategoriya).label}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text2)' }}>{c.kim_kiritgan || '—'}</td>
                    <td style={{ textAlign: 'right' }}><span className="amount amount-red">-{formatSum(c.summa)} so'm</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowChiqimModal(c)}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteChiqim(c.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showKirimModal && (
        <KirimModal
          initial={showKirimModal.id ? showKirimModal : null}
          fullName={user?.full_name}
          onClose={() => setShowKirimModal(null)}
          onSaved={() => load()}
        />
      )}
      {showChiqimModal && (
        <ChiqimModal
          initial={showChiqimModal.id ? showChiqimModal : null}
          fullName={user?.full_name}
          onClose={() => setShowChiqimModal(null)}
          onSaved={() => load()}
        />
      )}
    </div>
  );
}