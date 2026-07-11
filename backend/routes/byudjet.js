const express = require('express');
const router = express.Router();
const db = require('../database');
const auth = require('../middleware/auth');

// Ruxsat etilgan chiqim kategoriyalari
const KATEGORIYALAR = ['oziq_ovqat', 'kommunal', 'transport', 'talim', 'kiyim_kechak', 'boshqa'];

function oyOraligi(req) {
  // ?oy=2026-07 formatida bo'lishi mumkin, bo'lmasa joriy oy
  const oy = req.query.oy; // 'YYYY-MM'
  if (oy && /^\d{4}-\d{2}$/.test(oy)) {
    return { oy_boshi: `${oy}-01`, oy_key: oy };
  }
  const now = new Date();
  const oy_key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return { oy_boshi: `${oy_key}-01`, oy_key };
}

// ─────────────────────────────────────────────
// KIRIMLAR
// ─────────────────────────────────────────────

// Ro'yxat (oy bo'yicha filtr, ?oy=YYYY-MM ixtiyoriy)
router.get('/kirimlar', auth, async (req, res) => {
  try {
    const { oy } = req.query;
    let rows;
    if (oy && /^\d{4}-\d{2}$/.test(oy)) {
      rows = await db.all_p(
        `SELECT * FROM kirimlar WHERE user_id = $1 AND TO_CHAR(sana, 'YYYY-MM') = $2 ORDER BY sana DESC, id DESC`,
        [req.user.id, oy]
      );
    } else {
      rows = await db.all_p(
        `SELECT * FROM kirimlar WHERE user_id = $1 ORDER BY sana DESC, id DESC LIMIT 200`,
        [req.user.id]
      );
    }
    res.json(rows.map(r => ({ ...r, summa: Number(r.summa) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Qo'shish
router.post('/kirimlar', auth, async (req, res) => {
  try {
    const { sana, tavsif, summa, manba, kim_kiritgan, izoh } = req.body;
    if (!sana || !tavsif || !summa) {
      return res.status(400).json({ error: "Sana, tavsif va summa majburiy" });
    }
    const result = await db.run_p(
      `INSERT INTO kirimlar (user_id, sana, tavsif, summa, manba, kim_kiritgan, izoh)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [req.user.id, sana, tavsif, summa, manba || 'boshqa', kim_kiritgan || req.user.full_name || null, izoh || null]
    );
    const row = await db.get_p('SELECT * FROM kirimlar WHERE id = $1', [result.lastID]);
    res.status(201).json({ ...row, summa: Number(row.summa) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tahrirlash
router.put('/kirimlar/:id', auth, async (req, res) => {
  try {
    const { sana, tavsif, summa, manba, kim_kiritgan, izoh } = req.body;
    const exists = await db.get_p('SELECT id FROM kirimlar WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!exists) return res.status(404).json({ error: 'Topilmadi' });

    await db.run_p(
      `UPDATE kirimlar SET sana=$1, tavsif=$2, summa=$3, manba=$4, kim_kiritgan=$5, izoh=$6 WHERE id=$7 AND user_id=$8`,
      [sana, tavsif, summa, manba || 'boshqa', kim_kiritgan || null, izoh || null, req.params.id, req.user.id]
    );
    const row = await db.get_p('SELECT * FROM kirimlar WHERE id = $1', [req.params.id]);
    res.json({ ...row, summa: Number(row.summa) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// O'chirish
router.delete('/kirimlar/:id', auth, async (req, res) => {
  try {
    const exists = await db.get_p('SELECT id FROM kirimlar WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!exists) return res.status(404).json({ error: 'Topilmadi' });
    await db.run_p('DELETE FROM kirimlar WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// CHIQIMLAR
// ─────────────────────────────────────────────

router.get('/chiqimlar', auth, async (req, res) => {
  try {
    const { oy, kategoriya } = req.query;
    let sql = `SELECT * FROM chiqimlar WHERE user_id = $1`;
    const params = [req.user.id];
    if (oy && /^\d{4}-\d{2}$/.test(oy)) {
      params.push(oy);
      sql += ` AND TO_CHAR(sana, 'YYYY-MM') = $${params.length}`;
    }
    if (kategoriya && KATEGORIYALAR.includes(kategoriya)) {
      params.push(kategoriya);
      sql += ` AND kategoriya = $${params.length}`;
    }
    sql += ` ORDER BY sana DESC, id DESC LIMIT 300`;
    const rows = await db.all_p(sql, params);
    res.json(rows.map(r => ({ ...r, summa: Number(r.summa) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/chiqimlar', auth, async (req, res) => {
  try {
    const { sana, tavsif, summa, kategoriya, kim_kiritgan, izoh } = req.body;
    if (!sana || !tavsif || !summa) {
      return res.status(400).json({ error: "Sana, tavsif va summa majburiy" });
    }
    const kat = KATEGORIYALAR.includes(kategoriya) ? kategoriya : 'boshqa';
    const result = await db.run_p(
      `INSERT INTO chiqimlar (user_id, sana, tavsif, summa, kategoriya, kim_kiritgan, izoh)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [req.user.id, sana, tavsif, summa, kat, kim_kiritgan || req.user.full_name || null, izoh || null]
    );
    const row = await db.get_p('SELECT * FROM chiqimlar WHERE id = $1', [result.lastID]);
    res.status(201).json({ ...row, summa: Number(row.summa) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/chiqimlar/:id', auth, async (req, res) => {
  try {
    const { sana, tavsif, summa, kategoriya, kim_kiritgan, izoh } = req.body;
    const exists = await db.get_p('SELECT id FROM chiqimlar WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!exists) return res.status(404).json({ error: 'Topilmadi' });
    const kat = KATEGORIYALAR.includes(kategoriya) ? kategoriya : 'boshqa';

    await db.run_p(
      `UPDATE chiqimlar SET sana=$1, tavsif=$2, summa=$3, kategoriya=$4, kim_kiritgan=$5, izoh=$6 WHERE id=$7 AND user_id=$8`,
      [sana, tavsif, summa, kat, kim_kiritgan || null, izoh || null, req.params.id, req.user.id]
    );
    const row = await db.get_p('SELECT * FROM chiqimlar WHERE id = $1', [req.params.id]);
    res.json({ ...row, summa: Number(row.summa) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/chiqimlar/:id', auth, async (req, res) => {
  try {
    const exists = await db.get_p('SELECT id FROM chiqimlar WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!exists) return res.status(404).json({ error: 'Topilmadi' });
    await db.run_p('DELETE FROM chiqimlar WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// BALANS — kirim - chiqim - qarzlar = oyning qoldig'i
// ─────────────────────────────────────────────
router.get('/balans', auth, async (req, res) => {
  try {
    const { oy_key } = oyOraligi(req);

    const kirimRes = await db.get_p(
      `SELECT COALESCE(SUM(summa),0) as jami FROM kirimlar WHERE user_id=$1 AND TO_CHAR(sana,'YYYY-MM')=$2`,
      [req.user.id, oy_key]
    );
    const chiqimRes = await db.get_p(
      `SELECT COALESCE(SUM(summa),0) as jami FROM chiqimlar WHERE user_id=$1 AND TO_CHAR(sana,'YYYY-MM')=$2`,
      [req.user.id, oy_key]
    );
    // Shu oy ichida berilgan yangi qarzlar (oilaviy byudjetdan chiqqan pul sifatida hisoblanadi)
    const qarzRes = await db.get_p(
      `SELECT COALESCE(SUM(summa),0) as jami FROM qarzlar WHERE user_id=$1 AND TO_CHAR(sana,'YYYY-MM')=$2 AND status='active'`,
      [req.user.id, oy_key]
    );
    // Umumiy hali qaytarilmagan qarzlar (barcha davr, faqat ma'lumot uchun)
    const umumiyQolganQarz = await db.get_p(`
      SELECT COALESCE(SUM(qz.summa),0) - COALESCE(SUM(t_summa.paid),0) AS qolgan
      FROM qarzlar qz
      LEFT JOIN (SELECT qarz_id, SUM(summa) AS paid FROM tolovlar GROUP BY qarz_id) t_summa
        ON t_summa.qarz_id = qz.id
      WHERE qz.user_id = $1 AND qz.status = 'active'
    `, [req.user.id]);

    const kirim = Number(kirimRes.jami);
    const chiqim = Number(chiqimRes.jami);
    const qarz = Number(qarzRes.jami);
    const qoldiq = kirim - chiqim - qarz;

    res.json({
      oy: oy_key,
      kirim,
      chiqim,
      qarz,
      qoldiq,
      umumiy_qolgan_qarz: Math.max(0, Number(umumiyQolganQarz?.qolgan || 0)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// Kategoriya bo'yicha chiqim statistikasi (grafik uchun)
// ─────────────────────────────────────────────
router.get('/kategoriya-stat', auth, async (req, res) => {
  try {
    const { oy_key } = oyOraligi(req);
    const rows = await db.all_p(`
      SELECT kategoriya, COALESCE(SUM(summa),0) as jami, COUNT(*) as soni
      FROM chiqimlar
      WHERE user_id = $1 AND TO_CHAR(sana,'YYYY-MM') = $2
      GROUP BY kategoriya
      ORDER BY jami DESC
    `, [req.user.id, oy_key]);
    res.json(rows.map(r => ({ ...r, jami: Number(r.jami), soni: Number(r.soni) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// Oylik dinamika (so'nggi 6 oy) — kirim vs chiqim
// ─────────────────────────────────────────────
router.get('/oylik', auth, async (req, res) => {
  try {
    const kirimlar = await db.all_p(`
      SELECT TO_CHAR(sana,'Mon') as oy, TO_CHAR(sana,'YYYY-MM') as oy_key, SUM(summa) as jami
      FROM kirimlar
      WHERE user_id = $1 AND sana >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY oy_key, oy ORDER BY oy_key
    `, [req.user.id]);
    const chiqimlar = await db.all_p(`
      SELECT TO_CHAR(sana,'Mon') as oy, TO_CHAR(sana,'YYYY-MM') as oy_key, SUM(summa) as jami
      FROM chiqimlar
      WHERE user_id = $1 AND sana >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY oy_key, oy ORDER BY oy_key
    `, [req.user.id]);

    const map = {};
    kirimlar.forEach(r => {
      map[r.oy_key] = { oy: r.oy, oy_key: r.oy_key, kirim: Number(r.jami), chiqim: 0 };
    });
    chiqimlar.forEach(r => {
      if (map[r.oy_key]) map[r.oy_key].chiqim = Number(r.jami);
      else map[r.oy_key] = { oy: r.oy, oy_key: r.oy_key, kirim: 0, chiqim: Number(r.jami) };
    });

    const result = Object.values(map).sort((a, b) => a.oy_key > b.oy_key ? 1 : -1);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;