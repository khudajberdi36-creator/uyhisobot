import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

export default function QarzdorForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [form, setForm] = useState({
    ism: '', familiya: '', telefon: '', telegram: '', instagram: '', whatsapp: '', manzil: '', izoh: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      axios.get(`/api/qarzdorlar/${id}`).then(r => {
        const { ism, familiya, telefon, telegram, instagram, whatsapp, manzil, izoh } = r.data;
        setForm({ ism: ism||'', familiya: familiya||'', telefon: telefon||'', telegram: telegram||'', instagram: instagram||'', whatsapp: whatsapp||'', manzil: manzil||'', izoh: izoh||'' });
      });
    }
  }, [id, isEdit]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isEdit) {
        await axios.put(`/api/qarzdorlar/${id}`, form);
        navigate(`/qarzdorlar/${id}`);
      } else {
        const res = await axios.post('/api/qarzdorlar', form);
        navigate(`/qarzdorlar/${res.data.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 28 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
          ← Orqaga
        </button>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
          {isEdit ? "✏️ A'zoni tahrirlash" : "➕ Yangi a'zo qo'shish"}
        </h2>
        <p style={{ color: 'var(--text2)', fontSize: 13 }}>Aloqa ma'lumotlarini to'liq to'ldiring</p>
      </div>

      <div className="table-card" style={{ padding: 28 }}>
        {error && <div className="error-msg">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
              👤 Shaxsiy ma'lumotlar
            </h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Ism *</label>
                <input name="ism" value={form.ism} onChange={handleChange}
                  className="form-input" placeholder="Alisher" required />
              </div>
              <div className="form-group">
                <label className="form-label">Familiya</label>
                <input name="familiya" value={form.familiya} onChange={handleChange}
                  className="form-input" placeholder="Karimov" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Manzil</label>
              <input name="manzil" value={form.manzil} onChange={handleChange}
                className="form-input" placeholder="Ko'cha, mahalla, shahar" />
            </div>
          </div>

          <div style={{ marginBottom: 24, borderTop: '1px solid var(--border)', paddingTop: 24 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
              📞 Aloqa ma'lumotlari
            </h3>

            <div className="form-group">
              <label className="form-label">Telefon raqami *</label>
              <input name="telefon" value={form.telefon} onChange={handleChange}
                className="form-input" placeholder="+998 90 123 45 67" required
                pattern="[\+]?[0-9\s\-\(\)]{7,20}"
                title="+998 90 123 45 67 formatida kiriting" />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" style={{ color: '#229ED9' }}>✈️ Telegram</label>
                <input name="telegram" value={form.telegram} onChange={handleChange}
                  className="form-input" placeholder="@username yoki raqam" />
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                  @username yoki +998901234567
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color: '#25D366' }}>💬 WhatsApp</label>
                <input name="whatsapp" value={form.whatsapp} onChange={handleChange}
                  className="form-input" placeholder="+998 90 123 45 67" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#E1306C' }}>📸 Instagram</label>
              <input name="instagram" value={form.instagram} onChange={handleChange}
                className="form-input" placeholder="@username" />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
            <div className="form-group">
              <label className="form-label">Izoh (ixtiyoriy)</label>
              <textarea name="izoh" value={form.izoh} onChange={handleChange}
                className="form-input" placeholder="Qo'shimcha ma'lumot..."
                rows={3} style={{ resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '12px' }} disabled={loading}>
                {loading ? <span className="spinner" /> : (isEdit ? '✅ Saqlash' : '➕ Qo\'shish')}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
                Bekor qilish
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}