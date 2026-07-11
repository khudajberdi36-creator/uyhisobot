import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function formatSum(n) { return Number(n || 0).toLocaleString('uz-UZ'); }

function daysDiff(dateStr) {
  const today = new Date();
  const d = new Date(dateStr);
  return Math.floor((today - d) / (1000 * 60 * 60 * 24));
}

export default function MuddatiOtgan() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/qarzlar/muddati-otgan').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>⚠️ Muddati o'tgan qarzlar</h2>
        <p style={{ color: 'var(--text2)', fontSize: 13 }}>
          {data.length > 0
            ? `${data.length} ta qarzning muddati o'tib ketgan`
            : "Barcha qarzlar vaqtida"}
        </p>
      </div>

      {data.length === 0 ? (
        <div className="table-card">
          <div className="empty-state" style={{ padding: '60px 20px' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
            <h3>Ajoyib! Muddati o'tgan qarz yo'q</h3>
            <p>Barcha qarzlar vaqtida to'lanmoqda</p>
          </div>
        </div>
      ) : (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>A'zo</th>
                <th>Qolgan summa</th>
                <th>Sabab</th>
                <th>Muddat</th>
                <th>Kechikish</th>
                <th>Eslatma yuborish</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map(q => {
                const days = daysDiff(q.muddat);
                const eslatmaText = `Assalomu alaykum ${q.ism}! Qarzingizning muddati ${days} kun oldin o'tib ketdi. Miqdori: ${formatSum(q.qolgan_summa)} so'm. Iltimos, tezroq to'lab qo'ysangiz. Rahmat!`;
                return (
                  <tr key={q.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{q.ism} {q.familiya}</div>
                    </td>
                    <td>
                      <span className="amount amount-red">{formatSum(q.qolgan_summa)} so'm</span>
                    </td>
                    <td style={{ color: 'var(--text2)', fontSize: 13 }}>
                      {q.sabab || '—'}
                    </td>
                    <td>
                      <span className="badge badge-red">
                        {new Date(q.muddat).toLocaleDateString('uz-UZ')}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--red)', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                        {days} kun
                      </span>
                    </td>
                    <td>
                      <div className="contact-links">
                        <a href={`tel:${q.telefon}`} className="contact-link cl-phone" title="Qo'ng'iroq">
                          📞
                        </a>
                        {q.telegram && (
                          <a
                            href={`https://t.me/${q.telegram.startsWith('+') ? q.telegram : q.telegram.replace('@','')}`}
                            target="_blank" rel="noreferrer"
                            className="contact-link cl-telegram" title="Telegram"
                          >
                            ✈️
                          </a>
                        )}
                        {q.whatsapp && (
                          <a
                            href={`https://wa.me/${q.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(eslatmaText)}`}
                            target="_blank" rel="noreferrer"
                            className="contact-link cl-whatsapp" title="WhatsApp xabar"
                          >
                            💬
                          </a>
                        )}
                        {q.instagram && (
                          <a
                            href={`https://instagram.com/${q.instagram.replace('@','')}`}
                            target="_blank" rel="noreferrer"
                            className="contact-link cl-instagram" title="Instagram DM"
                          >
                            📸
                          </a>
                        )}
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/qarzdorlar/${q.qarzdor_id}`)}
                      >
                        Ko'rish →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}