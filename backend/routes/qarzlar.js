const express = require('express');
const router = express.Router();
const db = require('../database');
const auth = require('../middleware/auth');

// Muddati o'tgan qarzlar
router.get('/muddati-otgan', auth, async (req, res) => {
  try {
    const rows = await db.all_p(`
      SELECT qz.*,
        qr.ism, qr.familiya, qr.telefon, qr.telegram, qr.whatsapp, qr.instagram,
        GREATEST(0,
          qz.summa - COALESCE((SELECT SUM(t.summa) FROM tolovlar t WHERE t.qarz_id = qz.id), 0)
        ) as qolgan_summa,
        m.nomi as mahsulot_nomi, COALESCE(m.emoji,'📦') as mahsulot_emoji,
        m.birlik as mahsulot_birlik_asl
      FROM qarzlar qz
      JOIN qarzdorlar qr ON qr.id = qz.qarzdor_id
      LEFT JOIN mahsulotlar m ON m.id = qz.mahsulot_id
      WHERE qz.user_id = $1
        AND qz.status = 'active'
        AND qz.muddat IS NOT NULL
        AND qz.muddat < CURRENT_DATE
      ORDER BY qz.muddat ASC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Naxt sotish
router.post('/naxt-sotuv', auth, async (req, res) => {
  try {
    const { mahsulot_id, miqdor, narx, sana, izoh } = req.body;
    if (!mahsulot_id || !miqdor || Number(miqdor) <= 0)
      return res.status(400).json({ error: "Mahsulot va miqdor kerak" });

    const mahsulot = await db.get_p(
      'SELECT * FROM mahsulotlar WHERE id=$1 AND user_id=$2',
      [mahsulot_id, req.user.id]
    );
    if (!mahsulot) return res.status(404).json({ error: "Mahsulot topilmadi" });
    if (Number(mahsulot.miqdor) < Number(miqdor))
      return res.status(400).json({
        error: `Mahsulot yetarli emas! Mavjud: ${mahsulot.miqdor} ${mahsulot.birlik}`
      });

    const sotuvNarx = narx && Number(narx) > 0 ? Number(narx) : Number(mahsulot.narx);
    const jami = sotuvNarx * Number(miqdor);
    const sotuvSana = sana || new Date().toISOString().split('T')[0];

    await db.run_p(
      'UPDATE mahsulotlar SET miqdor = GREATEST(0, miqdor - $1), updated_at = NOW() WHERE id=$2 AND user_id=$3',
      [Number(miqdor), mahsulot_id, req.user.id]
    );

    await db.run_p(
      `INSERT INTO naxt_sotuvlar (user_id, mahsulot_id, miqdor, narx, jami_summa, sana, izoh)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [req.user.id, mahsulot_id, Number(miqdor), sotuvNarx, jami, sotuvSana, izoh || '']
    );

    res.json({
      message: "Sotuv amalga oshirildi",
      jami,
      mahsulot_nomi: mahsulot.nomi,
      qolgan_miqdor: Math.max(0, Number(mahsulot.miqdor) - Number(miqdor))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Naxt sotuvlar tarixi
router.get('/naxt-sotuvlar', auth, async (req, res) => {
  try {
    const { sana } = req.query;
    let query = `
      SELECT ns.*,
        COALESCE(m.nomi, 'Mahsulot') as mahsulot_nomi,
        COALESCE(m.birlik, 'dona') as birlik,
        COALESCE(m.emoji, '📦') as emoji
      FROM naxt_sotuvlar ns
      LEFT JOIN mahsulotlar m ON ns.mahsulot_id = m.id
      WHERE ns.user_id = $1
    `;
    const params = [req.user.id];
    if (sana) {
      params.push(sana);
      query += ` AND ns.sana = $${params.length}`;
    }
    query += ' ORDER BY ns.created_at DESC LIMIT 200';
    const rows = await db.all_p(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Yangi qarz qo'shish — mahsulot tanlansa miqdor kamayadi
router.post('/', auth, async (req, res) => {
  try {
    const {
      qarzdor_id, summa, valyuta, sana, muddat, sabab,
      mahsulot_id, mahsulot_miqdor
    } = req.body;

    if (!qarzdor_id || !summa || !sana)
      return res.status(400).json({ error: "Majburiy maydonlar to'ldirilmagan" });
    if (Number(summa) <= 0)
      return res.status(400).json({ error: "Summa 0 dan katta bo'lishi kerak" });

    const qarzdor = await db.get_p(
      'SELECT id FROM qarzdorlar WHERE id = $1 AND user_id = $2',
      [qarzdor_id, req.user.id]
    );
    if (!qarzdor) return res.status(403).json({ error: "Ruxsat yo'q" });

    let mahsulotBirlik = 'dona';

    // Ko'p mahsulot ro'yxati (yangi tizim)
    const mahsulotlarRoyxat = req.body.mahsulotlar_royxat || [];

    if (mahsulotlarRoyxat.length > 0) {
      // Har bir mahsulotni tekshir va miqdorini kamaytir
      for (const item of mahsulotlarRoyxat) {
        const m = await db.get_p(
          'SELECT * FROM mahsulotlar WHERE id=$1 AND user_id=$2',
          [item.mahsulot_id, req.user.id]
        );
        if (!m) return res.status(404).json({ error: `Mahsulot topilmadi (id: ${item.mahsulot_id})` });
        const olish = Number(item.miqdor) > 0 ? Number(item.miqdor) : 1;
        if (Number(m.miqdor) < olish) {
          return res.status(400).json({
            error: `"${m.nomi}" yetarli emas! Mavjud: ${m.miqdor} ${m.birlik}`
          });
        }
        await db.run_p(
          'UPDATE mahsulotlar SET miqdor = GREATEST(0, miqdor - $1), updated_at = NOW() WHERE id=$2 AND user_id=$3',
          [olish, m.id, req.user.id]
        );
      }
    } else if (mahsulot_id) {
      // Eski tizim (bitta mahsulot)
      const mahsulot = await db.get_p(
        'SELECT * FROM mahsulotlar WHERE id=$1 AND user_id=$2',
        [mahsulot_id, req.user.id]
      );
      if (!mahsulot) return res.status(404).json({ error: "Mahsulot topilmadi" });
      const miqdorKamaytir = Number(mahsulot_miqdor) > 0 ? Number(mahsulot_miqdor) : 1;
      if (Number(mahsulot.miqdor) < miqdorKamaytir) {
        return res.status(400).json({
          error: `Mahsulot yetarli emas! Mavjud: ${mahsulot.miqdor} ${mahsulot.birlik}`
        });
      }
      mahsulotBirlik = mahsulot.birlik;
      await db.run_p(
        'UPDATE mahsulotlar SET miqdor = GREATEST(0, miqdor - $1), updated_at = NOW() WHERE id=$2 AND user_id=$3',
        [miqdorKamaytir, mahsulot_id, req.user.id]
      );
    }

    // Qarz raqami
    const lastNum = await db.get_p(
      'SELECT MAX(qarz_raqam) as mx FROM qarzlar WHERE user_id=$1',
      [req.user.id]
    );
    const nextNum = (Number(lastNum?.mx) || 0) + 1;

    const result = await db.run_p(
      `INSERT INTO qarzlar
        (qarzdor_id, user_id, summa, valyuta, sana, muddat, sabab,
         mahsulot_id, mahsulot_miqdor, mahsulot_birlik, qarz_raqam)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id`,
      [
        qarzdor_id, req.user.id, summa,
        valyuta || 'UZS', sana, muddat || null, sabab,
        mahsulot_id || null,
        mahsulot_miqdor ? Number(mahsulot_miqdor) : null,
        mahsulotBirlik,
        nextNum
      ]
    );

    res.json({
      id: result.lastID || result.rows?.[0]?.id,
      qarz_raqam: `QRZ-${String(nextNum).padStart(4, '0')}`,
      message: "Qarz qo'shildi"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// To'lov qo'shish
router.post('/:id/tolov', auth, async (req, res) => {
  try {
    const { summa, sana, izoh } = req.body;
    if (!summa || !sana)
      return res.status(400).json({ error: "Summa va sana kiritilishi shart" });
    if (Number(summa) <= 0)
      return res.status(400).json({ error: "To'lov summasi 0 dan katta bo'lishi kerak" });

    const qarz = await db.get_p(
      'SELECT * FROM qarzlar WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!qarz) return res.status(404).json({ error: 'Qarz topilmadi' });

    await db.run_p(
      'INSERT INTO tolovlar (qarz_id, summa, sana, izoh) VALUES ($1,$2,$3,$4)',
      [req.params.id, summa, sana, izoh || '']
    );

    const tolovRow = await db.get_p(
      'SELECT COALESCE(SUM(summa),0) as jami FROM tolovlar WHERE qarz_id = $1',
      [req.params.id]
    );
    if (Number(tolovRow.jami) >= Number(qarz.summa)) {
      await db.run_p("UPDATE qarzlar SET status = 'paid' WHERE id = $1", [req.params.id]);
    }

    res.json({ message: "To'lov qo'shildi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Muddatni uzaytirish
router.put('/:id/muddat', auth, async (req, res) => {
  try {
    const { yangi_muddat, sabab } = req.body;
    if (!yangi_muddat) return res.status(400).json({ error: "Yangi muddat kerak" });
    const qarz = await db.get_p(
      'SELECT id FROM qarzlar WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!qarz) return res.status(404).json({ error: 'Qarz topilmadi' });
    await db.run_p(
      "UPDATE qarzlar SET muddat = $1, sabab = COALESCE($2, sabab) WHERE id = $3",
      [yangi_muddat, sabab || null, req.params.id]
    );
    res.json({ message: "Muddat uzaytirildi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Qarzni yopish
router.put('/:id/close', auth, async (req, res) => {
  try {
    const qarz = await db.get_p(
      'SELECT id FROM qarzlar WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!qarz) return res.status(404).json({ error: 'Qarz topilmadi' });
    await db.run_p("UPDATE qarzlar SET status = 'paid' WHERE id = $1", [req.params.id]);
    res.json({ message: "Qarz yopildi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bitta qarzni olish — mahsulot ma'lumotlari bilan
router.get('/:id', auth, async (req, res) => {
  try {
    const qarz = await db.get_p(`
      SELECT qz.*,
        'QRZ-' || LPAD(COALESCE(qz.qarz_raqam,0)::text, 4, '0') as qarz_kod,
        GREATEST(0,
          qz.summa - COALESCE((SELECT SUM(t.summa) FROM tolovlar t WHERE t.qarz_id = qz.id), 0)
        ) as qolgan_summa,
        (SELECT json_agg(t ORDER BY t.sana DESC) FROM tolovlar t WHERE t.qarz_id = qz.id) as tolovlar,
        m.nomi as mahsulot_nomi,
        COALESCE(m.emoji, '📦') as mahsulot_emoji,
        m.birlik as mahsulot_birlik_asl
      FROM qarzlar qz
      LEFT JOIN mahsulotlar m ON m.id = qz.mahsulot_id
      WHERE qz.id = $1 AND qz.user_id = $2
    `, [req.params.id, req.user.id]);
    if (!qarz) return res.status(404).json({ error: 'Qarz topilmadi' });
    res.json(qarz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Qarzni o'chirish
router.delete('/:id', auth, async (req, res) => {
  try {
    const qarz = await db.get_p(
      'SELECT id FROM qarzlar WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!qarz) return res.status(404).json({ error: 'Qarz topilmadi' });
    await db.run_p('DELETE FROM qarzlar WHERE id = $1', [req.params.id]);
    res.json({ message: "O'chirildi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;