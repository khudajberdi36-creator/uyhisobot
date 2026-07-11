import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Avatar from '../components/Avatar';

function formatSum(n) {
  return Number(n || 0).toLocaleString('uz-UZ');
}

export default function Qarzdorlar() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async (q) => {
    setLoading(true);
    try {
      const res = q
        ? await axios.get(`/api/qarzdorlar/search?q=${encodeURIComponent(q)}`)
        : await axios.get('/api/qarzdorlar');
      setData(res.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(''); }, [load]);
  useEffect(() => {
    const t = setTimeout(() => load(search), 350);
    return () => clearTimeout(t);
  }, [search, load]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>👨‍👩‍👧‍👦 Oila a'zolari</h2>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>{data.length} ta kishida qarz bor</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/qarzdorlar/yangi')}>
          ＋ Yangi a'zo
        </button>
      </div>

      <div className="table-card">
        <div className="table-header">
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>Barcha a'zolar</h3>
          <div className="search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="search-input"
              placeholder="Ism, familiya, telefon..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading-page"><div className="spinner" /></div>
        ) : data.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 48, marginBottom: 12 }}>🧾</div>
            <h3>{search ? 'Topilmadi' : "A'zolar yo'q"}</h3>
            <p>{search ? "Boshqa qidiruv so'zi kiriting" : "Birinchi a'zoni qo'shing"}</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Ism</th>
                <th>Aloqa</th>
                <th>Qarz soni</th>
                <th>Umumiy qarz</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((q, i) => (
                <tr key={q.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/qarzdorlar/${q.id}`)}>
                  <td style={{ color: 'var(--text3)', fontSize: 12 }}>{i + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={`${q.ism} ${q.familiya || ''}`} size={36} radius={9} fontSize={14} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{q.ism} {q.familiya}</div>
                        {q.manzil && <div style={{ fontSize: 11, color: 'var(--text3)' }}>📍 {q.manzil}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="contact-links" onClick={e => e.stopPropagation()}>
                      <a href={`tel:${q.telefon}`} className="contact-link cl-phone">📞 {q.telefon}</a>
                      {q.telegram && (
                        <a href={`https://t.me/${q.telegram.replace('@', '')}`} target="_blank" rel="noreferrer" className="contact-link cl-telegram">✈️</a>
                      )}
                      {q.whatsapp && (
                        <a href={`https://wa.me/${q.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="contact-link cl-whatsapp">💬</a>
                      )}
                      {q.instagram && (
                        <a href={`https://instagram.com/${q.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="contact-link cl-instagram">📸</a>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-blue">{q.qarz_soni || 0} ta</span>
                  </td>
                  <td>
                    <span className={`amount ${q.jami_qarz > 0 ? 'amount-red' : 'amount-green'}`}>
                      {formatSum(q.jami_qarz)} so'm
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); navigate(`/qarzdorlar/${q.id}`); }}>
                      Ko'rish →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}