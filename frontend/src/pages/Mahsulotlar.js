import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

function formatSum(n) { return Number(n || 0).toLocaleString('uz-UZ'); }
function unformat(val) { return String(val).replace(/\s/g, '').replace(/,/g, '.'); }

const BIRLIK_GROUPS = [
  { group: '📦 Dona / Hisob', items: [
    { value: 'dona', label: 'Dona' }, { value: 'quti', label: 'Quti' },
    { value: 'paket', label: 'Paket' }, { value: 'juft', label: 'Juft' },
    { value: "to'plam", label: "To'plam" }, { value: 'varaq', label: 'Varaq' },
    { value: 'tayoq', label: 'Tayoq / Stick' },
  ]},
  { group: '⚖️ Og\'irlik', items: [
    { value: 'g', label: 'Gramm (g)' }, { value: '50g', label: '50 gramm' },
    { value: '100g', label: '100 gramm' }, { value: '250g', label: '250 gramm' },
    { value: '500g', label: '500 gramm' }, { value: 'kg', label: 'Kilogramm (kg)' },
    { value: '2kg', label: '2 kg' }, { value: '5kg', label: '5 kg' },
    { value: '10kg', label: '10 kg' }, { value: '25kg', label: '25 kg (qop)' },
    { value: '50kg', label: '50 kg (qop)' },
  ]},
  { group: '🧴 Hajm (suyuqlik)', items: [
    { value: 'ml', label: 'Millilitr (ml)' }, { value: '100ml', label: '100 ml' },
    { value: '200ml', label: '200 ml' }, { value: '250ml', label: '250 ml' },
    { value: '330ml', label: '330 ml (bank)' }, { value: '0.5l', label: '0.5 litr' },
    { value: '0.75l', label: '0.75 litr' }, { value: '1l', label: '1 litr' },
    { value: '1.5l', label: '1.5 litr' }, { value: '2l', label: '2 litr' },
    { value: '3l', label: '3 litr' }, { value: '5l', label: '5 litr' },
    { value: '10l', label: '10 litr' }, { value: '19l', label: '19 litr (biddon)' },
    { value: 'litr', label: 'Litr (ixtiyoriy)' },
  ]},
  { group: '📏 Uzunlik / Maydon', items: [
    { value: 'sm', label: 'Santimetr' }, { value: 'metr', label: 'Metr' },
    { value: 'm2', label: 'Kvadrat metr (m²)' }, { value: 'rol', label: 'Rulon' },
  ]},
  { group: '⏱️ Vaqt / Xizmat', items: [
    { value: 'soat', label: 'Soat' }, { value: 'kun', label: 'Kun' },
    { value: 'oy', label: 'Oy' }, { value: 'xizmat', label: 'Xizmat' },
  ]},
];
const ALL_BIRLIKLAR = BIRLIK_GROUPS.flatMap(g => g.items);
function getBirlikLabel(value) {
  const f = ALL_BIRLIKLAR.find(b => b.value === value);
  return f ? f.label : (value || 'dona');
}

const EMOJIS = ['📦','🥤','🍬','🍫','🥛','🍞','🧴','🧹','❄️','🔧','👕','📱','🍎','🥩','🧆','☕','🍵','🧃','🍺','🥫','🧂','🫙','🛒','🏠'];

