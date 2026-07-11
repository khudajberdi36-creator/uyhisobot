import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { exportQarzdorlarExcel, exportQarzdorlarPDF } from '../utils/export';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';

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

const COLORS = ['#ef4444', '#10b981', '#6366f1', '#f59e0b', '#8b5cf6'];

// ✅ Qarzdorlar ro'yxati modali
function QarzdorlarModal({ qarzdorlar, title, onClose }) {
  const navigate = useNavigate();
  const sorted = [...qarzdorlar].sort((a, b) => Number(b.jami_qarz) - Number(a.jami_qarz));
  const jami = sorted.reduce((s, q) => s + Number(q.jami_qarz || 0), 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>
              {sorted.length} ta a'zo • Umumiy: <strong style={{ color: '#ef4444' }}>{formatSum(jami)} so'm</strong>
            </div>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {sorted.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div style={{ fontSize: 36 }}>✅</div>
              <h3>A'zo yo'q</h3>
            </div>
          ) : (
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>#</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Ism</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Telefon</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Qarz</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((q, i) => (
                  <tr
                    key={q.id}
                    style={{ cursor: 'pointer', borderTop: '1px solid var(--border)' }}
                    onClick={() => { navigate(`/qarzdorlar/${q.id}`); onClose(); }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px', color: 'var(--text3)', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={`${q.ism} ${q.familiya || ''}`} size={32} radius={8} fontSize={13} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{q.ism} {q.familiya}</div>
                          {q.manzil && <div style={{ fontSize: 11, color: 'var(--text3)' }}>📍 {q.manzil}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <a href={`tel:${q.telefon}`} className="contact-link cl-phone" onClick={e => e.stopPropagation()}>
                        📞 {q.telefon}
                      </a>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <span style={{ fontWeight: 800, color: Number(q.jami_qarz) > 0 ? '#ef4444' : '#10b981', fontFamily: 'JetBrains Mono, monospace' }}>
                        {formatSum(q.jami_qarz)} so'm
                      </span>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{q.qarz_soni || 0} ta qarz</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Yopish</button>
          <button className="btn btn-primary" onClick={() => { navigate('/qarzdorlar'); onClose(); }}>
            👥 Barcha a'zolar →
          </button>
        </div>
      </div>
    </div>
  );
}

// ✅ Mahsulotlar statistika modali
function MahsulotStatModal({ onClose, navigate }) {
  const [davr, setDavr] = useState('oy');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('top'); // top | naxt | qarz

  useEffect(() => {
    setLoading(true);
    axios.get(`/api/stats/top-mahsulotlar?davr=${davr}&batafsil=1`)
      .then(r => setData(r.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [davr]);

  const jamiTushum = data.reduce((s, m) => s + Number(m.jami_summa || 0), 0);
  const jamiMiqdor = data.reduce((s, m) => s + Number(m.jami_miqdor || 0), 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 700, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>📊 Mahsulotlar statistikasi</h2>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>
              Naxt sotuv + Qarz orqali sotilganlar
            </div>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Davr tanlash */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { val: 'bugun', label: 'Bugun' },
            { val: 'hafta', label: 'Hafta' },
            { val: 'oy', label: 'Oy' },
            { val: 'yil', label: 'Yil' },
          ].map(d => (
            <button
              key={d.val}
              className={`btn btn-sm ${davr === d.val ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setDavr(d.val)}
            >
              {d.label}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, fontSize: 13 }}>
            <span>Jami tushum: <strong style={{ color: '#10b981' }}>{formatSum(jamiTushum)} so'm</strong></span>
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px' }}>
          {loading ? (
            <div className="loading-page"><div className="spinner" /></div>
          ) : data.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 40 }}>📦</div>
              <h3>Ma'lumot yo'q</h3>
              <p>Bu davrda sotuv amalga oshirilmagan</p>
            </div>
          ) : (
            <>
              {/* Bar chart */}
              <div style={{ marginBottom: 20 }}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text2)' }} tickFormatter={formatSumShort} />
                    <YAxis type="category" dataKey="nomi" tick={{ fontSize: 11, fill: 'var(--text)' }} width={90} />
                    <Tooltip
                      contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                      formatter={(v) => [formatSum(v) + ' so\'m', 'Tushum']}
                    />
                    <Bar dataKey="jami_summa" radius={[0, 6, 6, 0]}>
                      {data.slice(0, 10).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Jadval */}
              <table style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>#</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Mahsulot</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Sotuv soni</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Miqdor</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Naxt</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Qarz</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Jami tushum</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((m, i) => {
                    const maxSum = data[0]?.jami_summa || 1;
                    const foiz = Math.round((m.jami_summa / maxSum) * 100);
                    return (
                      <tr key={m.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{
                            width: 26, height: 26, borderRadius: '50%',
                            background: COLORS[i % COLORS.length], display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontWeight: 800, color: 'white', fontSize: 12
                          }}>{i + 1}</div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{m.emoji || '📦'} {m.nomi}</div>
                          <div style={{ background: 'var(--bg)', borderRadius: 20, height: 4, marginTop: 4, overflow: 'hidden', width: 120 }}>
                            <div style={{ width: foiz + '%', height: '100%', background: COLORS[i % COLORS.length], borderRadius: 20 }} />
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>
                          <span style={{ background: 'var(--bg2)', borderRadius: 20, padding: '2px 10px', fontSize: 13 }}>
                            {Number(m.sotuv_soni || 0)} marta
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>
                          {Number(m.jami_miqdor).toLocaleString()} {m.birlik}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, color: '#10b981', fontWeight: 600 }}>
                          {formatSum(m.naxt_summa || 0)} so'm
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, color: '#6366f1', fontWeight: 600 }}>
                          {formatSum(m.qarz_summa || 0)} so'm
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <span style={{ fontWeight: 800, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', fontSize: 14 }}>
                            {formatSum(m.jami_summa)} so'm
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Yopish</button>
          <button className="btn btn-primary" onClick={() => { navigate('/naxt-sotuv'); onClose(); }}>
            💵 Naxt sotuv →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [overdue, setOverdue] = useState([]);
  const [allQarzdorlar, setAllQarzdorlar] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [topQarzdorlar, setTopQarzdorlar] = useState([]);
  const [topMahsulotlar, setTopMahsulotlar] = useState([]);
  const [balans, setBalans] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQarzdorModal, setShowQarzdorModal] = useState(null); // null | 'barcha' | 'muddati'
  const [showMahsulotStat, setShowMahsulotStat] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([
      axios.get('/api/stats'),
      axios.get('/api/qarzlar/muddati-otgan'),
      axios.get('/api/qarzdorlar'),
      axios.get('/api/stats/monthly'),
      axios.get('/api/stats/top-qarzdorlar'),
      axios.get('/api/stats/top-mahsulotlar?davr=bugun'),
      axios.get('/api/byudjet/balans').catch(() => ({ data: null })),
    ]).then(([s, o, qd, monthly, top, topM, byudjet]) => {
      setStats(s.data);
      setOverdue(o.data.slice(0, 5));
      setAllQarzdorlar(qd.data);
      setMonthlyData(monthly.data);
      setTopQarzdorlar(top.data);
      setTopMahsulotlar(topM.data || []);
      setBalans(byudjet.data);
    }).catch(err => {
      console.error('Dashboard load xatosi:', err);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  const pieData = [
    { name: "Qolgan qarz", value: Number(stats?.qolgan_qarz || 0) },
    { name: "To'langan", value: Number(stats?.tolov_qilingan || 0) },
  ].filter(d => d.value > 0);

  const tolovFoizi = stats?.tolov_foizi || 0;

  // Qarzdorlar filtrlash
  const muddatiOtganQarzdorlar = allQarzdorlar.filter(q => Number(q.jami_qarz) > 0);

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Umumiy holat</h2>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>Bugungi kun bo'yicha statistika</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => exportQarzdorlarExcel(allQarzdorlar)}>
            📊 Excel
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => exportQarzdorlarPDF(allQarzdorlar, user?.dokon_nomi)}>
            📄 PDF
          </button>
        </div>
      </div>

      {/* ✅ Stats cards — kliklash mumkin */}
      <div className="stats-grid">
        <div
          className="stat-card purple"
          style={{ cursor: 'pointer' }}
          onClick={() => setShowQarzdorModal('barcha')}
          title="Barcha a'zolarni ko'rish"
        >
          <div className="stat-icon">🧾</div>
          <div className="stat-label">Jami a'zolar</div>
          <div className="stat-value">{stats?.jami_qarzdorlar || 0}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>Ko'rish →</div>
        </div>
        <div
          className="stat-card red"
          style={{ cursor: 'pointer' }}
          onClick={() => setShowQarzdorModal('qolgan')}
          title="Qarzi bor a'zolarni ko'rish"
        >
          <div className="stat-icon">💸</div>
          <div className="stat-label">Qolgan qarz (UZS)</div>
          <div className="stat-value">{formatSum(stats?.qolgan_qarz)}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>Ko'rish →</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">💚</div>
          <div className="stat-label">To'langan</div>
          <div className="stat-value">{formatSum(stats?.tolov_qilingan)}</div>
        </div>
        <div
          className="stat-card orange"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/muddati-otgan')}
          title="Muddati o'tganlarni ko'rish"
        >
          <div className="stat-icon">⚠️</div>
          <div className="stat-label">Muddati o'tgan</div>
          <div className="stat-value">{stats?.muddati_otgan || 0}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>Ko'rish →</div>
        </div>
        <div
          className="stat-card green"
          style={{ cursor: 'pointer' }}
          onClick={() => setShowMahsulotStat(true)}
          title="Tushum statistikasini ko'rish"
        >
          <div className="stat-icon">💵</div>
          <div className="stat-label">Bugungi tushum</div>
          <div className="stat-value" style={{ fontSize: 16 }}>{formatSum(stats?.bugun_naxt_tushum)} so'm</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>Statistika →</div>
        </div>
        <div
          className="stat-card purple"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/byudjet')}
          title="Kirim-Chiqim byudjetini ko'rish"
        >
          <div className="stat-icon">📊</div>
          <div className="stat-label">Oy balansi</div>
          <div className="stat-value" style={{ fontSize: 18, color: (balans?.qoldiq ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {(balans?.qoldiq ?? 0) >= 0 ? '+' : ''}{formatSum(balans?.qoldiq)}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>Byudjet →</div>
        </div>
      </div>

      {/* To'lov foizi */}
      <div className="table-card" style={{ padding: '16px 20px', marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>💹 To'lov foizi</span>
          <span style={{ fontWeight: 800, fontSize: 18, color: tolovFoizi >= 70 ? '#10b981' : tolovFoizi >= 40 ? '#f59e0b' : '#ef4444' }}>
            {tolovFoizi}%
          </span>
        </div>
        <div style={{ background: 'var(--bg)', borderRadius: 20, height: 12, overflow: 'hidden' }}>
          <div style={{
            width: `${tolovFoizi}%`, height: '100%', borderRadius: 20,
            background: tolovFoizi >= 70 ? 'linear-gradient(90deg, #10b981, #34d399)' :
              tolovFoizi >= 40 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' :
                'linear-gradient(90deg, #ef4444, #f87171)',
            transition: 'width 0.8s ease'
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--text3)' }}>
          <span>Jami qarz: {formatSum(stats?.jami_qarz)} so'm</span>
          <span>To'langan: {formatSum(stats?.tolov_qilingan)} so'm</span>
        </div>
      </div>

      {/* Bugungi harakatlar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 12, marginTop: 16 }}>
        <div className="table-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 28 }}>📋</div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>Bugun yangi qarz</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{stats?.yangi_qarzlar || 0}</div>
          </div>
        </div>
        <div className="table-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 28 }}>💳</div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>Bugun to'lovlar</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{stats?.bugun_tolovlar || 0}</div>
          </div>
        </div>
        <div className="table-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 28 }}>👤</div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>Bugun yangi a'zo</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{stats?.bugun_qarzdorlar || 0}</div>
          </div>
        </div>
      </div>

      {/* Grafiklar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 16 }}>
        <div className="table-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>📈 Oylik qarz / to'lov</h3>
          {monthlyData.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text2)', padding: '40px 0', fontSize: 13 }}>Ma'lumot yo'q</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="oy" tick={{ fontSize: 11, fill: 'var(--text2)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text2)' }} tickFormatter={formatSumShort} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                  formatter={(v, name) => [Number(v).toLocaleString('uz-UZ') + ' UZS', name === 'qarz' ? 'Qarz' : "To'lov"]}
                />
                <Legend formatter={v => v === 'qarz' ? 'Qarz' : "To'lov"} wrapperStyle={{ fontSize: 12, color: 'var(--text2)' }} />
                <Bar dataKey="qarz" fill="#ef4444" radius={[4, 4, 0, 0]} name="qarz" />
                <Bar dataKey="tolov" fill="#10b981" radius={[4, 4, 0, 0]} name="tolov" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {pieData.length > 0 && (
          <div className="table-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>🥧 Qarz holati</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                  formatter={(v) => [Number(v).toLocaleString('uz-UZ') + ' UZS']}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text2)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ✅ Top 5 qarzdor — kliklash mumkin */}
      {topQarzdorlar.length > 0 && (
        <div className="table-card" style={{ marginTop: 16 }}>
          <div className="table-header">
            <h3>🏆 Top 5 a'zo</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowQarzdorModal('qolgan')}>
              Barchasini ko'rish
            </button>
          </div>
          <div style={{ padding: '0 4px 8px' }}>
            {topQarzdorlar.map((q, i) => {
              const maxQarz = topQarzdorlar[0]?.qarz || 1;
              const foiz = Math.round((q.qarz / maxQarz) * 100);
              const colors = ['#ef4444', '#f59e0b', '#6366f1', '#10b981', '#8b5cf6'];
              return (
                <div
                  key={q.id}
                  onClick={() => navigate(`/qarzdorlar/${q.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    cursor: 'pointer', borderRadius: 10, transition: 'background 0.15s',
                    borderBottom: i < topQarzdorlar.length - 1 ? '1px solid var(--border)' : 'none'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: colors[i], display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: 800, color: 'white', fontSize: 14, flexShrink: 0
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{q.ism}</div>
                    <div style={{ background: 'var(--bg)', borderRadius: 20, height: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${foiz}%`, height: '100%', background: colors[i], borderRadius: 20 }} />
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, color: '#ef4444', fontSize: 14, flexShrink: 0 }}>
                    {formatSum(q.qarz)} so'm
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Muddati o'tgan */}
      {overdue.length > 0 && (
        <div className="table-card" style={{ marginTop: 16 }}>
          <div className="table-header">
            <h3>⚠️ Muddati o'tgan qarzlar</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/muddati-otgan')}>
              Barchasini ko'rish
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th>A'zo</th>
                <th>Telefon</th>
                <th>Qolgan summa</th>
                <th>Muddat</th>
                <th>Harakatlar</th>
              </tr>
            </thead>
            <tbody>
              {overdue.map(q => (
                <tr key={q.id}>
                  <td style={{ fontWeight: 600 }}>{q.ism} {q.familiya}</td>
                  <td>
                    <a href={`tel:${q.telefon}`} className="contact-link cl-phone">
                      📞 {q.telefon}
                    </a>
                  </td>
                  <td>
                    <span className="amount amount-red">
                      {formatSum(Math.max(0, q.qolgan_summa))} so'm
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-red">
                      {new Date(q.muddat).toLocaleDateString('uz-UZ')}
                    </span>
                  </td>
                  <td>
                    <div className="contact-links">
                      {q.telegram && (
                        <a href={`https://t.me/${q.telegram.replace('@', '')}`} target="_blank" rel="noreferrer" className="contact-link cl-telegram">
                          ✈️ TG
                        </a>
                      )}
                      {q.whatsapp && (
                        <a href={`https://wa.me/${q.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="contact-link cl-whatsapp">
                          💬 WA
                        </a>
                      )}
                      <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/qarzdorlar/${q.qarzdor_id}`)} style={{ marginLeft: 4 }}>
                        Ko'rish
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ✅ Bugun eng ko'p sotiladigan mahsulotlar */}
      {topMahsulotlar.length > 0 && (
        <div className="table-card" style={{ marginTop: 16 }}>
          <div className="table-header">
            <h3>🔥 Bugun eng ko'p sotiladigan mahsulotlar</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowMahsulotStat(true)}>
              📊 Batafsil statistika
            </button>
          </div>
          <div style={{ padding: '0 4px 8px' }}>
            {topMahsulotlar.map((m, i) => {
              const maxMiq = topMahsulotlar[0]?.jami_miqdor || 1;
              const foiz = Math.round((m.jami_miqdor / maxMiq) * 100);
              const colors = ['#ef4444', '#f59e0b', '#6366f1', '#10b981', '#8b5cf6'];
              return (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                  borderBottom: i < topMahsulotlar.length - 1 ? '1px solid var(--border)' : 'none'
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: colors[i % 5], display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: 800, color: 'white', fontSize: 12, flexShrink: 0
                  }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{m.nomi}</div>
                    <div style={{ background: 'var(--bg)', borderRadius: 20, height: 5, overflow: 'hidden' }}>
                      <div style={{ width: foiz + '%', height: '100%', background: colors[i % 5], borderRadius: 20 }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, color: colors[i % 5], fontSize: 14 }}>{m.jami_miqdor} {m.birlik}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{m.sotuv_soni} marta • {formatSum(m.jami_summa)} so'm</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => navigate('/qarzdorlar/yangi')}>
          ➕ Yangi a'zo qo'shish
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/qarzdorlar')}>
          👥 Barcha a'zolar
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/naxt-sotuv')}>
          💵 Naxt sotuv
        </button>
        <button className="btn btn-secondary" onClick={() => setShowMahsulotStat(true)}>
          📊 Mahsulot statistika
        </button>
        {stats?.muddati_otgan > 0 && (
          <button className="btn btn-danger" onClick={() => navigate('/muddati-otgan')}>
            ⏰ Muddati o'tganlar ({stats.muddati_otgan})
          </button>
        )}
      </div>

      {/* Modals */}
      {showQarzdorModal && (
        <QarzdorlarModal
          qarzdorlar={showQarzdorModal === 'qolgan'
            ? allQarzdorlar.filter(q => Number(q.jami_qarz) > 0)
            : allQarzdorlar
          }
          title={showQarzdorModal === 'qolgan' ? "💸 Qarzi bor a'zolar" : "👨‍👩‍👧‍👦 Barcha a'zolar"}
          onClose={() => setShowQarzdorModal(null)}
        />
      )}
      {showMahsulotStat && (
        <MahsulotStatModal
          onClose={() => setShowMahsulotStat(false)}
          navigate={navigate}
        />
      )}
    </div>
  );
}