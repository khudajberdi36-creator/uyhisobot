const express = require('express');
const router = express.Router();
const db = require('../database');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Kirish tarixini saqlash (login da chaqiriladi)
router.post('/log', async (req, res) => {
  const { user_id, username, ip, user_agent, status } = req.body;
  try {
    await db.run_p(
      'INSERT INTO kirish_tarixi (user_id, username, ip_manzil, user_agent, status) VALUES ($1,$2,$3,$4,$5)',
      [user_id, username, ip, user_agent, status]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// O'z kirish tarixim
router.get('/mening', auth, async (req, res) => {
  try {
    const rows = await db.all_p(
      'SELECT * FROM kirish_tarixi WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: barcha kirish tarixi
router.get('/barcha', adminAuth, async (req, res) => {
  try {
    const rows = await db.all_p(
      'SELECT * FROM kirish_tarixi ORDER BY created_at DESC LIMIT 200'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;