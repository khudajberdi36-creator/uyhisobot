import React, { useState } from 'react';
import toast from 'react-hot-toast';

export default function Sozlamalar() {
  const [eski, setEski] = useState('');
  const [yangi, setYangi] = useState('');
  const [takror, setTakror] = useState('');
  const [xato, setXato] = useState('');

  const DEFAULT_PIN = '1234';

  const handleSaqlash = () => {
    setXato('');
    const hozirgiPin = localStorage.getItem('delete_pin') || DEFAULT_PIN;

    if (eski !== hozirgiPin) {
      setXato("❌ Eski parol noto'g'ri!");
      return;
    }
    if (yangi.length < 4) {
      setXato("Yangi parol kamida 4 ta raqam bo'lishi kerak");
      return;
    }
    if (yangi !== takror) {
      setXato("Yangi parollar mos kelmaydi!");
      return;
    }
    localStorage.setItem('delete_pin', yangi);
    toast.success('✅ O\'chirish paroli yangilandi!');
    setEski(''); setYangi(''); setTakror('');
  };

  const hozirgiPin = localStorage.getItem('delete_pin') || DEFAULT_PIN;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>⚙️ Sozlamalar</h2>
        <p style={{ color: 'var(--text2)', fontSize: 13 }}>Ilova sozlamalarini boshqaring</p>
      </div>

      <div className="table-card" style={{ padding: 24, maxWidth: 420 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>🔒 O'chirish paroli</h3>
        <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 20 }}>
          Mahsulot yoki a'zoni o'chirishdan oldin so'raladigan parol.
          Standart parol: <strong>1234</strong>
        </p>

        <div className="form-group">
          <label className="form-label">Eski parol</label>
          <input
            type="password"
            className="form-input"
            value={eski}
            onChange={e => { setEski(e.target.value); setXato(''); }}
            placeholder="••••"
            style={{ letterSpacing: 4, fontSize: 18 }}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Yangi parol</label>
          <input
            type="password"
            className="form-input"
            value={yangi}
            onChange={e => { setYangi(e.target.value); setXato(''); }}
            placeholder="••••"
            style={{ letterSpacing: 4, fontSize: 18 }}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Yangi parolni takrorlang</label>
          <input
            type="password"
            className="form-input"
            value={takror}
            onChange={e => { setTakror(e.target.value); setXato(''); }}
            placeholder="••••"
            style={{ letterSpacing: 4, fontSize: 18 }}
            onKeyDown={e => e.key === 'Enter' && handleSaqlash()}
          />
        </div>

        {xato && (
          <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12, fontWeight: 600 }}>{xato}</div>
        )}

        <button className="btn btn-primary" onClick={handleSaqlash} style={{ width: '100%' }}>
          💾 Parolni saqlash
        </button>
      </div>
    </div>
  );
}