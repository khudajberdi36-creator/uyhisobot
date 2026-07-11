import React, { useState, useEffect } from 'react';
import axios from 'axios';

function groupByDay(list) {
  const groups = {};
  list.forEach(t => {
    const day = new Date(t.created_at).toLocaleDateString('uz-UZ', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    });
    if (!groups[day]) groups[day] = [];
    groups[day].push(t);
  });
  return groups;
}

async function fetchLocation(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168') || ip.startsWith('10.')) {
    return 'Lokal tarmoq';
  }
  try {
    const r = await fetch(`https://ipapi.co/${ip}/json/`);
    const d = await r.json();
    if (d.city && d.country_name) return `${d.city}, ${d.country_name}`;
    if (d.country_name) return d.country_name;
    return '—';
  } catch {
    return '—';
  }
}

function parseDevice(ua) {
  if (!ua) return { icon: '❓', name: "Noma'lum" };
  const s = ua.toLowerCase();
  if (s.includes('android')) return { icon: '📱', name: 'Android' };
  if (s.includes('iphone') || s.includes('ipad')) return { icon: '🍎', name: 'iPhone/iPad' };
  if (s.includes('windows')) return { icon: '🖥️', name: 'Windows' };
  if (s.includes('macintosh') || s.includes('mac os')) return { icon: '💻', name: 'Mac' };
  if (s.includes('linux')) return { icon: '🐧', name: 'Linux' };
  return { icon: '🌐', name: 'Boshqa' };
}

function parseBrowser(ua) {
  if (!ua) return '—';
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  return 'Boshqa';
}

const KUNLAR = [3, 7, 10, 14, 30];

