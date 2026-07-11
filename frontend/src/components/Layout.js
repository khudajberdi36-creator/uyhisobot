import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import axios from 'axios';

const getNavItems = (role) => [
  { to: '/',               label: 'Bosh sahifa',      icon: '🗂️', exact: true },
  { to: '/qarzdorlar',     label: "Oila a'zolari",     icon: '👨‍👩‍👧‍👦' },
  { to: '/muddati-otgan',  label: "Muddati o'tgan",   icon: '⚠️' },
  { to: '/mahsulotlar',    label: 'Tovarlar',          icon: '🛒' },
  { to: '/sozlamalar',     label: 'Sozlamalar',        icon: '⚙️' },
  { to: '/naxt-sotuv',     label: 'Naqd xarid',        icon: '💵' },
  ...(role === 'admin' ? [
    { to: '/admin',          label: 'Admin',            icon: '👑', isAdmin: true },
    { to: '/kirish-tarixi',  label: 'Kirish tarixi',   icon: '🛡️' },
  ] : []),
];

// ─── Global Qidiruv ───────────────────────────────────────────────────────────
function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ qarzdorlar: [], mahsulotlar: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Ctrl+K / Cmd+K tugmasi
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else { setQuery(''); setResults({ qarzdorlar: [], mahsulotlar: [] }); }
  }, [open]);

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults({ qarzdorlar: [], mahsulotlar: [] }); return; }
    setLoading(true);
    try {
      const [qRes, mRes] = await Promise.all([
        axios.get(`/api/qarzdorlar/search?q=${encodeURIComponent(q)}`).catch(() => ({ data: [] })),
        axios.get(`/api/mahsulotlar?search=${encodeURIComponent(q)}`).catch(() => ({ data: [] })),
      ]);
      setResults({ qarzdorlar: qRes.data.slice(0, 5), mahsulotlar: mRes.data.slice(0, 5) });
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  const go = (path) => { navigate(path); setOpen(false); };

  const total = results.qarzdorlar.length + results.mahsulotlar.length;

  return (
    <>
      {/* Topbar da qidiruv tugmasi */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg3)', border: '1px solid var(--border2)',
          borderRadius: 10, padding: '7px 14px', cursor: 'pointer',
          color: 'var(--text3)', fontSize: 13, transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text3)'; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <span>Qidirish</span>
        <span style={{ fontSize: 10, background: 'var(--bg4)', padding: '1px 6px', borderRadius: 5, fontFamily: 'JetBrains Mono, monospace' }}>⌘K</span>
      </button>

      {/* Modal */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            zIndex: 9000, display: 'flex', alignItems: 'flex-start',
            justifyContent: 'center', paddingTop: '15vh',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 560, background: 'var(--bg2)',
              border: '1px solid var(--border2)', borderRadius: 16,
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
              overflow: 'hidden',
            }}
          >
            {/* Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="A'zo yoki tovar qidiring..."
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: 'var(--text)', fontSize: 16, fontFamily: 'inherit',
                }}
              />
              {loading && <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />}
              <kbd onClick={() => setOpen(false)} style={{
                fontSize: 11, color: 'var(--text3)', background: 'var(--bg3)',
                padding: '2px 8px', borderRadius: 6, cursor: 'pointer', border: '1px solid var(--border)',
              }}>Esc</kbd>
            </div>

            {/* Natijalar */}
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {!query.trim() ? (
                <div style={{ padding: '24px 18px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                  Qidirish uchun yozing...
                </div>
              ) : total === 0 && !loading ? (
                <div style={{ padding: '24px 18px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                  "{query}" bo'yicha hech narsa topilmadi
                </div>
              ) : (
                <>
                  {results.qarzdorlar.length > 0 && (
                    <div>
                      <div style={{ padding: '10px 18px 4px', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        👨‍👩‍👧‍👦 Oila a'zolari ({results.qarzdorlar.length})
                      </div>
                      {results.qarzdorlar.map(q => (
                        <div
                          key={q.id}
                          onClick={() => go(`/qarzdorlar/${q.id}`)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 18px', cursor: 'pointer',
                            transition: 'background 0.1s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <Avatar name={`${q.ism} ${q.familiya || ''}`} size={32} radius={8} fontSize={12} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{q.ism} {q.familiya}</div>
                            <div style={{ fontSize: 12, color: 'var(--text3)' }}>📞 {q.telefon}</div>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: Number(q.jami_qarz) > 0 ? '#ef4444' : '#10b981' }}>
                            {Number(q.jami_qarz || 0).toLocaleString('uz-UZ')} so'm
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {results.mahsulotlar.length > 0 && (
                    <div>
                      <div style={{ padding: '10px 18px 4px', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        🛒 Mahsulotlar ({results.mahsulotlar.length})
                      </div>
                      {results.mahsulotlar.map(m => (
                        <div
                          key={m.id}
                          onClick={() => go('/mahsulotlar')}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 18px', cursor: 'pointer',
                            transition: 'background 0.1s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{
                            width: 32, height: 32, borderRadius: 8, background: 'var(--bg4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                          }}>{m.emoji || '📦'}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{m.nomi}</div>
                            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                              {Number(m.miqdor || 0).toLocaleString()} {m.birlik} qoldi
                            </div>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                            {Number(m.narx || 0).toLocaleString('uz-UZ')} so'm
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {total > 0 && (
              <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', display: 'flex', gap: 16, fontSize: 11, color: 'var(--text3)' }}>
                <span>↵ Ochish</span>
                <span>Esc Yopish</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Hisobot Modal ────────────────────────────────────────────────────────────
function HisobotModal({ onClose }) {
  const [loading, setLoading] = useState(false);
  const [tur, setTur] = useState('oylik');
  const [yil, setYil] = useState(new Date().getFullYear());
  const [oy, setOy] = useState(new Date().getMonth() + 1);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const oylar = [
    'Yanvar','Fevral','Mart','Aprel','May','Iyun',
    'Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'
  ];

  const loadPreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const [statsRes, qarzdorlarRes, mahsulotlarRes, monthlyRes] = await Promise.all([
        axios.get('/api/stats'),
        axios.get('/api/qarzdorlar'),
        axios.get('/api/mahsulotlar'),
        axios.get('/api/stats/monthly'),
      ]);
      setPreview({
        stats: statsRes.data,
        qarzdorlar: qarzdorlarRes.data,
        mahsulotlar: mahsulotlarRes.data,
        monthly: monthlyRes.data,
      });
    } catch { }
    setPreviewLoading(false);
  }, []);

  useEffect(() => { loadPreview(); }, [loadPreview]);

  const generatePDF = async () => {
    if (!preview) return;
    setLoading(true);
    try {
      // jsPDF dinamik import
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const now = new Date();
      const davr = tur === 'oylik'
        ? `${oylar[oy - 1]} ${yil}`
        : `${yil} yil`;

      // ── Sarlavha ──
      doc.setFillColor(108, 99, 255);
      doc.rect(0, 0, pageW, 38, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text("UY HISOBOT", 14, 16);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`${tur === 'oylik' ? 'Oylik' : 'Yillik'} hisobot — ${davr}`, 14, 25);
      doc.setFontSize(9);
      doc.text(`Tuzilgan: ${now.toLocaleString('uz-UZ')}`, 14, 33);

      let y = 48;

      // ── Umumiy statistika ──
      doc.setTextColor(60, 60, 80);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Umumiy holat', 14, y);
      y += 8;

      const stats = preview.stats;
      autoTable(doc, {
        startY: y,
        head: [['Ko\'rsatkich', 'Qiymat']],
        body: [
          ["Jami oila a'zolari", `${stats.jami_qarzdorlar} kishi`],
          ["Umumiy qarz (jami berilgan)", `${Number(stats.jami_qarz || 0).toLocaleString()} so'm`],
          ["To'langan summa", `${Number(stats.tolov_qilingan || 0).toLocaleString()} so'm`],
          ["Qolgan qarz", `${Number(stats.qolgan_qarz || 0).toLocaleString()} so'm`],
          ["Muddati o'tgan qarzlar", `${stats.muddati_otgan} ta`],
          ["To'lov foizi", `${stats.tolov_foizi}%`],
        ],
        headStyles: { fillColor: [108, 99, 255], textColor: 255, fontSize: 10, fontStyle: 'bold' },
        bodyStyles: { fontSize: 10 },
        alternateRowStyles: { fillColor: [248, 248, 252] },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 12;

      // ── Oylik dinamika ──
      if (preview.monthly && preview.monthly.length > 0) {
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 60, 80);
        doc.text('Oylik dinamika (so\'nggi 6 oy)', 14, y);
        y += 8;

        autoTable(doc, {
          startY: y,
          head: [['Oy', 'Yangi qarz', 'To\'lov', 'Soni']],
          body: preview.monthly.map(m => [
            m.oy,
            `${Number(m.qarz || 0).toLocaleString()} so'm`,
            `${Number(m.tolov || 0).toLocaleString()} so'm`,
            `${m.soni || 0} ta`,
          ]),
          headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 10, fontStyle: 'bold' },
          bodyStyles: { fontSize: 10 },
          alternateRowStyles: { fillColor: [248, 252, 250] },
          margin: { left: 14, right: 14 },
        });
        y = doc.lastAutoTable.finalY + 12;
      }

      // ── Top qarzdorlar ──
      const topQarz = [...preview.qarzdorlar]
        .filter(q => Number(q.jami_qarz) > 0)
        .sort((a, b) => Number(b.jami_qarz) - Number(a.jami_qarz))
        .slice(0, 15);

      if (topQarz.length > 0) {
        if (y > 220) { doc.addPage(); y = 20; }
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 60, 80);
        doc.text("Eng ko'p qarzi bor a'zolar", 14, y);
        y += 8;

        autoTable(doc, {
          startY: y,
          head: [['#', 'Ism', 'Telefon', 'Qarz (so\'m)']],
          body: topQarz.map((q, i) => [
            i + 1,
            `${q.ism || ''} ${q.familiya || ''}`.trim(),
            q.telefon || '',
            Number(q.jami_qarz || 0).toLocaleString(),
          ]),
          headStyles: { fillColor: [239, 68, 68], textColor: 255, fontSize: 10, fontStyle: 'bold' },
          bodyStyles: { fontSize: 10 },
          alternateRowStyles: { fillColor: [255, 248, 248] },
          columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
          margin: { left: 14, right: 14 },
        });
        y = doc.lastAutoTable.finalY + 12;
      }

      // ── Mahsulotlar holati ──
      if (preview.mahsulotlar && preview.mahsulotlar.length > 0) {
        if (y > 200) { doc.addPage(); y = 20; }
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 60, 80);
        doc.text('Mahsulotlar holati', 14, y);
        y += 8;

        autoTable(doc, {
          startY: y,
          head: [['Mahsulot', 'Birlik', 'Qoldi', 'Narx (so\'m)']],
          body: preview.mahsulotlar.slice(0, 20).map(m => [
            `${m.emoji || ''} ${m.nomi}`.trim(),
            m.birlik || 'dona',
            Number(m.miqdor || 0).toLocaleString(),
            Number(m.narx || 0).toLocaleString(),
          ]),
          headStyles: { fillColor: [245, 158, 11], textColor: 255, fontSize: 10, fontStyle: 'bold' },
          bodyStyles: { fontSize: 10 },
          alternateRowStyles: { fillColor: [255, 253, 245] },
          columnStyles: { 3: { halign: 'right' } },
          margin: { left: 14, right: 14 },
        });
      }

      // ── Footer ──
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(160, 160, 180);
        doc.text(
          `Uy Hisobot — ${davr} hisobot | Sahifa ${i} / ${pageCount}`,
          pageW / 2, doc.internal.pageSize.getHeight() - 8,
          { align: 'center' }
        );
      }

      const fileName = `uy-hisobot-${tur === 'oylik' ? `${yil}-${String(oy).padStart(2,'0')}` : yil}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error('PDF xatosi:', err);
      alert('PDF yaratishda xatolik: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2>📄 Hisobot yaratish</h2>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>
              PDF formatida yuklab olish
            </div>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {/* Tur tanlash */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Hisobot turi
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[{ val: 'oylik', label: '📅 Oylik' }, { val: 'yillik', label: '📆 Yillik' }].map(t => (
                <button
                  key={t.val}
                  onClick={() => setTur(t.val)}
                  className={`btn ${tur === t.val ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Davr tanlash */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Davr
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">Yil</label>
                <select value={yil} onChange={e => setYil(Number(e.target.value))} className="form-input">
                  {[2023, 2024, 2025, 2026].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              {tur === 'oylik' && (
                <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                  <label className="form-label">Oy</label>
                  <select value={oy} onChange={e => setOy(Number(e.target.value))} className="form-input">
                    {oylar.map((o, i) => (
                      <option key={i + 1} value={i + 1}>{o}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          {previewLoading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text3)', fontSize: 13 }}>
              <div className="spinner" style={{ margin: '0 auto 8px' }} />
              Ma'lumotlar yuklanmoqda...
            </div>
          ) : preview && (
            <div style={{ background: 'var(--bg3)', borderRadius: 12, padding: '16px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                📊 Hisobotga kiritiladigan ma'lumotlar
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { icon: '👨‍👩‍👧‍👦', label: "Jami oila a'zolari", val: `${preview.stats.jami_qarzdorlar} ta` },
                  { icon: '💸', label: 'Qolgan qarz', val: `${Number(preview.stats.qolgan_qarz || 0).toLocaleString()} so'm` },
                  { icon: '✅', label: "To'langan", val: `${Number(preview.stats.tolov_qilingan || 0).toLocaleString()} so'm` },
                  { icon: '📦', label: 'Mahsulotlar', val: `${preview.mahsulotlar.length} xil` },
                  { icon: '⚠️', label: "Muddati o'tgan", val: `${preview.stats.muddati_otgan} ta` },
                  { icon: '📈', label: "To'lov foizi", val: `${preview.stats.tolov_foizi}%` },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{item.val}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text3)', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                📋 Hisobotda: Umumiy statistika • Oylik dinamika • Eng faol a'zolar • Tovarlar holati
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Bekor qilish</button>
          <button
            className="btn btn-primary"
            onClick={generatePDF}
            disabled={loading || previewLoading}
            style={{ minWidth: 160 }}
          >
            {loading ? (
              <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, marginRight: 8 }} />Yaratilmoqda...</>
            ) : (
              `📄 PDF yuklab olish`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ripples, setRipples] = useState({});
  const [showHisobot, setShowHisobot] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };
  const items = getNavItems(user?.role);

  const handleNavClick = (to, e) => {
    setSidebarOpen(false);
    const rect = e.currentTarget.getBoundingClientRect();
    const rpl = { x: e.clientX - rect.left, y: e.clientY - rect.top, id: Date.now() };
    setRipples(prev => ({ ...prev, [to]: rpl }));
    setTimeout(() => setRipples(prev => { const n = { ...prev }; delete n[to]; return n; }), 600);
  };

  return (
    <div className="app-layout">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">🏪</div>
          <div className="brand-text">
            <span className="brand-name">Uy Hisobot</span>
            <span className="brand-sub">Boshqaruv tizimi</span>
          </div>
        </div>

        <div className="sidebar-user">
          <Avatar name={user?.full_name} size={34} radius={9} fontSize={13} />
          <div className="user-info-sidebar">
            <span className="user-name-sidebar">{user?.full_name}</span>
            <span className="user-shop-sidebar">{user?.dokon_nomi}</span>
          </div>
          {user?.role === 'admin' && <span style={{ fontSize: 14 }} title="Admin">👑</span>}
        </div>

        <div className="sidebar-divider" />

        <nav className="sidebar-nav">
          <span className="nav-section-label">Menyu</span>
          {items.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            const ripple = ripples[item.to];
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={`nav-btn ${isActive ? 'nav-btn--active' : ''} ${item.isAdmin ? 'nav-btn--admin' : ''}`}
                onClick={(e) => handleNavClick(item.to, e)}
              >
                <span className="nav-btn-icon">{item.icon}</span>
                <span className="nav-btn-label">{item.label}</span>
                {isActive && <span className="nav-btn-dot" />}
                {ripple && (
                  <span key={ripple.id} className="nav-ripple"
                    style={{ left: ripple.x, top: ripple.y }} />
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-divider" />
          {/* Hisobot tugmasi sidebar pastida */}
          <button
            className="nav-btn"
            onClick={() => setShowHisobot(true)}
            style={{ width: '100%', marginBottom: 6 }}
          >
            <span className="nav-btn-icon">📄</span>
            <span className="nav-btn-label">Hisobot</span>
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            <span>🚪</span><span>Chiqish</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Menyu"
          >
            <span className={`hamburger-line ${sidebarOpen ? 'hamburger-line--top-open' : ''}`} />
            <span className={`hamburger-line ${sidebarOpen ? 'hamburger-line--mid-hide' : ''}`} />
            <span className={`hamburger-line ${sidebarOpen ? 'hamburger-line--bot-open' : ''}`} />
          </button>

          {/* Global qidiruv — topbar o'rtasida */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            <GlobalSearch />
          </div>

          <div className="topbar-right">
            {/* Hisobot tugmasi — desktop */}
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowHisobot(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              📄 Hisobot
            </button>
            <span className="topbar-username">@{user?.username}</span>
            {user?.role === 'admin' && <span className="badge badge-red">👑 Admin</span>}
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>

      {showHisobot && <HisobotModal onClose={() => setShowHisobot(false)} />}
    </div>
  );
}