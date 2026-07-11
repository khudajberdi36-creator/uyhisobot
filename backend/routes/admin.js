const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database');
const adminAuth = require('../middleware/adminAuth');

// Admin statistika
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const users = await db.all_p('SELECT id, username, full_name, dokon_nomi, role FROM users ORDER BY id');
    const result = [];
    for (const u of users) {
      const r1 = await db.get_p('SELECT COUNT(*) as c FROM qarzdorlar WHERE user_id = $1', [u.id]);
      const r2 = await db.get_p("SELECT COALESCE(SUM(summa),0) as total FROM qarzlar WHERE user_id = $1 AND status='active'", [u.id]);
      const r3 = await db.get_p(`SELECT COALESCE(SUM(t.summa),0) as total FROM tolovlar t JOIN qarzlar q ON t.qarz_id=q.id WHERE q.user_id=$1`, [u.id]);
      result.push({ ...u, jami_qarzdorlar: Number(r1.c), jami_qarz: Number(r2.total), tolov_qilingan: Number(r3.total), qolgan_qarz: Math.max(0, Number(r2.total) - Number(r3.total)) });
    }
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Foydalanuvchilar
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await db.all_p('SELECT id, username, full_name, dokon_nomi, role, created_at FROM users ORDER BY id');
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Yangi foydalanuvchi qo'shish
router.post('/users', adminAuth, async (req, res) => {
  const { username, password, full_name, dokon_nomi, role } = req.body;
  if (!username || !password || !full_name || !dokon_nomi)
    return res.status(400).json({ error: 'Barcha maydonlar kerak' });
  try {
    const exists = await db.get_p('SELECT id FROM users WHERE username=$1', [username]);
    if (exists) return res.status(400).json({ error: 'Bu username allaqachon mavjud' });
    const hash = await bcrypt.hash(password, 10);
    const row = await db.run_p(
      'INSERT INTO users (username, password, full_name, dokon_nomi, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, username, full_name, dokon_nomi, role',
      [username, hash, full_name, dokon_nomi, role || 'user']
    );
    res.json(row.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Foydalanuvchi parolini o'zgartirish
router.put('/users/:id/password', adminAuth, async (req, res) => {
  const { new_password } = req.body;
  if (!new_password || new_password.length < 6)
    return res.status(400).json({ error: "Parol kamida 6 ta belgi bo'lsin" });
  try {
    const hash = await bcrypt.hash(new_password, 10);
    await db.run_p('UPDATE users SET password=$1 WHERE id=$2', [hash, req.params.id]);
    res.json({ message: "Parol yangilandi" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Foydalanuvchi o'chirish
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    if (req.user.id == req.params.id) return res.status(400).json({ error: "O'zingizni o'chira olmaysiz" });
    await db.run_p('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ message: "O'chirildi" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Kirish tarixi
router.get('/kirish-tarixi', adminAuth, async (req, res) => {
  try {
    // 90 kundan eski yozuvlarni o'chirish
    await db.run_p("DELETE FROM kirish_tarixi WHERE created_at < NOW() - INTERVAL '90 days'").catch(() => {});
    const rows = await db.all_p('SELECT * FROM kirish_tarixi ORDER BY created_at DESC LIMIT 500');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ YANGI: kirish tarixini tozalash — kunlar bo'yicha (raqam xavfsiz)
router.delete('/kirish-tarixi/tozalash', adminAuth, async (req, res) => {
  try {
    const days = Math.max(1, Math.min(365, parseInt(req.query.days) || 30));
    // SQL injection xavfsizligi uchun interpolatsiya emas, INTERVAL bilan parametr
    const result = await db.run_p(
      `DELETE FROM kirish_tarixi WHERE created_at < NOW() - ($1 || ' days')::INTERVAL`,
      [days.toString()]
    );
    res.json({
      ok: true,
      ochirildi: result.changes || 0,
      message: `${days} kundan eski ${result.changes || 0} ta yozuv o'chirildi`
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Barcha qarzdorlar
router.get('/qarzdorlar', adminAuth, async (req, res) => {
  try {
    const rows = await db.all_p(`
      SELECT q.*, u.username, u.dokon_nomi,
        GREATEST(0, COALESCE((SELECT SUM(qz.summa) FROM qarzlar qz WHERE qz.qarzdor_id=q.id AND qz.status='active'),0) -
        COALESCE((SELECT SUM(t.summa) FROM tolovlar t JOIN qarzlar qz ON t.qarz_id=qz.id WHERE qz.qarzdor_id=q.id),0)) AS jami_qarz
      FROM qarzdorlar q JOIN users u ON u.id = q.user_id ORDER BY jami_qarz DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;