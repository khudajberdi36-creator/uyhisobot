import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

function formatSum(n) {
  return Number(n || 0).toLocaleString('uz-UZ');
}

export default function NaxtSotuv() {
  const [mahsulotlar, setMahsulotlar] = useState([]);
  const [sotuvlar, setSotuvlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingLoading, setSavingLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedSana, setSelectedSana] = useState(new Date().toISOString().split('T')[0]);

  const [form, setForm] = useState({
    mahsulot_id: '',
    miqdor: 1,
    narx: '',
    sana: new Date().toISOString().split('T')[0],
    izoh: ''
  });
  const [selectedMahsulot, setSelectedMahsulot] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      // Avval mahsulotlarni yuklash
      const mRes = await axios.get('/api/mahsulotlar');
      setMahsulotlar(mRes.data);
    } catch (err) {
      console.error('Mahsulotlar xato:', err);
      setLoadError('Mahsulotlarni yuklashda xatolik: ' + (err.response?.data?.error || err.message));
    }
    try {
      // Keyin sotuvlarni yuklash
      const sRes = await axios.get(`/api/qarzlar/naxt-sotuvlar?sana=${selectedSana}`);
      setSotuvlar(sRes.data);
    } catch (err) {
      console.error('Sotuvlar xato:', err);
      setLoadError(prev => prev + ' | Sotuvlarni yuklashda xatolik: ' + (err.response?.data?.error || err.message));
    }
    setLoading(false);
  }, [selectedSana]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleMahsulot = (e) => {
    const m = mahsulotlar.find(m => String(m.id) === e.target.value);
    setSelectedMahsulot(m || null);
    if (m) {
      setForm(f => ({ ...f, mahsulot_id: m.id, narx: String(m.narx) }));
    } else {
      setForm(f => ({ ...f, mahsulot_id: '', narx: '' }));
    }
  };

  const handleSotish = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.mahsulot_id) return setError('Mahsulot tanlang');
    if (!form.miqdor || form.miqdor <= 0) return setError("Miqdor 0 dan katta bo'lishi kerak");
    if (!Number.isInteger(Number(form.miqdor))) return setError("Miqdor butun son bo'lishi kerak");
    if (selectedMahsulot && Number(form.miqdor) > Number(selectedMahsulot.miqdor)) {
      return setError(`Yetarli mahsulot yo'q! Mavjud: ${selectedMahsulot.miqdor} ${selectedMahsulot.birlik}`);
    }
    setSavingLoading(true);
    try {
      const res = await axios.post('/api/qarzlar/naxt-sotuv', {
        mahsulot_id: form.mahsulot_id,
        miqdor: Number(form.miqdor),
        narx: Number(form.narx),
        sana: form.sana,
        izoh: form.izoh
      });
      setSuccess(`✅ ${res.data.mahsulot_nomi} — ${formatSum(res.data.jami)} so'm sotildi. Qolgan: ${res.data.qolgan_miqdor} dona`);
      setForm(f => ({ ...f, mahsulot_id: '', miqdor: 1, narx: '', izoh: '' }));
      setSelectedMahsulot(null);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Serverda xatolik yuz berdi');
    } finally {
      setSavingLoading(false);
    }
  };

  const bugunJami = sotuvlar.reduce((sum, s) => sum + Number(s.jami_summa), 0);
  const jami = selectedMahsulot
    ? Number(form.narx || selectedMahsulot.narx) * Number(form.miqdor || 1)
    : 0;

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>💵 Naxt sotuv</h2>
        <p style={{ color: 'var(--text2)', fontSize: 13 }}>Qarzga emas, naxt pul bilan sotish</p>
      </div>

      {/* Yuklash xatosi — qaysi endpoint ishlamayotganini ko'rsatadi */}
      {loadError && (
        <div style={{
          background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#fca5a5'
        }}>
          🔴 {loadError}
        </div>
      )}

      {/* Statistika */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 12, marginBottom: 20 }}>
        <div className="stat-card green">
          <div className="stat-icon">💵</div>
          <div className="stat-label">Bugungi tushum</div>
          <div className="stat-value" style={{ fontSize: 18 }}>{formatSum(bugunJami)} so'm</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon">🧾</div>
          <div className="stat-label">Sotuvlar soni</div>
          <div className="stat-value">{sotuvlar.length}</div>
        </div>
        <div className="stat-card blue" style={{ '--card-color': '#3b82f6' }}>
          <div className="stat-icon">📦</div>
          <div className="stat-label">Mahsulotlar</div>
          <div className="stat-value">{mahsulotlar.length}</div>
        </div>
      </div>

      {/* Sotuv formasi */}
      <div className="table-card" style={{ padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>🛒 Yangi sotuv</h3>

        {error && <div className="error-msg" style={{ marginBottom: 12 }}>⚠️ {error}</div>}
        {success && (
          <div style={{
            background: '#10b98122', border: '1px solid #10b981',
            borderRadius: 8, padding: '10px 14px', marginBottom: 12,
            color: '#10b981', fontWeight: 600, fontSize: 13
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSotish}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 14 }}>

            <div className="form-group">
              <label className="form-label">📦 Mahsulot *</label>
              {mahsulotlar.length === 0 ? (
                <div style={{ padding: '10px 14px', background: 'var(--bg3)', borderRadius: 8, fontSize: 13, color: 'var(--text2)' }}>
                  ⚠️ Mahsulotlar yo'q. Avval{' '}
                  <a href="/mahsulotlar" style={{ color: 'var(--accent)' }}>Mahsulotlar</a> bo'limidan qo'shing.
                </div>
              ) : (
                <select value={form.mahsulot_id} onChange={handleMahsulot} className="form-input" required>
                  <option value="">— Tanlang —</option>
                  {mahsulotlar.map(m => (
                    <option key={m.id} value={m.id} disabled={Number(m.miqdor) <= 0}>
                      {m.emoji || '📦'} {m.nomi} — {formatSum(m.narx)} so'm
                      {' '}(Qoldi: {m.miqdor} {m.birlik})
                      {Number(m.miqdor) <= 0 ? ' ❌ TUGAGAN' : ''}
                    </option>
                  ))}
                </select>
              )}
              {selectedMahsulot && (
                <div style={{
                  fontSize: 12, marginTop: 5, padding: '6px 10px', borderRadius: 6,
                  background: Number(selectedMahsulot.miqdor) < 5 ? 'rgba(245,158,11,0.1)' : 'var(--bg3)',
                  color: Number(selectedMahsulot.miqdor) < 5 ? '#f59e0b' : 'var(--text3)'
                }}>
                  📦 Mavjud: <strong>{selectedMahsulot.miqdor} {selectedMahsulot.birlik}</strong>
                  {Number(selectedMahsulot.miqdor) < 5 && ' ⚠️ Kam qoldi!'}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">📊 Miqdor (dona) *</label>
              <input
                type="number"
                min="1"
                step="1"
                max={selectedMahsulot ? Math.floor(selectedMahsulot.miqdor) : undefined}
                value={form.miqdor}
                onChange={e => setForm(f => ({ ...f, miqdor: e.target.value }))}
                className="form-input"
                required
              />
              {selectedMahsulot && Number(form.miqdor) > Number(selectedMahsulot.miqdor) && (
                <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>
                  ❌ Yetarli emas! Max: {Math.floor(selectedMahsulot.miqdor)} dona
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">💰 Narx (so'm)</label>
              <input
                type="number"
                min="0"
                value={form.narx}
                onChange={e => setForm(f => ({ ...f, narx: e.target.value }))}
                className="form-input"
                placeholder={selectedMahsulot ? String(selectedMahsulot.narx) : '0'}
              />
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                Bo'sh qoldirsangiz mahsulot narxi ishlatiladi
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">📅 Sana</label>
              <input
                type="date"
                value={form.sana}
                onChange={e => setForm(f => ({ ...f, sana: e.target.value }))}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">📝 Izoh</label>
              <input
                value={form.izoh}
                onChange={e => setForm(f => ({ ...f, izoh: e.target.value }))}
                className="form-input"
                placeholder="Ixtiyoriy..."
              />
            </div>
          </div>

          {selectedMahsulot && (
            <div style={{
              background: 'var(--bg3)', borderRadius: 10, padding: '12px 16px',
              marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                {form.miqdor} × {formatSum(form.narx || selectedMahsulot.narx)} so'm
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981' }}>
                = {formatSum(jami)} so'm
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-success"
            style={{ marginTop: 16, padding: '12px 32px', fontSize: 15 }}
            disabled={savingLoading || !form.mahsulot_id || mahsulotlar.length === 0}
          >
            {savingLoading ? <span className="spinner" /> : '💵 Sotish'}
          </button>
        </form>
      </div>

      {/* Sotuvlar tarixi */}
      <div className="table-card">
        <div className="table-header">
          <h3>📋 Sotuvlar tarixi</h3>
          <input
            type="date"
            value={selectedSana}
            onChange={e => setSelectedSana(e.target.value)}
            className="form-input"
            style={{ width: 'auto', fontSize: 13 }}
          />
        </div>
        {sotuvlar.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
            <p>Bu sana uchun sotuv yo'q</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Mahsulot</th>
                <th>Miqdor</th>
                <th>Narx</th>
                <th>Jami</th>
                <th>Izoh</th>
                <th>Vaqt</th>
              </tr>
            </thead>
            <tbody>
              {sotuvlar.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>
                    {s.emoji || '📦'} {s.mahsulot_nomi}
                  </td>
                  <td>{s.miqdor} {s.birlik}</td>
                  <td>{formatSum(s.narx)} so'm</td>
                  <td>
                    <span className="amount amount-green">
                      {formatSum(s.jami_summa)} so'm
                    </span>
                  </td>
                  <td style={{ color: 'var(--text2)', fontSize: 12 }}>{s.izoh || '—'}</td>
                  <td style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {new Date(s.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ fontWeight: 700, textAlign: 'right', padding: '12px 16px' }}>Jami:</td>
                <td style={{ fontWeight: 800, color: '#10b981', fontSize: 16, padding: '12px 16px' }}>
                  {formatSum(bugunJami)} so'm
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}