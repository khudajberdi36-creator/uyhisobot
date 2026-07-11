const express = require('express');
const router = express.Router();
const db = require('../database');
const auth = require('../middleware/auth');

// Barcha qarzdorlar
router.get('/', auth, async (req, res) => {
  try {
    const rows = await db.all_p(`
      SELECT
        q.*,
        COALESCE(active_qarz.jami, 0) - COALESCE(tolov.jami, 0) AS jami_qarz,
        COALESCE(active_qarz.soni, 0) AS qarz_soni
      FROM qarzdorlar q
      LEFT JOIN (
        SELECT qarzdor_id,
               SUM(summa) AS jami,
               COUNT(*) AS soni
        FROM qarzlar
        WHERE user_id = $1 AND status = 'active'
        GROUP BY qarzdor_id
      ) active_qarz ON active_qarz.qarzdor_id = q.id
      LEFT JOIN (
        SELECT qz.qarzdor_id, SUM(t.summa) AS jami
        FROM tolovlar t
        JOIN qarzlar qz ON t.qarz_id = qz.id
        WHERE qz.user_id = $2 AND qz.status = 'active'
        GROUP BY qz.qarzdor_id
      ) tolov ON tolov.qarzdor_id = q.id
      WHERE q.user_id = $3
      ORDER BY jami_qarz DESC NULLS LAST
    `, [req.user.id, req.user.id, req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Qidiruv
router.get('/search', auth, async (req, res) => {
  try {
    const q = `%${req.query.q || ''}%`;
    const rows = await db.all_p(`
      SELECT
        q.*,
        COALESCE(active_qarz.jami, 0) - COALESCE(tolov.jami, 0) AS jami_qarz,
        COALESCE(active_qarz.soni, 0) AS qarz_soni
      FROM qarzdorlar q
      LEFT JOIN (
        SELECT qarzdor_id,
               SUM(summa) AS jami,
               COUNT(*) AS soni
        FROM qarzlar
        WHERE user_id = $1 AND status = 'active'
        GROUP BY qarzdor_id
      ) active_qarz ON active_qarz.qarzdor_id = q.id
      LEFT JOIN (
        SELECT qz.qarzdor_id, SUM(t.summa) AS jami
        FROM tolovlar t
        JOIN qarzlar qz ON t.qarz_id = qz.id
        WHERE qz.user_id = $2 AND qz.status = 'active'
        GROUP BY qz.qarzdor_id
      ) tolov ON tolov.qarzdor_id = q.id
      WHERE q.user_id = $3
        AND (q.ism ILIKE $4 OR q.familiya ILIKE $4 OR q.telefon ILIKE $4)
      ORDER BY q.ism
    `, [req.user.id, req.user.id, req.user.id, q]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bitta qarzdor (qarzlar bilan)
router.get('/:id', auth, async (req, res) => {
  try {
    const qarzdor = await db.get_p(
      'SELECT * FROM qarzdorlar WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!qarzdor) return res.status(404).json({ error: 'Topilmadi' });

    const qarzlar = await db.all_p(`
      SELECT qz.*,
        GREATEST(0,
          qz.summa - COALESCE((SELECT SUM(t.summa) FROM tolovlar t WHERE t.qarz_id = qz.id), 0)
        ) as qolgan_summa,
        (SELECT json_agg(t ORDER BY t.sana DESC) FROM tolovlar t WHERE t.qarz_id = qz.id) as tolovlar,
        m.nomi as mahsulot_nomi,
        m.birlik as mahsulot_birlik,
        COALESCE(m.emoji, '📦') as mahsulot_emoji
      FROM qarzlar qz
      LEFT JOIN mahsulotlar m ON m.id = qz.mahsulot_id
      WHERE qz.qarzdor_id = $1 AND qz.user_id = $2
      ORDER BY qz.created_at DESC
    `, [req.params.id, req.user.id]);

    res.json({ ...qarzdor, qarzlar });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Yangi qarzdor qo'shish
router.post('/', auth, async (req, res) => {
  try {
    const { ism, familiya, telefon, telegram, instagram, whatsapp, manzil, izoh } = req.body;
    if (!ism || !telefon)
      return res.status(400).json({ error: "Ism va telefon majburiy" });

    // ✅ TUZATILDI: Telefon takrorlanmasligini tekshirish
    const exists = await db.get_p(
      'SELECT id FROM qarzdorlar WHERE telefon = $1 AND user_id = $2',
      [telefon, req.user.id]
    );
    if (exists) return res.status(400).json({ error: "Bu telefon raqam allaqachon mavjud" });

    const result = await db.run_p(
      'INSERT INTO qarzdorlar (user_id, ism, familiya, telefon, telegram, instagram, whatsapp, manzil, izoh) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
      [req.user.id, ism, familiya, telefon, telegram || null, instagram || null, whatsapp || null, manzil || null, izoh || null]
    );
    res.json({ id: result.lastID || result.rows?.[0]?.id, message: "Saqlandi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Qarzdorni yangilash
router.put('/:id', auth, async (req, res) => {
  try {
    const { ism, familiya, telefon, telegram, instagram, whatsapp, manzil, izoh } = req.body;
    if (!ism || !telefon)
      return res.status(400).json({ error: "Ism va telefon majburiy" });

    const qarzdor = await db.get_p('SELECT id FROM qarzdorlar WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!qarzdor) return res.status(404).json({ error: 'Topilmadi' });

    await db.run_p(
      'UPDATE qarzdorlar SET ism=$1, familiya=$2, telefon=$3, telegram=$4, instagram=$5, whatsapp=$6, manzil=$7, izoh=$8, eslatma=$9 WHERE id=$10 AND user_id=$11',
      [ism, familiya, telefon, telegram || null, instagram || null, whatsapp || null, manzil || null, izoh || null, req.body.eslatma || null, req.params.id, req.user.id]
    );
    res.json({ message: "Yangilandi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Qarzdorni o'chirish
router.delete('/:id', auth, async (req, res) => {
  try {
    const qarzdor = await db.get_p('SELECT id FROM qarzdorlar WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!qarzdor) return res.status(404).json({ error: 'Topilmadi' });

    await db.run_p('DELETE FROM qarzdorlar WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: "O'chirildi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;