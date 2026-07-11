import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import SummaInput, { formatSum } from '../components/SummaInput';
import Avatar from '../components/Avatar';
import toast from 'react-hot-toast';
import ParolModal from '../components/ParolModal';


function AddQarzModal({ qarzdorId, onClose, onSuccess }) {
  const [mahsulotlar, setMahsulotlar] = useState([]);
  const [mahsulotLoading, setMahsulotLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Qarz asosiy ma'lumotlar
  const [sana, setSana] = useState(new Date().toISOString().split('T')[0]);
  const [muddat, setMuddat] = useState('');
  const [valyuta, setValyuta] = useState('UZS');

  // Ko'p mahsulot — har biri: { mahsulot_id, miqdor, narx, nomi, birlik, emoji }
  const [qatorlar, setQatorlar] = useState([
    { id: Date.now(), mahsulot_id: '', miqdor: 1, narx: '', nomi: '', birlik: 'dona', emoji: '📦', custom: false }
  ]);

  // Qo'lda summa (mahsulot tanlanmagan qator uchun)
  const [qolSumma, setQolSumma] = useState('');

  useEffect(() => {
    setMahsulotLoading(true);
    axios.get('/api/mahsulotlar')
      .then(r => setMahsulotlar(r.data))
      .catch(() => {})
      .finally(() => setMahsulotLoading(false));
  }, []);

  const birlikLabel = (b) => {
    const MAP = {
      'dona':'dona','quti':'quti','paket':'paket','juft':'juft',
      'g':'g','50g':'50g','100g':'100g','250g':'250g','500g':'500g',
      'kg':'kg','2kg':'2kg','5kg':'5kg','10kg':'10kg','25kg':'25kg','50kg':'50kg',
      'ml':'ml','100ml':'100ml','200ml':'200ml','250ml':'250ml','330ml':'330ml',
      '0.5l':'0.5 litr','0.75l':'0.75 litr','1l':'1 litr','1.5l':'1.5 litr',
      '2l':'2 litr','3l':'3 litr','5l':'5 litr','10l':'10 litr','19l':'19 litr',
      'litr':'litr','sm':'sm','metr':'m','m2':'m²','rol':'rulon',
      'soat':'soat','kun':'kun','oy':'oy','xizmat':'xizmat',
    };
    return MAP[b] || b || 'dona';
  };

  const isKasr = (b) => ['g','kg','litr','ml','metr','sm','m2'].includes(b);

  // Qator o'zgartirishlar
  const updateQator = (id, field, val) => {
    setQatorlar(prev => prev.map(q => q.id === id ? { ...q, [field]: val } : q));
  };

  const selectMahsulot = (rowId, mahsulotId) => {
    const m = mahsulotlar.find(m => String(m.id) === mahsulotId);
    if (m) {
      setQatorlar(prev => prev.map(q => q.id === rowId ? {
        ...q,
        mahsulot_id: m.id,
        nomi: m.nomi,
        birlik: m.birlik,
        emoji: m.emoji || '📦',
        narx: Number(m.narx),
        miqdor: 1,
        custom: false,
        _mahsulot: m
      } : q));
    } else {
      setQatorlar(prev => prev.map(q => q.id === rowId ? {
        ...q, mahsulot_id: '', nomi: '', birlik: 'dona', emoji: '📦', narx: '', miqdor: 1, custom: true, _mahsulot: null
      } : q));
    }
  };

  const addQator = () => {
    setQatorlar(prev => [...prev, {
      id: Date.now(), mahsulot_id: '', miqdor: 1, narx: '', nomi: '', birlik: 'dona', emoji: '📦', custom: false
    }]);
  };

  const removeQator = (id) => {
    if (qatorlar.length === 1) return;
    setQatorlar(prev => prev.filter(q => q.id !== id));
  };

  // Jami summa hisoblash
  const jamiSumma = qatorlar.reduce((sum, q) => {
    if (q.mahsulot_id && q.narx && q.miqdor) return sum + Number(q.narx) * Number(q.miqdor);
    if (q.custom && q.narx) return sum + Number(q.narx);
    return sum;
  }, 0) || Number(qolSumma) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validatsiya
    const mahsulotQatorlar = qatorlar.filter(q => q.mahsulot_id || (q.custom && q.narx));
    if (mahsulotQatorlar.length === 0 && !qolSumma) {
      return setError("Kamida 1 ta mahsulot tanlang yoki summa kiriting");
    }

    // Har bir mahsulot miqdori yetarlimi?
    for (const q of qatorlar) {
      if (q.mahsulot_id && q._mahsulot) {
        if (Number(q.miqdor) > Number(q._mahsulot.miqdor)) {
          return setError(`"${q.nomi}" yetarli emas! Mavjud: ${q._mahsulot.miqdor} ${birlikLabel(q.birlik)}`);
        }
      }
    }

    setLoading(true);
    try {
      const mahsulotlarRoyxat = qatorlar
        .filter(q => q.mahsulot_id)
        .map(q => ({ mahsulot_id: q.mahsulot_id, miqdor: parseFloat(q.miqdor) || 1 }));

      const sabab = qatorlar
        .filter(q => q.nomi)
        .map(q => q.nomi)
        .join(', ') || '';

      // Birinchi mahsulot (asosiy) — qarz uchun
      const birinchi = qatorlar.find(q => q.mahsulot_id) || qatorlar[0];

      await axios.post('/api/qarzlar', {
        qarzdor_id: qarzdorId,
        summa: jamiSumma || Number(qolSumma),
        valyuta,
        sana,
        muddat: muddat || null,
        sabab,
        mahsulot_id: birinchi?.mahsulot_id || null,
        mahsulot_miqdor: birinchi?.miqdor || 1,
        mahsulotlar_royxat: mahsulotlarRoyxat,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || "Xatolik yuz berdi");
    } finally { setLoading(false); }
  };

  const faqatQolSumma = qatorlar.every(q => !q.mahsulot_id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>💸 Yangi qarz qo'shish</h2>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-msg">⚠️ {error}</div>}

            {/* ===== MAHSULOTLAR RO'YXATI ===== */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <label className="form-label" style={{ margin: 0 }}>🛒 Mahsulotlar</label>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addQator}>
                  ＋ Qo'shish
                </button>
              </div>

              {mahsulotLoading && (
                <div style={{ padding: 10, color: 'var(--text3)', fontSize: 13 }}>⏳ Yuklanmoqda...</div>
              )}

              {qatorlar.map((q, idx) => {
                const m = q._mahsulot;
                const qatorSumma = q.mahsulot_id && q.narx && q.miqdor
                  ? Number(q.narx) * Number(q.miqdor) : 0;

                return (
                  <div key={q.id} style={{
                    background: 'var(--bg3)', borderRadius: 10, padding: '12px',
                    marginBottom: 8, border: '1px solid var(--border)', position: 'relative'
                  }}>
                    {/* Qator nomer + o'chirish */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700 }}>
                        {idx + 1}-mahsulot
                      </span>
                      {qatorlar.length > 1 && (
                        <button type="button" onClick={() => removeQator(q.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16, lineHeight: 1 }}>
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Mahsulot select */}
                    {!mahsulotLoading && (
                      <select
                        className="form-input"
                        value={q.mahsulot_id}
                        onChange={e => selectMahsulot(q.id, e.target.value)}
                        style={{ marginBottom: 8 }}
                      >
                        <option value="">— Qo'lda yozish —</option>
                        {mahsulotlar.map(m => (
                          <option key={m.id} value={m.id} disabled={Number(m.miqdor) <= 0}>
                            {m.emoji || '📦'} {m.nomi} — {formatSum(m.narx)} so'm
                            ({Number(m.miqdor)} {birlikLabel(m.birlik)} qoldi)
                            {Number(m.miqdor) <= 0 ? ' [TUGAGAN]' : ''}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Mahsulot tanlangan: miqdor input */}
                    {q.mahsulot_id && m && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'var(--bg)' }}>
                          <button type="button"
                            onClick={() => updateQator(q.id, 'miqdor', Math.max(isKasr(q.birlik) ? 0.001 : 1, Number(q.miqdor) - 1))}
                            style={{ width: 36, height: 40, border: 'none', background: 'var(--bg2)', cursor: 'pointer', fontSize: 18, color: 'var(--text)', fontWeight: 700 }}>
                            −
                          </button>
                          <input
                            type="number"
                            min={isKasr(q.birlik) ? '0.001' : '1'}
                            max={m.miqdor}
                            step={isKasr(q.birlik) ? 'any' : '1'}
                            value={q.miqdor}
                            onChange={e => updateQator(q.id, 'miqdor', e.target.value)}
                            style={{ width: 70, height: 40, border: 'none', textAlign: 'center', fontWeight: 700, fontSize: 15, background: 'transparent', color: 'var(--text)', outline: 'none' }}
                          />
                          <button type="button"
                            onClick={() => updateQator(q.id, 'miqdor', Math.min(Number(m.miqdor), Number(q.miqdor) + 1))}
                            style={{ width: 36, height: 40, border: 'none', background: 'var(--bg2)', cursor: 'pointer', fontSize: 18, color: 'var(--text)', fontWeight: 700 }}>
                            ＋
                          </button>
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>{birlikLabel(q.birlik)}</span>
                        <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--accent2)', fontSize: 14 }}>
                          = {formatSum(qatorSumma)} so'm
                        </span>
                        {Number(q.miqdor) > Number(m.miqdor) && (
                          <div style={{ width: '100%', color: '#ef4444', fontSize: 12 }}>
                            ⚠️ Yetarli emas! Mavjud: {m.miqdor} {birlikLabel(q.birlik)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Qo'lda: nom + narx */}
                    {!q.mahsulot_id && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <input className="form-input" style={{ flex: 1, minWidth: 140 }}
                          placeholder="Sabab / nomi"
                          value={q.nomi}
                          onChange={e => updateQator(q.id, 'nomi', e.target.value)}
                        />
                        <SummaInput
                          value={q.narx}
                          onChange={val => updateQator(q.id, 'narx', val)}
                          placeholder="Summa"
                          className="form-input"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Jami summa banner */}
            {jamiSumma > 0 && (
              <div style={{
                background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
                borderRadius: 10, padding: '12px 16px', marginBottom: 14,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ color: 'var(--text2)', fontSize: 13 }}>
                  {qatorlar.filter(q => q.mahsulot_id || (q.nomi && q.narx)).length} ta mahsulot
                </span>
                <strong style={{ fontSize: 18, color: 'var(--accent2)' }}>
                  Jami: {formatSum(jamiSumma)} so'm
                </strong>
              </div>
            )}

            {/* Qo'lda summa (mahsulot tanlanmagan bo'lsa) */}
            {faqatQolSumma && !qatorlar.some(q => q.nomi && q.narx) && (
              <div className="form-group">
                <label className="form-label">Summa *</label>
                <SummaInput value={qolSumma} onChange={setQolSumma} placeholder="100 000" />
              </div>
            )}

            {/* Sana + Muddat */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Qarz sanasi *</label>
                <input type="date" value={sana} onChange={e => setSana(e.target.value)} className="form-input" required />
              </div>
              <div className="form-group">
                <label className="form-label">Qaytarish muddati</label>
                <input type="date" value={muddat} onChange={e => setMuddat(e.target.value)} className="form-input" />
              </div>
            </div>

            {/* Valyuta */}
            <div className="form-group">
              <label className="form-label">Valyuta</label>
              <select value={valyuta} onChange={e => setValyuta(e.target.value)} className="form-input">
                <option value="UZS">🇺🇿 UZS (so'm)</option>
                <option value="USD">🇺🇸 USD (dollar)</option>
                <option value="EUR">🇪🇺 EUR (yevro)</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Bekor</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : `💸 ${formatSum(jamiSumma || qolSumma)} so'm qarz qo'shish`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddTolovModal({ qarzId, qarzSumma, onClose, onSuccess }) {
  const [form, setForm] = useState({ summa: '', sana: new Date().toISOString().split('T')[0], izoh: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.summa) return setError("Summa kiritilmadi");
    setLoading(true);
    try {
      await axios.post(`/api/qarzlar/${qarzId}/tolov`, { ...form, summa: Number(form.summa) });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || "Xatolik");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2>✅ To'lov qo'shish</h2>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-msg">⚠️ {error}</div>}
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--text2)' }}>
              Qolgan qarz: <strong style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono', fontSize: 15 }}>{formatSum(qarzSumma)} so'm</strong>
            </div>
            <div className="form-group">
              <label className="form-label">To'lov summasi *</label>
              <SummaInput value={form.summa} onChange={val => setForm({...form, summa: val})} placeholder={formatSum(qarzSumma)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Sana *</label>
              <input type="date" value={form.sana} onChange={e => setForm({...form, sana: e.target.value})} className="form-input" required />
            </div>
            <div className="form-group">
              <label className="form-label">Izoh</label>
              <input value={form.izoh} onChange={e => setForm({...form, izoh: e.target.value})} className="form-input" placeholder="Ixtiyoriy..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Bekor</button>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? <span className="spinner" /> : "✅ To'lov saqlash"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ✅ YANGI: Muddat uzaytirish modal
function MuddatModal({ qarzId, currentMuddat, onClose, onSuccess }) {
  const [yangiMuddat, setYangiMuddat] = useState('');
  const [sabab, setSabab] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!yangiMuddat) return setError("Yangi muddat kiriting");
    setLoading(true);
    try {
      await axios.put(`/api/qarzlar/${qarzId}/muddat`, { yangi_muddat: yangiMuddat, sabab });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || "Xatolik");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <h2>📅 Muddatni uzaytirish</h2>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-msg">⚠️ {error}</div>}
            {currentMuddat && (
              <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--text2)' }}>
                Hozirgi muddat: <strong>{new Date(currentMuddat).toLocaleDateString('uz-UZ')}</strong>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Yangi muddat *</label>
              <input type="date" value={yangiMuddat} onChange={e => setYangiMuddat(e.target.value)} className="form-input" required />
            </div>
            <div className="form-group">
              <label className="form-label">Sababni izoh (ixtiyoriy)</label>
              <input value={sabab} onChange={e => setSabab(e.target.value)} className="form-input" placeholder="Masalan: kelishuvga ko'ra..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Bekor</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : "📅 Saqlash"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function QarzdorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQarzModal, setShowQarzModal] = useState(false);
  const [showTolovModal, setShowTolovModal] = useState(null);
  const [showMuddatModal, setShowMuddatModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [parolModal, setParolModal] = useState(null); // 'qarzdor' | 'qarz:{id}'
  const [eslatmaKopiyalandi, setEslatmaKopiyalandi] = useState(false);
  // ✅ YANGI: eslatma tahrirlash
  const [eslatmaEdit, setEslatmaEdit] = useState(false);
  const [eslatmaText, setEslatmaText] = useState('');
  const [eslatmaSaving, setEslatmaSaving] = useState(false);

  const load = useCallback(() => {
    axios.get(`/api/qarzdorlar/${id}`)
      .then(r => {
        setData(r.data);
        setEslatmaText(r.data.eslatma || '');
        setLoading(false);
      })
      .catch(() => navigate('/qarzdorlar'));
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    await axios.delete(`/api/qarzdorlar/${id}`);
    navigate('/qarzdorlar');
  };

  const handleCloseQarz = async (qarzId) => {
    await axios.put(`/api/qarzlar/${qarzId}/close`);
    load();
  };

  // ✅ YANGI: Eslatma saqlash
  const handleEslatmaSave = async () => {
    setEslatmaSaving(true);
    try {
      await axios.put(`/api/qarzdorlar/${id}`, {
        ism: data.ism, familiya: data.familiya, telefon: data.telefon,
        telegram: data.telegram, instagram: data.instagram, whatsapp: data.whatsapp,
        manzil: data.manzil, izoh: data.izoh, eslatma: eslatmaText
      });
      setEslatmaEdit(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Xatolik");
    } finally { setEslatmaSaving(false); }
  };

  const printChek = (qarz) => {
    const win = window.open('', '_blank', 'width=320,height=500');
    const sana = new Date(qarz.sana).toLocaleDateString('uz-UZ');
    const qarzKod = qarz.qarz_raqam ? `QRZ-${String(qarz.qarz_raqam).padStart(4,'0')}` : '';
    win.document.write(`
      <html><head><title>Chek</title>
      <style>
        body{font-family:monospace;width:280px;margin:0 auto;padding:10px;font-size:12px}
        h2{text-align:center;font-size:14px;border-bottom:1px dashed #000;padding-bottom:6px}
        .row{display:flex;justify-content:space-between;margin:3px 0}
        .total{font-size:16px;font-weight:bold;border-top:1px dashed #000;padding-top:6px;margin-top:6px}
        .footer{text-align:center;margin-top:10px;font-size:10px;color:#666}
        .qrz{color:#999;font-size:10px;text-align:right}
      </style></head><body>
      <h2>🏠 Uy Hisobot<br/><small>${data?.dokon_nomi || ''}</small></h2>
      ${qarzKod ? `<div class="qrz">#${qarzKod}</div>` : ''}
      <div class="row"><span>A'zo:</span><span>${data.ism} ${data.familiya || ''}</span></div>
      <div class="row"><span>Telefon:</span><span>${data.telefon}</span></div>
      <div class="row"><span>Sana:</span><span>${sana}</span></div>
      <div class="row"><span>Sabab:</span><span>${qarz.sabab || '—'}</span></div>
      <div class="row total"><span>Qarz summasi:</span><span>${Number(qarz.summa).toLocaleString('uz-UZ')} ${qarz.valyuta}</span></div>
      <div class="row"><span>To'langan:</span><span style="color:green">${Number(Number(qarz.summa)-Number(qarz.qolgan_summa)).toLocaleString('uz-UZ')} ${qarz.valyuta}</span></div>
      <div class="row"><span>Qolgan:</span><span style="color:red">${Number(qarz.qolgan_summa).toLocaleString('uz-UZ')} ${qarz.valyuta}</span></div>
      <div class="footer">${new Date().toLocaleString('uz-UZ')}<br/>Uy Hisobot tizimi</div>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  const copyEslatma = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setEslatmaKopiyalandi(true);
      setTimeout(() => setEslatmaKopiyalandi(false), 2000);
    });
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  if (!data) return null;

  const activeQarzlar = data.qarzlar?.filter(q => q.status === 'active') || [];
  const paidQarzlar = data.qarzlar?.filter(q => q.status === 'paid') || [];
  const jami_qarz = activeQarzlar.reduce((s, q) => s + Number(q.qolgan_summa || 0), 0);

  const xabarMatni = `Assalomu alaykum ${data.ism}! Sizda hisobda qarz bor edi: ${formatSum(jami_qarz)} so'm. Iltimos, imkoningiz bo'lsa to'lab qo'ysangiz. Rahmat! 🙏`;

  return (
    <div>
      <button className="btn btn-secondary btn-sm" onClick={() => navigate('/qarzdorlar')} style={{ marginBottom: 20 }}>
        ← Orqaga
      </button>

      <div className="detail-header">
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flex: 1, flexWrap: 'wrap' }}>
          <Avatar name={`${data.ism} ${data.familiya || ''}`} size={64} radius={16} fontSize={24} />
          <div className="detail-info">
            <h1>{data.ism} {data.familiya}</h1>
            <div className="contact-links" style={{ marginBottom: 8 }}>
              <a href={`tel:${data.telefon}`} className="contact-link cl-phone">📞 {data.telefon}</a>
              {data.telegram && (
                <a href={data.telegram.startsWith('+') ? `https://t.me/${data.telegram}` : `https://t.me/${data.telegram.replace('@','')}`}
                  target="_blank" rel="noreferrer" className="contact-link cl-telegram">
                  ✈️ {data.telegram}
                </a>
              )}
              {data.whatsapp && (
                <a href={`https://wa.me/${data.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="contact-link cl-whatsapp">
                  💬 {data.whatsapp}
                </a>
              )}
              {data.instagram && (
                <a href={`https://instagram.com/${data.instagram.replace('@','')}`} target="_blank" rel="noreferrer" className="contact-link cl-instagram">
                  📸 {data.instagram}
                </a>
              )}
            </div>
            {data.manzil && <p>📍 {data.manzil}</p>}
            {data.izoh && <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>💬 {data.izoh}</p>}
          </div>
        </div>
        <div className="detail-total">
          <div className="detail-total-label">Jami qarz</div>
          <div className="detail-total-value">{formatSum(jami_qarz)} so'm</div>
        </div>
      </div>

      {/* ✅ YANGI: Shaxsiy eslatma */}
      <div className="table-card" style={{ marginBottom: 16 }}>
        <div style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: eslatmaEdit ? 10 : 6 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>📝 Shaxsiy eslatma</span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setEslatmaEdit(!eslatmaEdit)}
            >
              {eslatmaEdit ? 'Bekor' : '✏️ Tahrirlash'}
            </button>
          </div>
          {eslatmaEdit ? (
            <div>
              <textarea
                value={eslatmaText}
                onChange={e => setEslatmaText(e.target.value)}
                className="form-input"
                rows={3}
                placeholder={`Masalan: "garov bor", "ishonchli", "ehtiyot bo'l"...`}
                style={{ resize: 'vertical', fontSize: 13 }}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={handleEslatmaSave}
                disabled={eslatmaSaving}
                style={{ marginTop: 8 }}
              >
                {eslatmaSaving ? '⏳ Saqlanmoqda...' : '💾 Saqlash'}
              </button>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: data.eslatma ? 'var(--text)' : 'var(--text3)', fontStyle: data.eslatma ? 'normal' : 'italic' }}>
              {data.eslatma || "Eslatma yo'q"}
            </p>
          )}
        </div>
      </div>

      {jami_qarz > 0 && (
        <div className="eslatma-card">
          <h3>📤 Qarz xabari yuborish</h3>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
            Bir tugma bilan WhatsApp/Telegram ga tayyor matn
          </p>
          <div className="eslatma-buttons">
            <a href={`tel:${data.telefon}`} className="eslatma-btn eslatma-phone">📞 Qo'ng'iroq</a>
            {data.telegram && (
              <a href={`https://t.me/${data.telegram.startsWith('+') ? data.telegram : data.telegram.replace('@','')}`}
                target="_blank" rel="noreferrer" className="eslatma-btn eslatma-telegram">
                ✈️ Telegram
              </a>
            )}
            {data.whatsapp && (
              <a href={`https://wa.me/${data.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(xabarMatni)}`}
                target="_blank" rel="noreferrer" className="eslatma-btn eslatma-whatsapp">
                💬 WhatsApp
              </a>
            )}
          </div>
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--bg3)', borderRadius: 8, fontSize: 12, color: 'var(--text2)', borderLeft: '3px solid var(--accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ userSelect: 'all', flex: 1 }}>{xabarMatni}</span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => copyEslatma(xabarMatni)}
              style={{ flexShrink: 0 }}
            >
              {eslatmaKopiyalandi ? '✅ Kopiyalandi' : '📋 Nusxa'}
            </button>
          </div>
        </div>
      )}

      <div className="table-card" style={{ marginBottom: 20 }}>
        <div className="table-header">
          <h3>💸 Faol qarzlar ({activeQarzlar.length})</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowQarzModal('qr')}>
              📷 QR kod bilan
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowQarzModal('qolda')}>
              ✍️ Qo'lda
            </button>
          </div>
        </div>
        {activeQarzlar.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
            <h3>Faol qarz yo'q</h3>
          </div>
        ) : (
          activeQarzlar.map(qarz => (
            <div key={qarz.id} className="qarz-item">
              <div className="qarz-item-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  {/* ✅ YANGI: Qarz raqami */}
                  {qarz.qarz_raqam > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', background: 'rgba(99,102,241,0.1)', padding: '2px 7px', borderRadius: 6, fontFamily: 'monospace' }}>
                      QRZ-{String(qarz.qarz_raqam).padStart(4, '0')}
                    </span>
                  )}
                  <span className="qarz-item-sabab">{qarz.sabab || "Sabab ko'rsatilmagan"}</span>
                  {qarz.mahsulot_nomi && (
                    <span style={{
                      fontSize: 11, background: 'rgba(99,102,241,0.15)', color: '#818cf8',
                      padding: '2px 8px', borderRadius: 6, fontWeight: 600, marginLeft: 4,
                      display: 'inline-flex', alignItems: 'center', gap: 4
                    }}>
                      {qarz.mahsulot_emoji} {qarz.mahsulot_nomi}
                      {qarz.mahsulot_miqdor && (
                        <span style={{ background: 'rgba(99,102,241,0.2)', borderRadius: 4, padding: '0 5px' }}>
                          {Number(qarz.mahsulot_miqdor)} {qarz.mahsulot_birlik_asl || qarz.mahsulot_birlik || ''}
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <div className="qarz-item-date">
                  📅 {new Date(qarz.sana).toLocaleDateString('uz-UZ')}
                  {qarz.muddat && (
                    <span style={{ marginLeft: 8 }}>
                      | ⏰ Muddat: {new Date(qarz.muddat).toLocaleDateString('uz-UZ')}
                      {new Date(qarz.muddat) < new Date() && (
                        <span className="badge badge-red" style={{ marginLeft: 6 }}>O'tgan!</span>
                      )}
                    </span>
                  )}
                </div>

                {/* ✅ YANGI: To'lov tarixi */}
                {qarz.tolovlar && qarz.tolovlar.length > 0 && (
                  <div style={{ marginTop: 8, paddingLeft: 8, borderLeft: '2px solid var(--accent)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>To'lovlar tarixi:</div>
                    {qarz.tolovlar.map((t, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', gap: 8, marginBottom: 2 }}>
                        <span style={{ color: '#10b981', fontWeight: 600 }}>+{formatSum(t.summa)}</span>
                        <span>{new Date(t.sana).toLocaleDateString('uz-UZ')}</span>
                        {t.izoh && <span style={{ color: 'var(--text3)' }}>— {t.izoh}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="qarz-item-amount">
                <div className="qarz-item-total amount-red">{formatSum(qarz.qolgan_summa)} {qarz.valyuta}</div>
                {Number(qarz.summa) !== Number(qarz.qolgan_summa) && (
                  <div className="qarz-item-paid">
                    Jami: {formatSum(qarz.summa)} | To'langan: {formatSum(Number(qarz.summa) - Number(qarz.qolgan_summa))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="btn btn-success btn-sm" onClick={() => setShowTolovModal(qarz)}>
                  ✅ To'lov
                </button>
                {/* ✅ YANGI: Muddat uzaytirish */}
                <button className="btn btn-secondary btn-sm" onClick={() => setShowMuddatModal(qarz)} title="Muddatni uzaytirish">
                  📅 Muddat
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => printChek(qarz)} title="Chek chiqarish">
                  🖨️
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => handleCloseQarz(qarz.id)}>
                  Yopish
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {paidQarzlar.length > 0 && (
        <div className="table-card" style={{ marginBottom: 20 }}>
          <div className="table-header">
            <h3>✅ To'langan qarzlar ({paidQarzlar.length})</h3>
          </div>
          {paidQarzlar.map(qarz => (
            <div key={qarz.id} className="qarz-item" style={{ opacity: 0.6 }}>
              <div className="qarz-item-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {qarz.qarz_raqam > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', background: 'rgba(99,102,241,0.1)', padding: '2px 7px', borderRadius: 6, fontFamily: 'monospace' }}>
                      QRZ-{String(qarz.qarz_raqam).padStart(4, '0')}
                    </span>
                  )}
                  <span className="qarz-item-sabab">{qarz.sabab || "Sabab ko'rsatilmagan"}</span>
                </div>
                <div className="qarz-item-date">{new Date(qarz.sana).toLocaleDateString('uz-UZ')}</div>
              </div>
              <div className="qarz-item-amount">
                <div className="qarz-item-total amount-green">{formatSum(qarz.summa)} {qarz.valyuta}</div>
              </div>
              <span className="badge badge-green">✅ To'langan</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" onClick={() => navigate(`/qarzdorlar/${id}/tahrirlash`)}>
          ✏️ Tahrirlash
        </button>
        {!deleteConfirm ? (
          <button className="btn btn-danger" onClick={() => setDeleteConfirm(true)}>🗑️ O'chirish</button>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--red)' }}>Rostdan ham o'chirasizmi?</span>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Ha, o'chir</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setDeleteConfirm(false)}>Yo'q</button>
          </div>
        )}
      </div>

      {(showQarzModal === 'qolda' || showQarzModal === true) && (
        <AddQarzModal qarzdorId={id} onClose={() => setShowQarzModal(false)}
          onSuccess={() => { setShowQarzModal(false); load(); }} />
      )}
      {showQarzModal === 'qr' && (
        <QarzQrModal
          qarzdorId={id}
          onClose={() => setShowQarzModal(false)}
          onSuccess={() => { setShowQarzModal(false); load(); }}
        />
      )}
      {showTolovModal && (
        <AddTolovModal qarzId={showTolovModal.id} qarzSumma={showTolovModal.qolgan_summa}
          onClose={() => setShowTolovModal(null)}
          onSuccess={() => { setShowTolovModal(null); load(); }} />
      )}
      {showMuddatModal && (
        <MuddatModal
          qarzId={showMuddatModal.id}
          currentMuddat={showMuddatModal.muddat}
          onClose={() => setShowMuddatModal(null)}
          onSuccess={() => { setShowMuddatModal(null); load(); }}
        />
      )}

      {/* ============ PAROL MODAL ============ */}
      {parolModal === 'qarzdor' && (
        <ParolModal
          title={`"${qarzdor?.ism} ${qarzdor?.familiya || ''}" ni o'chirish`}
          subtitle="A'zo va uning barcha qarz ma'lumotlari o'chib ketadi."
          danger
          onConfirm={handleDelete}
          onClose={() => setParolModal(null)}
        />
      )}
    </div>
  );
}