export default function KirishTarixi() {
  const [tarix, setTarix] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState({});
  const [filter, setFilter] = useState('barchasi');
  const [search, setSearch] = useState('');
  const [openDays, setOpenDays] = useState({});

  // ✅ Tozalash modal state
  const [showTozalash, setShowTozalash] = useState(false);
  const [selectedKun, setSelectedKun] = useState(10);
  const [customKun, setCustomKun] = useState('10');
  const [tozalashLoading, setTozalashLoading] = useState(false);
  const [tozalashNatija, setTozalashNatija] = useState(null);

  const yuklash = () => {
    setLoading(true);
    axios.get('/api/admin/kirish-tarixi')
      .then(r => {
        setTarix(r.data);
        const uniqIPs = [...new Set(r.data.slice(0, 20).map(t => t.ip_manzil))];
        uniqIPs.forEach(async ip => {
          const loc = await fetchLocation(ip);
          setLocations(prev => ({ ...prev, [ip]: loc }));
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { yuklash(); }, []);

  // ✅ Tozalash funksiyasi
  const handleTozalash = async () => {
    const kunlar = parseInt(customKun) || selectedKun;
    if (!kunlar || kunlar < 1) return;
    setTozalashLoading(true);
    setTozalashNatija(null);
    try {
      const r = await axios.delete(`/api/admin/kirish-tarixi/tozalash?days=${kunlar}`);
      setTozalashNatija({ ok: true, xabar: r.data.message });
      yuklash();
      setTimeout(() => {
        setShowTozalash(false);
        setTozalashNatija(null);
      }, 2000);
    } catch (err) {
      setTozalashNatija({ ok: false, xabar: err.response?.data?.error || "Xatolik yuz berdi" });
    } finally {
      setTozalashLoading(false);
    }
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  const activeKun = parseInt(customKun) || selectedKun;

  const filtered = tarix.filter(t => {
    const matchFilter =
      filter === 'barchasi' ||
      (filter === 'muvaffaqiyatli' && t.status === 'muvaffaqiyatli') ||
      (filter === 'xato' && t.status !== 'muvaffaqiyatli');
    const matchSearch =
      !search ||
      t.username?.toLowerCase().includes(search.toLowerCase()) ||
      t.ip_manzil?.includes(search);
    return matchFilter && matchSearch;
  });

  const grouped = groupByDay(filtered);
  const days = Object.keys(grouped);

  const total = tarix.length;
  const muvaffaq = tarix.filter(t => t.status === 'muvaffaqiyatli').length;
  const xato = total - muvaffaq;
  const uniqIP = new Set(tarix.map(t => t.ip_manzil)).size;

  const toggleDay = (day) => {
    setOpenDays(prev => ({ ...prev, [day]: !prev[day] }));
  };

  const isDayOpen = (day) => {
    if (openDays[day] !== undefined) return openDays[day];
    return days.indexOf(day) === 0;
  };

  return (
    <div>
      {/* ✅ Tozalash Modal */}
      {showTozalash && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 16
        }}>
          <div style={{
            background: 'var(--card)', borderRadius: 20, padding: 32,
            maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>🗑️</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
                Kirish tarixini tozalash
              </h3>
              <p style={{ color: 'var(--text2)', fontSize: 13 }}>
                Necha kundan eski yozuvlarni o'chirmoqchisiz?
              </p>
            </div>

            {/* Tez tugmalar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
              {KUNLAR.map(k => (
                <button
                  key={k}
                  onClick={() => { setSelectedKun(k); setCustomKun(String(k)); }}
                  style={{
                    padding: '8px 18px', borderRadius: 10, border: '2px solid',
                    borderColor: selectedKun === k && String(k) === customKun ? 'var(--accent)' : 'var(--border)',
                    background: selectedKun === k && String(k) === customKun ? 'var(--accent)' : 'var(--bg2)',
                    color: selectedKun === k && String(k) === customKun ? 'white' : 'var(--text)',
                    fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit'
                  }}
                >
                  {k} kun
                </button>
              ))}
            </div>

            {/* Qo'lda kiritish */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
              <span style={{ color: 'var(--text2)', fontSize: 13 }}>Yoki o'zingiz kiriting:</span>
              <input
                type="number"
                min="1"
                max="365"
                value={customKun}
                onChange={e => { setCustomKun(e.target.value); setSelectedKun(parseInt(e.target.value) || 0); }}
                style={{
                  width: 70, padding: '8px 12px', borderRadius: 8,
                  border: '2px solid var(--border)', background: 'var(--bg2)',
                  color: 'var(--text)', fontSize: 14, textAlign: 'center', fontFamily: 'inherit'
                }}
              />
              <span style={{ color: 'var(--text2)', fontSize: 13 }}>kun</span>
            </div>

            {/* Ogohlantirish */}
            {activeKun > 0 && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 13,
                color: 'var(--text)', textAlign: 'center'
              }}>
                ⚠️ <strong>{activeKun} kundan</strong> eski barcha yozuvlar o'chiriladi. Bu amalni qaytarib bo'lmaydi!
              </div>
            )}

            {/* Natija */}
            {tozalashNatija && (
              <div style={{
                background: tozalashNatija.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${tozalashNatija.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13,
                textAlign: 'center', color: 'var(--text)'
              }}>
                {tozalashNatija.ok ? '✅' : '❌'} {tozalashNatija.xabar}
              </div>
            )}

            {/* Tugmalar */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setShowTozalash(false); setTozalashNatija(null); }}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12, border: '2px solid var(--border)',
                  background: 'var(--bg2)', color: 'var(--text)', fontWeight: 600,
                  fontSize: 14, cursor: 'pointer', fontFamily: 'inherit'
                }}
              >
                Bekor qilish
              </button>
              <button
                onClick={handleTozalash}
                disabled={tozalashLoading || !activeKun || activeKun < 1}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12, border: 'none',
                  background: tozalashLoading ? 'var(--text3)' : '#ef4444',
                  color: 'white', fontWeight: 700, fontSize: 14,
                  cursor: tozalashLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
                }}
              >
                {tozalashLoading ? '⏳ O\'chirilmoqda...' : `🗑️ ${activeKun} kundan eskini o'chir`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
            🛡️ Kirish tarixi
          </h2>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>
            Tizimga kirish va chiqishlar — kunlarga bo'lingan ro'yxat
          </p>
        </div>
        <button
          onClick={() => setShowTozalash(true)}
          className="btn btn-danger btn-sm"
        >
          🗑️ Tarixni tozalash
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 12, marginBottom: 24 }}>
        <div className="stat-card purple" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 22 }}>📋</div>
          <div className="stat-label" style={{ marginTop: 8 }}>Jami urinish</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{total}</div>
        </div>
        <div className="stat-card green" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 22 }}>✅</div>
          <div className="stat-label" style={{ marginTop: 8 }}>Muvaffaqiyatli</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{muvaffaq}</div>
        </div>
        <div className="stat-card red" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 22 }}>🚫</div>
          <div className="stat-label" style={{ marginTop: 8 }}>Xato urinish</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{xato}</div>
        </div>
        <div className="stat-card orange" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 22 }}>🌍</div>
          <div className="stat-label" style={{ marginTop: 8 }}>Turli IP</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{uniqIP}</div>
        </div>
      </div>

      {/* Filter + Search */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, gap: 4 }}>
          {[
            { key: 'barchasi', label: '🗂️ Barchasi' },
            { key: 'muvaffaqiyatli', label: '✅ Muvaffaqiyatli' },
            { key: 'xato', label: '🚫 Xato' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '7px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                background: filter === f.key ? 'var(--accent)' : 'transparent',
                color: filter === f.key ? 'white' : 'var(--text2)',
                transition: 'all 0.15s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <input
          className="form-input"
          placeholder="🔍 Username yoki IP qidirish..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 240, padding: '9px 14px', fontSize: 13 }}
        />

        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text3)' }}>
          {filtered.length} ta yozuv
        </span>
      </div>

      {/* Kunlarga bo'lingan ro'yxat */}
      {days.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text2)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <p>Hech narsa topilmadi</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {days.map(day => {
            const dayItems = grouped[day];
            const isOpen = isDayOpen(day);
            const dayXato = dayItems.filter(t => t.status !== 'muvaffaqiyatli').length;

            return (
              <div key={day} className="table-card" style={{ overflow: 'hidden' }}>
                <button
                  onClick={() => toggleDay(day)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 20px', background: 'none', border: 'none',
                    borderBottom: isOpen ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer', transition: 'background 0.15s',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <span style={{ fontSize: 18 }}>📅</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', flex: 1, textAlign: 'left' }}>
                    {day}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text3)', marginRight: 8 }}>
                    {dayItems.length} ta kirish
                  </span>
                  {dayXato > 0 && (
                    <span className="badge badge-red" style={{ marginRight: 8 }}>
                      ⚠️ {dayXato} xato
                    </span>
                  )}
                  <span style={{ fontSize: 16, color: 'var(--text3)', transition: 'transform 0.25s', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    ▼
                  </span>
                </button>

                {isOpen && (
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>👤 Foydalanuvchi</th>
                          <th>🌐 IP manzil</th>
                          <th>📍 Lokatsiya</th>
                          <th>💻 Qurilma</th>
                          <th>🌍 Brauzer</th>
                          <th>📊 Holat</th>
                          <th>🕐 Vaqt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dayItems.map(t => {
                          const device = parseDevice(t.user_agent);
                          const browser = parseBrowser(t.user_agent);
                          const loc = locations[t.ip_manzil];

                          return (
                            <tr key={t.id}>
                              <td style={{ fontWeight: 600 }}>
                                <span style={{ fontSize: 14 }}>👤</span>{' '}
                                {t.username}
                              </td>
                              <td>
                                <code style={{
                                  background: 'var(--bg)', padding: '3px 8px',
                                  borderRadius: 6, fontSize: 12, letterSpacing: '0.02em'
                                }}>
                                  {t.ip_manzil}
                                </code>
                              </td>
                              <td style={{ fontSize: 12, color: 'var(--text2)', minWidth: 140 }}>
                                {loc === undefined ? (
                                  <span style={{ color: 'var(--text3)', fontSize: 11 }}>⏳ aniqlanmoqda...</span>
                                ) : (
                                  <span>📍 {loc}</span>
                                )}
                              </td>
                              <td style={{ fontSize: 12 }}>
                                <span>{device.icon} {device.name}</span>
                              </td>
                              <td style={{ fontSize: 12, color: 'var(--text2)' }}>
                                🌍 {browser}
                              </td>
                              <td>
                                <span className={`badge ${t.status === 'muvaffaqiyatli' ? 'badge-green' : t.status === 'bloklangan' ? 'badge-orange' : 'badge-red'}`}>
                                  {t.status === 'muvaffaqiyatli' ? '✅ OK' : t.status === 'bloklangan' ? '🔒 Bloklangan' : '🚫 Xato'}
                                </span>
                              </td>
                              <td style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                                🕐 {new Date(t.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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
          })}
        </div>
      )}
    </div>
  );
}