// ===================== MAHSULOT BARCODE TEKSHIRUVI =====================
// Faqat savdo barcodelarini qabul qilish — URL, kanal, telegram linklar RAD etiladi
function isMahsulotBarcode(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim();

  // URL va linklar — RAD
  if (/^https?:\/\//i.test(t)) return false;
  if (/^t\.me\//i.test(t)) return false;
  if (/^telegram\./i.test(t)) return false;
  if (/^@/i.test(t)) return false;
  if (t.includes('://')) return false;
  if (t.includes('.com') || t.includes('.ru') || t.includes('.uz') || t.includes('.net') || t.includes('.org')) return false;

  // Savdo barcodelar — QABUL
  // EAN-13: 13 raqam
  if (/^\d{13}$/.test(t)) return true;
  // EAN-8: 8 raqam
  if (/^\d{8}$/.test(t)) return true;
  // UPC-A: 12 raqam
  if (/^\d{12}$/.test(t)) return true;
  // UPC-E: 6-8 raqam
  if (/^\d{6,8}$/.test(t)) return true;
  // CODE-128 / CODE-39: harflar va raqamlar, odatda qisqa
  if (/^[A-Z0-9\-\.\s\$\/\+\%]{4,30}$/.test(t)) return true;
  // ITF: juft raqamlar
  if (/^\d{4,20}$/.test(t)) return true;
  // DATA MATRIX / QR — faqat qisqa raqamli yoki kod
  if (/^[A-Za-z0-9]{4,25}$/.test(t) && !/\s/.test(t)) return true;

  return false;
}

// ===================== QR SKANER =====================
function QrSkanerModal({ onResult, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const readerRef = useRef(null);
  const animRef = useRef(null);
  const [status, setStatus] = useState('Kamera ochilmoqda...');
  const [manualInput, setManualInput] = useState('');
  const [useManual, setUseManual] = useState(false);

  useEffect(() => {
    let stopped = false;

    async function startScanner() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (stopped) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // 1-usul: Native BarcodeDetector (tez, zamonaviy brauzerlar)
        if (window.BarcodeDetector) {
          const detector = new window.BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf', 'data_matrix', 'qr_code']
          });
          setStatus('📷 Shtrix-kodni kameraga tutib turing...');

          async function detectFrame() {
            if (stopped || !videoRef.current) return;
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const text = barcodes[0].rawValue;
                if (isMahsulotBarcode(text)) {
                  stopped = true;
                  stopAll();
                  onResult(text);
                  return;
                } else {
                  setStatus('⚠️ Bu mahsulot kodi emas. Qayta skanerlang...');
                  setTimeout(() => {
                    if (!stopped) setStatus('📷 Shtrix-kodni kameraga tutib turing...');
                  }, 1500);
                }
              }
            } catch {}
            if (!stopped) animRef.current = requestAnimationFrame(detectFrame);
          }
          animRef.current = requestAnimationFrame(detectFrame);
          return;
        }

        // 2-usul: ZXing fallback (agar BarcodeDetector yo'q bo'lsa)
        if (!window.ZXing) {
          setStatus('Skaner yuklanmoqda...');
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Kutubxona yuklanmadi'));
            document.head.appendChild(script);
          });
        }

        const hints = new Map();
        const formats = [
          window.ZXing.BarcodeFormat.EAN_13,
          window.ZXing.BarcodeFormat.EAN_8,
          window.ZXing.BarcodeFormat.CODE_128,
          window.ZXing.BarcodeFormat.CODE_39,
          window.ZXing.BarcodeFormat.UPC_A,
          window.ZXing.BarcodeFormat.UPC_E,
          window.ZXing.BarcodeFormat.ITF,
          window.ZXing.BarcodeFormat.DATA_MATRIX,
          window.ZXing.BarcodeFormat.QR_CODE,
        ];
        hints.set(window.ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
        hints.set(window.ZXing.DecodeHintType.TRY_HARDER, true);

        const reader = new window.ZXing.BrowserMultiFormatReader(hints);
        readerRef.current = reader;
        setStatus('📷 Shtrix-kodni kameraga tutib turing...');

        reader.decodeFromVideoElement(videoRef.current, (result, err) => {
          if (stopped) return;
          if (result) {
            const text = result.getText();
            if (isMahsulotBarcode(text)) {
              stopped = true;
              stopAll();
              onResult(text);
            } else {
              setStatus('⚠️ Bu mahsulot kodi emas. Qayta skanerlang...');
              setTimeout(() => {
                if (!stopped) setStatus('📷 Shtrix-kodni kameraga tutib turing...');
              }, 1500);
            }
          }
        });

      } catch (err) {
        if (!stopped) {
          console.error('Kamera xatosi:', err);
          setStatus('❌ Kamera ishlamadi. Qo\'lda kiriting:');
          setUseManual(true);
        }
      }
    }

    function stopAll() {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (readerRef.current) {
        try { readerRef.current.reset(); } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    }

    startScanner();
    return () => {
      stopped = true;
      stopAll();
    };
  }, [onResult]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📷 Shtrix-kod / QR skanerlash</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* Video preview */}
          <div style={{
            position: 'relative', borderRadius: 12, overflow: 'hidden',
            background: '#000', aspectRatio: '4/3', marginBottom: 14
          }}>
            <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
            {/* Qizil nishon chizig'i */}
            <div style={{
              position: 'absolute', top: '50%', left: '10%', right: '10%',
              height: 2, background: '#ef4444',
              boxShadow: '0 0 8px #ef4444',
              transform: 'translateY(-50%)',
              animation: 'scan 2s ease-in-out infinite'
            }} />
            <style>{`
              @keyframes scan {
                0%, 100% { top: 30%; }
                50% { top: 70%; }
              }
            `}</style>
          </div>

          <div style={{
            textAlign: 'center', fontSize: 13, color: 'var(--text2)',
            marginBottom: 14, padding: '8px 12px',
            background: 'var(--bg3)', borderRadius: 8
          }}>
            {status}
          </div>

          {/* Qo'lda kiritish */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6, textAlign: 'center' }}>
              Yoki shtrix-kodni qo'lda kiriting:
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                placeholder="1234567890123"
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && manualInput.trim()) {
                    const val = manualInput.trim();
                    if (!isMahsulotBarcode(val)) {
                      setStatus('⚠️ Bu mahsulot kodi emas!');
                      return;
                    }
                    onResult(val);
                    onClose();
                  }
                }}
                autoFocus={useManual}
                inputMode="numeric"
              />
              <button
                className="btn btn-primary"
                disabled={!manualInput.trim()}
                onClick={() => {
                  const val = manualInput.trim();
                  if (!isMahsulotBarcode(val)) {
                    setStatus('⚠️ Bu mahsulot kodi emas!');
                    return;
                  }
                  onResult(val);
                  onClose();
                }}
              >
                ✓
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== SKAN NATIJASI MODAL =====================
function SkanNatijaModal({ barcode, natija, kategoriyalar, onQosh, onYangiMahsulot, onClose }) {
  const [qoshMiqdor, setQoshMiqdor] = useState(1);

  if (natija?.topildi) {
    const m = natija.mahsulot;
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>✅ Mahsulot topildi</h3>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body">
            {/* Mahsulot info */}
            <div style={{
              background: 'var(--bg3)', borderRadius: 12, padding: '16px',
              marginBottom: 16, textAlign: 'center'
            }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>{m.emoji || '📦'}</div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{m.nomi}</div>
              <div style={{ color: 'var(--text2)', fontSize: 13, marginTop: 4 }}>
                {formatSum(m.narx)} so'm / {getBirlikLabel(m.birlik)}
              </div>
              <div style={{
                marginTop: 8, fontWeight: 700, fontSize: 16,
                color: Number(m.miqdor) < 5 ? '#f59e0b' : '#10b981'
              }}>
                Mavjud: {m.miqdor} {getBirlikLabel(m.birlik)}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nechta qo'shish?</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  className="btn btn-secondary"
                  style={{ width: 40, height: 40, padding: 0, fontSize: 20 }}
                  onClick={() => setQoshMiqdor(q => Math.max(1, q - 1))}
                >−</button>
                <input
                  type="number" min="1" step="1"
                  value={qoshMiqdor}
                  onChange={e => setQoshMiqdor(Number(e.target.value) || 1)}
                  className="form-input"
                  style={{ textAlign: 'center', fontWeight: 800, fontSize: 20, flex: 1 }}
                />
                <button
                  className="btn btn-secondary"
                  style={{ width: 40, height: 40, padding: 0, fontSize: 20 }}
                  onClick={() => setQoshMiqdor(q => q + 1)}
                >+</button>
              </div>
              <div style={{ textAlign: 'center', marginTop: 8, fontSize: 13, color: 'var(--text2)' }}>
                Keyin: {Number(m.miqdor) + qoshMiqdor} {getBirlikLabel(m.birlik)} bo'ladi
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Bekor</button>
            <button className="btn btn-success" onClick={() => onQosh(barcode, qoshMiqdor)}>
              ➕ {qoshMiqdor} ta qo'shish
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Topilmadi — yangi mahsulot qo'shish
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🆕 Yangi mahsulot</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{
            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13
          }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>📷 Skan qilingan kod:</div>
            <code style={{ fontSize: 16, letterSpacing: 2 }}>{barcode}</code>
          </div>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 16 }}>
            Bu shtrix-kod bazada topilmadi. Yangi mahsulot sifatida qo'shilsinmi?
          </p>
          <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--text3)' }}>
            💡 <strong>Maslahat:</strong> Coca-Cola 0.5L va 1.5L ni alohida mahsulot qilib qo'shing —
            har birining o'z shtrix-kodi bor.
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Bekor</button>
          <button className="btn btn-primary" onClick={() => onYangiMahsulot(barcode)}>
            ➕ Yangi mahsulot qo'shish
          </button>
        </div>
      </div>
    </div>
  );
}


