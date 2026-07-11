const express = require('express');
const router = express.Router();
const db = require('../database');
const auth = require('../middleware/auth');

// Barcha kategoriyalar
router.get('/kategoriyalar', auth, async (req, res) => {
  try {
    const rows = await db.all_p(
      `SELECT k.*, COUNT(m.id) as mahsulot_soni, COALESCE(SUM(m.narx * m.miqdor), 0) as umumiy_qiymat
       FROM kategoriyalar k
       LEFT JOIN mahsulotlar m ON m.kategoriya_id = k.id AND m.user_id = $1
       WHERE k.user_id = $1
       GROUP BY k.id ORDER BY k.nomi`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/kategoriyalar', auth, async (req, res) => {
  const { nomi, rang, emoji } = req.body;
  if (!nomi) return res.status(400).json({ error: 'Kategoriya nomi kerak' });
  try {
    const row = await db.run_p(
      'INSERT INTO kategoriyalar (user_id, nomi, rang, emoji) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.user.id, nomi, rang || '#6366f1', emoji || '📦']
    );
    res.json(row.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/kategoriyalar/:id', auth, async (req, res) => {
  try {
    await db.run_p('DELETE FROM kategoriyalar WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: "O'chirildi" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Barcha mahsulotlar
router.get('/', auth, async (req, res) => {
  const { kategoriya_id, search } = req.query;
  try {
    let query = `
      SELECT m.*,
        COALESCE(m.emoji, k.emoji, '📦') as emoji,
        k.nomi as kategoriya_nomi, k.rang,
        (m.narx * m.miqdor) as umumiy_qiymat
      FROM mahsulotlar m
      LEFT JOIN kategoriyalar k ON k.id = m.kategoriya_id
      WHERE m.user_id = $1
    `;
    const params = [req.user.id];
    if (kategoriya_id) { params.push(kategoriya_id); query += ` AND m.kategoriya_id = $${params.length}`; }
    if (search) { params.push(`%${search}%`); query += ` AND (m.nomi ILIKE $${params.length} OR m.barcode ILIKE $${params.length})`; }
    query += ' ORDER BY m.nomi';
    const rows = await db.all_p(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Statistika
router.get('/stats', auth, async (req, res) => {
  try {
    const umumiy = await db.get_p(
      'SELECT COUNT(*) as jami_mahsulot, COALESCE(SUM(narx * miqdor), 0) as umumiy_qiymat, COALESCE(SUM(miqdor), 0) as jami_miqdor FROM mahsulotlar WHERE user_id=$1',
      [req.user.id]
    );
    const kategoriyalar = await db.all_p(
      `SELECT k.nomi, COALESCE(k.emoji,'📦') as emoji, k.rang,
        COUNT(m.id) as mahsulot_soni, COALESCE(SUM(m.narx * m.miqdor), 0) as qiymat
       FROM kategoriyalar k
       LEFT JOIN mahsulotlar m ON m.kategoriya_id=k.id AND m.user_id=$1
       WHERE k.user_id=$1
       GROUP BY k.id, k.nomi, k.emoji, k.rang ORDER BY qiymat DESC`,
      [req.user.id]
    );
    res.json({ ...umumiy, kategoriyalar });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Kam qolgan ogohlantirishlar
router.get('/ogohlantirish', auth, async (req, res) => {
  try {
    const rows = await db.all_p(
      `SELECT m.*, COALESCE(m.emoji, k.emoji, '📦') as emoji, k.nomi as kategoriya_nomi
       FROM mahsulotlar m
       LEFT JOIN kategoriyalar k ON k.id = m.kategoriya_id
       WHERE m.user_id = $1
         AND m.miqdor <= COALESCE(m.ogohlantirish_chegara, 5)
         AND COALESCE(m.ogohlantirish_chegara, 5) > 0
       ORDER BY m.miqdor ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ YANGI: Barcode bo'yicha mahsulot qidirish
router.get('/barcode/:barcode', auth, async (req, res) => {
  try {
    const mahsulot = await db.get_p(
      `SELECT m.*, COALESCE(m.emoji, '📦') as emoji, k.nomi as kategoriya_nomi
       FROM mahsulotlar m
       LEFT JOIN kategoriyalar k ON k.id = m.kategoriya_id
       WHERE m.user_id = $1 AND m.barcode = $2`,
      [req.user.id, req.params.barcode]
    );
    if (mahsulot) {
      res.json({ topildi: true, mahsulot });
    } else {
      res.json({ topildi: false, barcode: req.params.barcode });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ YANGI: Barcode orqali miqdor qo'shish
router.post('/barcode-qosh', auth, async (req, res) => {
  try {
    const { barcode, miqdor } = req.body;
    const qoshMiqdor = Number(miqdor) || 1;
    const mahsulot = await db.get_p(
      'SELECT * FROM mahsulotlar WHERE user_id=$1 AND barcode=$2',
      [req.user.id, barcode]
    );
    if (!mahsulot) return res.status(404).json({ error: 'Mahsulot topilmadi' });
    const yangi = await db.run_p(
      'UPDATE mahsulotlar SET miqdor = miqdor + $1 WHERE id=$2 AND user_id=$3 RETURNING *',
      [qoshMiqdor, mahsulot.id, req.user.id]
    );
    res.json({
      message: `+${qoshMiqdor} ${mahsulot.birlik} qo'shildi`,
      mahsulot: yangi.rows[0]
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Mahsulot qo'shish
router.post('/', auth, async (req, res) => {
  const { nomi, kategoriya_id, narx, miqdor, birlik, izoh, emoji, barcode } = req.body;
  if (!nomi || narx === undefined) return res.status(400).json({ error: 'Nomi va narx kerak' });
  try {
    // Barcode takrorlanmasligi
    if (barcode) {
      const existing = await db.get_p(
        'SELECT id FROM mahsulotlar WHERE user_id=$1 AND barcode=$2',
        [req.user.id, barcode]
      );
      if (existing) return res.status(400).json({ error: 'Bu barcode allaqachon mavjud' });
    }
    const row = await db.run_p(
      'INSERT INTO mahsulotlar (user_id, kategoriya_id, nomi, narx, miqdor, birlik, izoh, emoji, barcode, birlik_miqdor) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [req.user.id, kategoriya_id || null, nomi, narx, miqdor || 0, birlik || 'dona', izoh || '', emoji || '📦', barcode || null, birlik_miqdor || null]
    );
    res.json(row.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Mahsulot tahrirlash
router.put('/:id', auth, async (req, res) => {
  const { nomi, kategoriya_id, narx, miqdor, birlik, izoh, emoji, barcode, birlik_miqdor } = req.body;
  try {
    if (barcode) {
      const existing = await db.get_p(
        'SELECT id FROM mahsulotlar WHERE user_id=$1 AND barcode=$2 AND id != $3',
        [req.user.id, barcode, req.params.id]
      );
      if (existing) return res.status(400).json({ error: 'Bu barcode boshqa mahsulotda bor' });
    }
    const row = await db.run_p(
      'UPDATE mahsulotlar SET nomi=$1, kategoriya_id=$2, narx=$3, miqdor=$4, birlik=$5, izoh=$6, emoji=$7, barcode=$8, birlik_miqdor=$9 WHERE id=$10 AND user_id=$11 RETURNING *',
      [nomi, kategoriya_id || null, narx, miqdor || 0, birlik || 'dona', izoh || '', emoji || '📦', barcode || null, birlik_miqdor || null, req.params.id, req.user.id]
    );
    res.json(row.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Mahsulot o'chirish
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.run_p('DELETE FROM mahsulotlar WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: "O'chirildi" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;