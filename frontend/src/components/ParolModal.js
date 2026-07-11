import React, { useState, useEffect, useRef } from 'react';

// O'chirishda parol so'rovchi universal modal
// Ishlatilishi:
//   <ParolModal
//     title="Mahsulotni o'chirish"
//     onConfirm={() => deleteItem()}
//     onClose={() => setParolModal(false)}
//   />
// Parol: foydalanuvchi login parolini qayta kiritadi (localStorage token decode emas)
// Eng oddiy yondashuv: maxsus o'chirish paroli "1234" yoki user paroli emas,
// balki app.js da sozlangan DELETE_PIN (default "1234")

const DELETE_PIN = '1234';

export default function ParolModal({ title, subtitle, onConfirm, onClose, danger }) {
  const [parol, setParol] = useState('');
  const [xato, setXato] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleConfirm = async () => {
    if (!parol) return setXato("Parol kiriting");

    // Parolni localStorage-da saqlangan PIN bilan solishtirish
    const pin = localStorage.getItem('delete_pin') || DELETE_PIN;
    if (parol !== pin) {
      setXato("❌ Noto'g'ri parol!");
      setParol('');
      inputRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setXato(err?.response?.data?.error || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ color: danger ? '#ef4444' : 'var(--text)' }}>
            🔒 {title || "O'chirishni tasdiqlang"}
          </h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {subtitle && (
            <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 16 }}>{subtitle}</p>
          )}
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#fca5a5'
          }}>
            ⚠️ Bu amalni ortga qaytarib bo'lmaydi. Davom etish uchun parolni kiriting.
          </div>

          <div className="form-group">
            <label className="form-label">Parol</label>
            <input
              ref={inputRef}
              type="password"
              className="form-input"
              value={parol}
              onChange={e => { setParol(e.target.value); setXato(''); }}
              onKeyDown={e => e.key === 'Enter' && handleConfirm()}
              placeholder="••••"
              style={{ letterSpacing: 4, fontSize: 20, textAlign: 'center' }}
            />
            {xato && (
              <div style={{ color: '#ef4444', fontSize: 12, marginTop: 6, fontWeight: 600 }}>{xato}</div>
            )}
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
              💡 Parolni Sozlamalar sahifasida o'zgartirish mumkin
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Bekor</button>
          <button
            className="btn btn-danger"
            onClick={handleConfirm}
            disabled={loading || !parol}
          >
            {loading ? <span className="spinner" /> : "🗑️ O'chirish"}
          </button>
        </div>
      </div>
    </div>
  );
}