// ===================== AUDIO MAHSULOT QO'SHISH MODAL =====================
function AudioMahsulotModal({ kategoriyalar, onClose, onQoshildi }) {
  const [status, setStatus] = useState('tayyor'); // tayyor | tinglayapti | tahlil | natija | saqlanmoqda
  const [transcript, setTranscript] = useState('');
  const [parsed, setParsed] = useState(null); // { nomi, narx, miqdor, birlik, kategoriya_id, emoji }
  const [xato, setXato] = useState('');
  const [editForm, setEditForm] = useState(null);
  const recRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    setXato('');
    setTranscript('');
    setParsed(null);
    setEditForm(null);

    // 1-usul: Web Speech API (tezroq, real-time)
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SR();
      rec.lang = 'uz-UZ';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.continuous = false;
      recRef.current = rec;
      setStatus('tinglayapti');

      rec.onresult = (e) => {
        const text = e.results[0][0].transcript;
        setTranscript(text);
        setStatus('tahlil');
        parseAudio(text);
      };
      rec.onerror = (e) => {
        if (e.error === 'not-allowed') {
          setXato('❌ Mikrofonga ruxsat berilmagan. Brauzer sozlamalaridan ruxsat bering.');
        } else if (e.error === 'no-speech') {
          setXato('🔇 Ovoz eshitilmadi. Qayta urining.');
        } else {
          setXato('Ovoz tanib bo\'lmadi: ' + e.error);
        }
        setStatus('tayyor');
      };
      rec.onend = () => {
        if (status === 'tinglayapti') setStatus('tayyor');
      };
      rec.start();
      return;
    }

    // 2-usul: MediaRecorder (fallback)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setStatus('tahlil');
        setTranscript('(Ovoz yozildi, tahlil qilinmoqda...)');
        // MediaRecorder bilan to'liq speech-to-text bu yerda cheklangan
        // Claude API orqali emas — faqat browser SR ishlaydi
        setXato('Brauzeringiz ovoz tanishni qo\'llab-quvvatlamaydi. Qo\'lda kiriting.');
        setStatus('tayyor');
      };
      recRef.current = mr;
      mr.start();
      setStatus('tinglayapti');
    } catch {
      setXato('❌ Mikrofonga ulanib bo\'lmadi.');
    }
  };

  const stopRecording = () => {
    if (recRef.current) {
      if (recRef.current.stop) recRef.current.stop();
      if (recRef.current.abort) recRef.current.abort();
    }
    setStatus('tayyor');
  };

  // Ovoz matnini mahsulot ma'lumotlariga aylantirish
  const parseAudio = (text) => {
    const t = text.toLowerCase().trim();

    // Mahsulot nomini ajratish
    let nomi = text;
    let narx = '';
    let miqdor = '';
    let birlik = 'dona';
    let emoji = '📦';

    // Narx pattern: "1000 so'm", "5 ming", "10000"
    const narxPatterns = [
      /(\d[\d\s]*)\s*ming\s*so[''m]*/i,
      /(\d[\d\s]*)\s*so[''m]/i,
      /(\d[\d\s,]*)\s*narxi?\s*(\d[\d\s]*)/i,
      /narxi?\s*(\d[\d\s]*)/i,
    ];
    for (const p of narxPatterns) {
      const m = t.match(p);
      if (m) {
        let n = m[1] || m[2] || '';
        n = n.replace(/\s/g, '');
        if (t.includes('ming')) {
          narx = String(Number(n) * 1000);
        } else {
          narx = n;
        }
        nomi = text.replace(m[0], '').trim();
        break;
      }
    }

    // Miqdor pattern: "10 dona", "5 kg", "100 gramm"
    const birlikMap = {
      'kg': 'kg', 'kilogramm': 'kg', 'kilo': 'kg',
      'gramm': 'g', 'gram': 'g', 'g': 'g',
      'litr': 'litr', 'liter': 'litr',
      'ml': 'ml', 'millilitr': 'ml',
      'dona': 'dona', 'dono': 'dona', 'ta': 'dona',
      'quti': 'quti', 'paket': 'paket',
      'metr': 'metr', 'sm': 'sm',
    };
    const birlikKeys = Object.keys(birlikMap).join('|');
    const miqRe = new RegExp(`(\\d+[.,]?\\d*)\\s*(${birlikKeys})`, 'i');
    const miqM = t.match(miqRe);
    if (miqM) {
      miqdor = miqM[1].replace(',', '.');
      birlik = birlikMap[miqM[2].toLowerCase()] || 'dona';
      nomi = text.replace(miqM[0], '').trim();
    }

    // Emoji taxmin
    const emojiMap = [
      ['cola|pepsi|fanta|sprite|ichimlik|suv|sharbat', '🥤'],
      ['non|bread', '🍞'],
      ['shakar|qand|konfet|shirinlik', '🍬'],
      ['sut|qatiq|kefir|yogurt', '🥛'],
      ['go\'sht|qo\'y|mol|baliq', '🥩'],
      ['yog\'|moy|oil', '🧴'],
      ['un|daqiq', '🌾'],
      ['choy|qahva|tea|coffee', '☕'],
      ['meva|olma|banan|limon', '🍎'],
      ['sabzi|kartoshka|pomidor|piyoz', '🥕'],
      ['telefon|phone|gadjet', '📱'],
      ['kiyim|ko\'ylak|shim', '👕'],
    ];
    for (const [keys, em] of emojiMap) {
      if (new RegExp(keys, 'i').test(t)) { emoji = em; break; }
    }

    // Nomni tozalash
    nomi = nomi
      .replace(/\b(narx|narxi|miqdor|dona|ta|soni|qo'shish|yangi)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!nomi) nomi = text.replace(/\d+/g, '').trim() || text;

    const result = {
      nomi: nomi.charAt(0).toUpperCase() + nomi.slice(1),
      narx: narx || '',
      miqdor: miqdor || '',
      birlik,
      emoji,
      kategoriya_id: '',
    };
    setParsed(result);
    setEditForm({ ...result });
    setStatus('natija');
  };

  const handleSave = async () => {
    if (!editForm?.nomi?.trim()) return setXato('Mahsulot nomi kerak');
    if (!editForm?.narx) return setXato('Narx kerak');
    setStatus('saqlanmoqda');
    try {
      await axios.post('/api/mahsulotlar', {
        nomi: editForm.nomi,
        narx: Number(editForm.narx),
        miqdor: Number(editForm.miqdor) || 0,
        birlik: editForm.birlik || 'dona',
        emoji: editForm.emoji || '📦',
        kategoriya_id: editForm.kategoriya_id || null,
        izoh: '',
        barcode: null,
      });
      toast.success(`✅ "${editForm.nomi}" qo'shildi`);
      onQoshildi();
    } catch (err) {
      setXato(err.response?.data?.error || 'Xatolik');
      setStatus('natija');
    }
  };

  const BIRLIK_OPTIONS = [
    'dona','quti','paket','juft','kg','g','500g','250g','100g',
    'litr','0.5l','1l','1.5l','2l','ml','metr','m2','soat','kun'
  ];
  const EMOJIS = ['📦','🥤','🍬','🍫','🥛','🍞','🧴','🧹','❄️','🔧','👕','📱','🍎','🥩','🧆','☕','🍵','🧃','🍺','🥫','🧂','🫙','🛒','🏠','🌾','🥕'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🎤 Ovoz bilan mahsulot qo'shish</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">

          {/* Qo'llanma */}
          {status === 'tayyor' && !parsed && (
            <div style={{
              background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
              borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#6ee7b7'
            }}>
              💡 <strong>Qanday gapirish kerak?</strong><br />
              <div style={{ marginTop: 6, lineHeight: 1.7 }}>
                • "<em>Coca-Cola 1.5L 5000 so'm 10 dona</em>"<br />
                • "<em>Un 5 kg narxi 30 ming</em>"<br />
                • "<em>Shakar 2 kg 15000 so'm</em>"
              </div>
            </div>
          )}

          {/* Yozish tugmasi */}
          {status !== 'natija' && status !== 'saqlanmoqda' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              {status === 'tinglayapti' ? (
                <div>
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%', margin: '0 auto 16px',
                    background: 'rgba(239,68,68,0.15)', border: '3px solid #ef4444',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 36, animation: 'pulse 1s infinite',
                    boxShadow: '0 0 0 12px rgba(239,68,68,0.1)'
                  }}>
                    🎤
                  </div>
                  <style>{`@keyframes pulse { 0%,100%{box-shadow:0 0 0 8px rgba(239,68,68,0.1)} 50%{box-shadow:0 0 0 20px rgba(239,68,68,0.05)} }`}</style>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>
                    Tinglayapman...
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
                    Mahsulot nomini, narxini va miqdorini ayting
                  </div>
                  <button className="btn btn-danger" onClick={stopRecording}>⏹ To'xtatish</button>
                </div>
              ) : status === 'tahlil' ? (
                <div>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🔄</div>
                  <div style={{ fontSize: 14, color: 'var(--text2)' }}>Tahlil qilinmoqda...</div>
                  {transcript && (
                    <div style={{ marginTop: 12, background: 'var(--bg3)', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontStyle: 'italic' }}>
                      "{transcript}"
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <button
                    onClick={startRecording}
                    style={{
                      width: 80, height: 80, borderRadius: '50%', fontSize: 36,
                      background: 'rgba(16,185,129,0.15)', border: '3px solid #10b981',
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', margin: '0 auto 16px', transition: 'all 0.2s'
                    }}
                  >🎤</button>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Gapirishni boshlash</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>Tugmani bosib gapiring</div>
                </div>
              )}

              {xato && (
                <div style={{ marginTop: 12, color: '#ef4444', fontSize: 13, background: 'rgba(239,68,68,0.08)', borderRadius: 8, padding: '8px 12px' }}>
                  {xato}
                  <div style={{ marginTop: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setXato(''); setStatus('tayyor'); }}>
                      Qayta urinish
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Natija — tahrirlash */}
          {(status === 'natija' || status === 'saqlanmoqda') && editForm && (
            <div>
              {transcript && (
                <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--text2)', marginBottom: 14, fontStyle: 'italic' }}>
                  🎤 "{transcript}"
                </div>
              )}

              {/* Emoji */}
              <div className="form-group">
                <label className="form-label">Emoji</label>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {EMOJIS.map(em => (
                    <button key={em} onClick={() => setEditForm(f => ({ ...f, emoji: em }))}
                      style={{
                        fontSize: 18, padding: '3px 6px', borderRadius: 6, cursor: 'pointer',
                        background: editForm.emoji === em ? 'var(--accent)' : 'var(--bg)',
                        border: `2px solid ${editForm.emoji === em ? 'var(--accent)' : 'var(--border)'}`,
                      }}>{em}</button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Mahsulot nomi *</label>
                <input className="form-input" value={editForm.nomi}
                  onChange={e => setEditForm(f => ({ ...f, nomi: e.target.value }))} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Narx (so'm) *</label>
                  <input className="form-input" type="number" value={editForm.narx}
                    onChange={e => setEditForm(f => ({ ...f, narx: e.target.value }))} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Miqdor</label>
                  <input className="form-input" type="number" value={editForm.miqdor}
                    onChange={e => setEditForm(f => ({ ...f, miqdor: e.target.value }))} placeholder="0" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Birlik</label>
                <select className="form-input" value={editForm.birlik}
                  onChange={e => setEditForm(f => ({ ...f, birlik: e.target.value }))}>
                  {BIRLIK_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Kategoriya</label>
                <select className="form-input" value={editForm.kategoriya_id}
                  onChange={e => setEditForm(f => ({ ...f, kategoriya_id: e.target.value }))}>
                  <option value="">— Kategoriyasiz —</option>
                  {kategoriyalar.map(k => <option key={k.id} value={k.id}>{k.emoji} {k.nomi}</option>)}
                </select>
              </div>

              {xato && (
                <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 8 }}>{xato}</div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => { setParsed(null); setEditForm(null); setStatus('tayyor'); setTranscript(''); }}>
                  🎤 Qayta yozish
                </button>
                <button className="btn btn-success" onClick={handleSave} disabled={status === 'saqlanmoqda'}>
                  {status === 'saqlanmoqda' ? <span className="spinner" /> : "✅ Saqlash"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===================== ASOSIY KOMPONENT =====================
export default function Mahsulotlar() {
  const [mahsulotlar, setMahsulotlar] = useState([]);
  const [kategoriyalar, setKategoriyalar] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedKat, setSelectedKat] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'mahsulot' | 'kategoriya' | 'skaner' | 'skan_natija'
  const [editItem, setEditItem] = useState(null);
  const [skanBarcode, setSkanBarcode] = useState('');
  const [skanNatija, setSkanNatija] = useState(null);

  const emptyForm = { nomi: '', kategoriya_id: '', narx: '', soni: '', birlik: 'dona', birlik_miqdor: '', izoh: '', barcode: '', emoji: '📦' };

  // Birliklar uchun "bir birlik = ?" qo'shimcha tavsif
  const BIRLIK_TAVSIF = {
    'kg': { label: '1 dona nechi kg?', placeholder: '1', hint: 'Masalan: 1 dona = 2 kg', suffix: 'kg' },
    'g': { label: '1 dona nechi gramm?', placeholder: '100', hint: 'Masalan: 1 dona = 500 gramm', suffix: 'g' },
    '500g': { label: '1 dona (500g) soni', placeholder: '', hint: '1 dona = 500 gramm', suffix: '' },
    '250g': { label: '1 dona (250g) soni', placeholder: '', hint: '1 dona = 250 gramm', suffix: '' },
    '100g': { label: '1 dona (100g) soni', placeholder: '', hint: '1 dona = 100 gramm', suffix: '' },
    '50g': { label: '1 dona (50g) soni', placeholder: '', hint: '1 dona = 50 gramm', suffix: '' },
    '2kg': { label: 'Nechta 2kg paket?', placeholder: '1', hint: '1 dona = 2 kg', suffix: '' },
    '5kg': { label: 'Nechta 5kg qop?', placeholder: '1', hint: '1 dona = 5 kg', suffix: '' },
    '10kg': { label: 'Nechta 10kg qop?', placeholder: '1', hint: '1 dona = 10 kg', suffix: '' },
    '25kg': { label: 'Nechta 25kg qop?', placeholder: '1', hint: '1 dona = 25 kg', suffix: '' },
    '50kg': { label: 'Nechta 50kg qop?', placeholder: '1', hint: '1 dona = 50 kg', suffix: '' },
    'metr': { label: '1 dona nechi metr?', placeholder: '1', hint: 'Masalan: 1 rulon = 50 metr', suffix: 'm' },
    'm2': { label: 'Maydon (m²)', placeholder: '1', hint: 'Umumiy kvadrat metr', suffix: 'm²' },
    'litr': { label: '1 dona nechi litr?', placeholder: '1', hint: 'Masalan: 1 quti = 5 litr', suffix: 'l' },
    '1l': { label: '1 litrli dona soni', placeholder: '', hint: '1 dona = 1 litr', suffix: '' },
    '1.5l': { label: '1.5 litrli dona soni', placeholder: '', hint: '1 dona = 1.5 litr', suffix: '' },
    '2l': { label: '2 litrli dona soni', placeholder: '', hint: '1 dona = 2 litr', suffix: '' },
    '5l': { label: '5 litrli dona soni', placeholder: '', hint: '1 dona = 5 litr', suffix: '' },
    '0.5l': { label: '0.5 litrli dona soni', placeholder: '', hint: '1 dona = 0.5 litr', suffix: '' },
    'ml': { label: '1 dona nechi ml?', placeholder: '330', hint: 'Masalan: 1 banka = 330 ml', suffix: 'ml' },
    '330ml': { label: '330 ml banka soni', placeholder: '', hint: '1 dona = 330 ml', suffix: '' },
    '200ml': { label: '200 ml soni', placeholder: '', hint: '1 dona = 200 ml', suffix: '' },
    'sm': { label: '1 dona nechi sm?', placeholder: '10', hint: 'Uzunlik sm da', suffix: 'sm' },
    'rol': { label: 'Bir rulon nechi metr?', placeholder: '50', hint: 'Masalan: 1 rulon = 50 metr', suffix: 'm' },
    'dona': null, 'quti': null, 'paket': null, 'juft': null, "to'plam": null,
    'varaq': null, 'tayoq': null, 'soat': null, 'kun': null, 'oy': null, 'xizmat': null,
  };
  const [form, setForm] = useState(emptyForm);
  const [narxDisplay, setNarxDisplay] = useState('');
  const [katForm, setKatForm] = useState({ nomi: '', rang: '#6366f1', emoji: '📦' });
  const [customBirlik, setCustomBirlik] = useState(false);

  // ✅ Parol modal (o'chirish uchun)
  const [parolModal, setParolModal] = useState(null); // { type, id, nomi }

  // ✅ Audio orqali mahsulot qo'shish
  const [audioModal, setAudioModal] = useState(false);
  const [audioStatus, setAudioStatus] = useState('');
  const [audioTranscript, setAudioTranscript] = useState('');
  const [audioParsed, setAudioParsed] = useState(null); // { nomi, narx, miqdor, birlik }
  const [audioLoading, setAudioLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);
  const mediaRecRef = useRef(null);
  const chunksRef = useRef([]);

  const load = useCallback(async () => {
    try {
      const [m, k, s] = await Promise.all([
        axios.get(`/api/mahsulotlar?kategoriya_id=${selectedKat}&search=${search}`),
        axios.get('/api/mahsulotlar/kategoriyalar'),
        axios.get('/api/mahsulotlar/stats'),
      ]);
      setMahsulotlar(m.data);
      setKategoriyalar(k.data);
      setStats(s.data);
    } catch { toast.error('Xatolik'); }
    finally { setLoading(false); }
  }, [selectedKat, search]);

  useEffect(() => { load(); }, [load]);

  const openAdd = (prefillBarcode = '') => {
    setEditItem(null);
    setForm({ ...emptyForm, barcode: prefillBarcode });
    setNarxDisplay('');
    setCustomBirlik(false);
    setModal('mahsulot');
  };

  const openEdit = (m) => {
    setEditItem(m);
    setForm({
      nomi: m.nomi, kategoriya_id: m.kategoriya_id || '',
      narx: m.narx, soni: m.miqdor,
      birlik: m.birlik, izoh: m.izoh || '',
      barcode: m.barcode || '', emoji: m.emoji || '📦',
      birlik_miqdor: m.birlik_miqdor || ''
    });
    setNarxDisplay(formatSum(m.narx));
    setCustomBirlik(!ALL_BIRLIKLAR.find(b => b.value === m.birlik));
    setModal('mahsulot');
  };

  const handleNarxChange = (e) => {
    const raw = e.target.value.replace(/\s/g, '').replace(/[^0-9]/g, '');
    setForm(f => ({ ...f, narx: raw }));
    setNarxDisplay(raw ? Number(raw).toLocaleString('uz-UZ') : '');
  };

  const saveMahsulot = async () => {
    if (!form.nomi.trim()) return toast.error('Mahsulot nomi kiritilmadi');
    if (!form.narx) return toast.error('Narx kiritilmadi');
    try {
      const payload = {
        ...form,
        narx: Number(unformat(form.narx)),
        miqdor: Number(unformat(form.soni)) || 0,
        barcode: form.barcode.trim() || null,
        birlik_miqdor: form.birlik_miqdor ? Number(form.birlik_miqdor) : null,
      };
      if (editItem) {
        await axios.put(`/api/mahsulotlar/${editItem.id}`, payload);
        toast.success('✅ Yangilandi');
      } else {
        await axios.post('/api/mahsulotlar', payload);
        toast.success("✅ Qo'shildi");
      }
      setModal(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Xatolik'); }
  };

  // ✅ QR skan bo'lganda
  const handleSkanResult = async (barcode) => {
    setModal(null);
    setSkanBarcode(barcode);
    setSkanNatija(null);
    try {
      const r = await axios.get(`/api/mahsulotlar/barcode/${encodeURIComponent(barcode)}`);
      setSkanNatija(r.data);
      setModal('skan_natija');
    } catch (err) {
      toast.error('Xatolik yuz berdi');
    }
  };

  // ✅ Topilgan mahsulotga soni qo'shish
  const handleSoniQosh = async (barcode, miqdor) => {
    try {
      const r = await axios.post('/api/mahsulotlar/barcode-qosh', { barcode, miqdor });
      toast.success(`✅ ${r.data.message}`);
      setModal(null);
      setSkanNatija(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Xatolik'); }
  };

  // ✅ Topilmasa - yangi mahsulot formasini barcode bilan ochish
  const handleYangiMahsulot = (barcode) => {
    setModal(null);
    setSkanNatija(null);
    openAdd(barcode);
  };

  const deleteMahsulot = (id, nomi) => {
    setParolModal({ type: 'mahsulot', id, nomi });
  };
  const deleteMahsulotConfirm = async () => {
    await axios.delete(`/api/mahsulotlar/${parolModal.id}`);
    toast.success("🗑️ O'chirildi");
    load();
  };

  const saveKategoriya = async () => {
    if (!katForm.nomi) return toast.error('Nom kerak');
    try {
      await axios.post('/api/mahsulotlar/kategoriyalar', katForm);
      toast.success("✅ Kategoriya qo'shildi");
      setModal(null);
      setKatForm({ nomi: '', rang: '#6366f1', emoji: '📦' });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Xatolik'); }
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🛒 Mahsulotlar</h2>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>Uy tovarlar ro'yxatini boshqaring</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setModal('kategoriya')}>🗂️ Kategoriya</button>
          {/* ✅ QR SKAN tugmasi */}
          <button
            className="btn btn-secondary"
            onClick={() => setModal('skaner')}
            style={{ background: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.4)', color: '#a5b4fc' }}
          >
            📷 QR / Shtrix-kod
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setAudioModal(true)}
            style={{ background: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.4)', color: '#34d399' }}
          >
            🎤 Ovoz bilan qo'shish
          </button>
          <button className="btn btn-primary" onClick={() => openAdd()}>＋ Mahsulot</button>
        </div>
      </div>

      {/* Stat kartochkalar */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card purple">
            <div className="stat-icon">🛒</div>
            <div className="stat-label">Jami mahsulot</div>
            <div className="stat-value">{stats.jami_mahsulot}</div>
          </div>
          <div className="stat-card green">
            <div className="stat-icon">💰</div>
            <div className="stat-label">Umumiy qiymat</div>
            <div className="stat-value" style={{ fontSize: 16 }}>{formatSum(stats.umumiy_qiymat)} so'm</div>
          </div>
          <div className="stat-card orange">
            <div className="stat-icon">📊</div>
            <div className="stat-label">Jami mahsulot soni</div>
            <div className="stat-value">{formatSum(stats.jami_miqdor)}</div>
          </div>
        </div>
      )}

      {/* Kategoriya filterlari */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button className={`btn btn-sm ${selectedKat === '' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSelectedKat('')}>
          Hammasi
        </button>
        {kategoriyalar.map(k => (
          <button key={k.id}
            className={`btn btn-sm ${selectedKat == k.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedKat(k.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            {k.emoji} {k.nomi}
            <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>{k.mahsulot_soni}</span>
          </button>
        ))}
      </div>

      {/* Qidiruv */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input className="form-input" placeholder="🔍 Mahsulot qidirish..."
          value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
        {search && (
          <button className="btn btn-secondary btn-sm" onClick={() => setSearch('')}>✕</button>
        )}
      </div>

      {/* Jadval */}
      <div className="table-card">
        {mahsulotlar.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
            <p>Mahsulot topilmadi</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 14 }}>
              <button className="btn btn-secondary" onClick={() => setModal('skaner')}>📷 QR skanerlash</button>
              <button className="btn btn-primary" onClick={() => openAdd()}>＋ Qo'lda qo'shish</button>
            </div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Mahsulot</th>
                <th>Kategoriya</th>
                <th>Narx</th>
                <th>Mahsulot soni</th>
                <th>Umuliy qiymat</th>
                <th>Shtrix-kod</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {mahsulotlar.map(m => (
                <tr key={m.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 22 }}>{m.emoji || '📦'}</span>
                      <div>
                        <div style={{ fontWeight: 600 }}>{m.nomi}</div>
                        {m.izoh && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{m.izoh}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    {m.kategoriya_nomi
                      ? <span style={{ background: m.rang + '33', color: m.rang, padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>{m.emoji} {m.kategoriya_nomi}</span>
                      : <span style={{ color: 'var(--text3)' }}>—</span>}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{formatSum(m.narx)} so'm</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>1 {getBirlikLabel(m.birlik)} uchun</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{
                        fontWeight: 800, fontSize: 18,
                        color: Number(m.miqdor) === 0 ? '#ef4444' : Number(m.miqdor) < 5 ? '#f59e0b' : '#10b981'
                      }}>
                        {Number(m.miqdor) === 0 && '⚠️ '}{Number(m.miqdor)}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>
                        {getBirlikLabel(m.birlik)}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, color: '#10b981' }}>{formatSum(m.umumiy_qiymat)} so'm</td>
                  <td>
                    {m.barcode
                      ? <code style={{ fontSize: 11, background: 'var(--bg3)', padding: '3px 7px', borderRadius: 6 }}>{m.barcode}</code>
                      : <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(m)}>✏️</button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteMahsulot(m.id, m.nomi)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Kategoriyalar ro'yxati */}
      {kategoriyalar.length > 0 && (
        <div className="table-card" style={{ marginTop: 20 }}>
          <div className="table-header"><h3>🗂️ Kategoriyalar</h3></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, padding: 16 }}>
            {kategoriyalar.map(k => (
              <div key={k.id} style={{ background: 'var(--bg)', borderRadius: 12, padding: 14, border: `2px solid ${k.rang}33`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 22 }}>{k.emoji}</div>
                  <div style={{ fontWeight: 700, marginTop: 4 }}>{k.nomi}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{k.mahsulot_soni} mahsulot</div>
                  <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>{formatSum(k.umumiy_qiymat)} so'm</div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => {
                  if (window.confirm("O'chirilsinmi?")) {
                    axios.delete(`/api/mahsulotlar/kategoriyalar/${k.id}`).then(load);
                  }
                }}>🗑️</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ QR SKANER MODAL ============ */}
      {modal === 'skaner' && (
        <QrSkanerModal
          onResult={handleSkanResult}
          onClose={() => setModal(null)}
        />
      )}

      {/* ============ SKAN NATIJASI MODAL ============ */}
      {modal === 'skan_natija' && (
        <SkanNatijaModal
          barcode={skanBarcode}
          natija={skanNatija}
          kategoriyalar={kategoriyalar}
          onQosh={handleSoniQosh}
          onYangiMahsulot={handleYangiMahsulot}
          onClose={() => { setModal(null); setSkanNatija(null); }}
        />
      )}

      {/* ============ MAHSULOT MODAL ============ */}
      {modal === 'mahsulot' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editItem ? '✏️ Tahrirlash' : '➕ Yangi mahsulot'}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">

              {/* Emoji tanlash */}
              <div className="form-group">
                <label className="form-label">Emoji</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {EMOJIS.map(em => (
                    <button key={em} onClick={() => setForm(f => ({ ...f, emoji: em }))}
                      style={{
                        fontSize: 20, padding: '4px 7px', borderRadius: 8, cursor: 'pointer',
                        background: form.emoji === em ? 'var(--accent)' : 'var(--bg)',
                        border: `2px solid ${form.emoji === em ? 'var(--accent)' : 'var(--border)'}`,
                        transform: form.emoji === em ? 'scale(1.2)' : 'scale(1)', transition: 'all 0.15s'
                      }}>
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nomi */}
              <div className="form-group">
                <label className="form-label">Mahsulot nomi *</label>
                <input className="form-input" value={form.nomi}
                  onChange={e => setForm(f => ({ ...f, nomi: e.target.value }))}
                  placeholder="Masalan: Coca-Cola 1.5L, Non, Shakar 1kg..." />
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                  💡 Bir xil mahsulotning har xil hajmini alohida yozing: "Coca-Cola 0.5L", "Coca-Cola 1.5L"
                </div>
              </div>

              {/* Kategoriya */}
              <div className="form-group">
                <label className="form-label">Kategoriya</label>
                <select className="form-input" value={form.kategoriya_id}
                  onChange={e => setForm(f => ({ ...f, kategoriya_id: e.target.value }))}>
                  <option value="">— Kategoriyasiz —</option>
                  {kategoriyalar.map(k => <option key={k.id} value={k.id}>{k.emoji} {k.nomi}</option>)}
                </select>
              </div>

              {/* Narx */}
              <div className="form-group">
                <label className="form-label">Narx (so'm) *</label>
                <div style={{ position: 'relative' }}>
                  <input className="form-input" value={narxDisplay}
                    onChange={handleNarxChange} placeholder="12 000" inputMode="numeric"
                    style={{ paddingRight: 50 }} />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text3)' }}>so'm</span>
                </div>
              </div>

              {/* Mahsulot soni + Birlik */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Mahsulot soni</label>
                  <input className="form-input" type="number" min="0" step="0.001"
                    value={form.soni} onChange={e => setForm(f => ({ ...f, soni: e.target.value }))}
                    placeholder="0" />
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>
                    1, 1.5, 0.5, 250 va h.k.
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">O'lchov birligi</label>
                  {!customBirlik ? (
                    <select className="form-input" value={form.birlik}
                      onChange={e => {
                        if (e.target.value === '__custom__') { setCustomBirlik(true); setForm(f => ({ ...f, birlik: '', birlik_miqdor: '' })); }
                        else setForm(f => ({ ...f, birlik: e.target.value, birlik_miqdor: '' }));
                      }}>
                      {BIRLIK_GROUPS.map(g => (
                        <optgroup key={g.group} label={g.group}>
                          {g.items.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                        </optgroup>
                      ))}
                      <optgroup label="✏️ Boshqa">
                        <option value="__custom__">Boshqa (qo'lda yozish)</option>
                      </optgroup>
                    </select>
                  ) : (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input className="form-input" value={form.birlik}
                        onChange={e => setForm(f => ({ ...f, birlik: e.target.value }))}
                        placeholder="o'z birligingiz" autoFocus />
                      <button className="btn btn-secondary btn-sm"
                        onClick={() => { setCustomBirlik(false); setForm(f => ({ ...f, birlik: 'dona' })); }}>✕</button>
                    </div>
                  )}
                </div>
              </div>

              {/* ✅ O'lchov birligi uchun qo'shimcha miqdor */}
              {BIRLIK_TAVSIF[form.birlik] && (
                <div className="form-group" style={{ marginTop: -6 }}>
                  <label className="form-label">
                    📐 {BIRLIK_TAVSIF[form.birlik].label}
                  </label>
                  {BIRLIK_TAVSIF[form.birlik].placeholder !== '' ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          className="form-input"
                          type="number"
                          min="0"
                          step="0.001"
                          value={form.birlik_miqdor}
                          onChange={e => setForm(f => ({ ...f, birlik_miqdor: e.target.value }))}
                          placeholder={BIRLIK_TAVSIF[form.birlik].placeholder}
                          style={{ maxWidth: 120 }}
                        />
                        {BIRLIK_TAVSIF[form.birlik].suffix && (
                          <span style={{ color: 'var(--text2)', fontSize: 14 }}>
                            {BIRLIK_TAVSIF[form.birlik].suffix}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                        💡 {BIRLIK_TAVSIF[form.birlik].hint}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--text3)', padding: '6px 0' }}>
                      {BIRLIK_TAVSIF[form.birlik].hint}
                    </div>
                  )}
                </div>
              )}

              {/* Preview */}
              {(form.narx || form.soni) && (
                <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>
                  👁️ Ko'rinish: <strong style={{ color: 'var(--text)' }}>
                    {form.emoji} {form.nomi || '...'} — {formatSum(form.narx)} so'm / {getBirlikLabel(form.birlik)}
                    {form.soni ? ` · Soni: ${form.soni} ${getBirlikLabel(form.birlik)}` : ''}
                  </strong>
                </div>
              )}

              {/* Shtrix-kod */}
              <div className="form-group">
                <label className="form-label">📷 Shtrix-kod (ixtiyoriy)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="form-input" value={form.barcode}
                    onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))}
                    placeholder="4870000000000" inputMode="numeric" />
                  <button className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setModal('skaner_inline');
                    }}
                    title="Skanerlash">📷</button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                  Shtrix-kod bo'lsa — keyingi safar skanerlashda avtomatik topiladi
                </div>
              </div>

              {/* Izoh */}
              <div className="form-group">
                <label className="form-label">Izoh (ixtiyoriy)</label>
                <input className="form-input" value={form.izoh}
                  onChange={e => setForm(f => ({ ...f, izoh: e.target.value }))}
                  placeholder="Qo'shimcha ma'lumot..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Bekor</button>
              <button className="btn btn-primary" onClick={saveMahsulot}>
                {editItem ? '💾 Saqlash' : "➕ Qo'shish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline skaner (forma ichida barcode uchun) */}
      {modal === 'skaner_inline' && (
        <QrSkanerModal
          onResult={(barcode) => {
            setForm(f => ({ ...f, barcode }));
            toast.success(`✅ Shtrix-kod: ${barcode}`);
            setModal('mahsulot');
          }}
          onClose={() => setModal('mahsulot')}
        />
      )}

      {/* ============ PAROL MODAL ============ */}
      {parolModal && (
        <ParolModal
          title={parolModal.type === 'mahsulot' ? `"${parolModal.nomi}" mahsulotini o'chirish` : `"${parolModal.nomi}" kategoriyasini o'chirish`}
          subtitle={parolModal.type === "mahsulot" ? "Mahsulot butunlay o'chib ketadi." : "Kategoriya va unga bog'liq ma'lumotlar o'chadi."}
          danger
          onConfirm={async () => {
            if (parolModal.type === 'mahsulot') {
              await deleteMahsulotConfirm();
            } else {
              await axios.delete(`/api/mahsulotlar/kategoriyalar/${parolModal.id}`);
              toast.success("🗑️ Kategoriya o'chirildi");
              load();
            }
          }}
          onClose={() => setParolModal(null)}
        />
      )}

      {/* ============ AUDIO MODAL ============ */}
      {audioModal && (
        <AudioMahsulotModal
          kategoriyalar={kategoriyalar}
          onClose={() => { setAudioModal(false); }}
          onQoshildi={() => { setAudioModal(false); load(); }}
        />
      )}

      {/* ============ KATEGORIYA MODAL ============ */}
      {modal === 'kategoriya' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🗂️ Yangi kategoriya</h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Kategoriya nomi *</label>
                <input className="form-input" value={katForm.nomi}
                  onChange={e => setKatForm(f => ({ ...f, nomi: e.target.value }))}
                  placeholder="Masalan: Ichimliklar, Un-yog' mahsulotlar..." />
              </div>
              <div className="form-group">
                <label className="form-label">Emoji tanlang</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {EMOJIS.map(em => (
                    <button key={em} onClick={() => setKatForm(f => ({ ...f, emoji: em }))}
                      style={{
                        fontSize: 22, background: katForm.emoji === em ? 'var(--primary)' : 'var(--bg)',
                        border: '2px solid', borderColor: katForm.emoji === em ? 'var(--primary)' : 'var(--border)',
                        borderRadius: 8, padding: '4px 8px', cursor: 'pointer',
                        transform: katForm.emoji === em ? 'scale(1.2)' : 'scale(1)', transition: 'all 0.15s',
                      }}>{em}</button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Rang</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['#6366f1','#10b981','#ef4444','#f59e0b','#3b82f6','#ec4899','#8b5cf6','#06b6d4','#f97316','#84cc16'].map(r => (
                    <button key={r} onClick={() => setKatForm(f => ({ ...f, rang: r }))}
                      style={{
                        width: 36, height: 36, borderRadius: '50%', background: r, cursor: 'pointer',
                        border: katForm.rang === r ? '3px solid white' : '3px solid transparent',
                        boxShadow: katForm.rang === r ? `0 0 0 2px ${r}` : 'none',
                        transform: katForm.rang === r ? 'scale(1.2)' : 'scale(1)', transition: 'all 0.15s',
                      }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Bekor</button>
              <button className="btn btn-primary" onClick={saveKategoriya}>✅ Saqlash</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}