const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('../database');

const SECRET = process.env.JWT_SECRET || 'dokon_qarz_secret_2024';

// === BRUTE-FORCE HIMOYA ===
// IP bo'yicha: 5 marta xato → 15 daqiqa blok
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 daqiqa
  max: 10,                     // 10 ta urinish
  skipSuccessfulRequests: true, // muvaffaqiyatli kiriш hisoblanmaydi
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'nomalum';
    // Bloklangan urinishni ham saqlaymiz
    const { username } = req.body;
    db.run_p(
      'INSERT INTO kirish_tarixi (username, ip_manzil, user_agent, status) VALUES ($1,$2,$3,$4)',
      [username || 'unknown', ip, req.headers['user-agent'] || '', 'bloklangan']
    ).catch(() => {});
    res.status(429).json({
      error: "Juda ko'p urinish! IP manzilingiz 15 daqiqaga bloklandi. Keyinroq urinib ko'ring."
    });
  }
});

// Username bo'yicha: 5 marta xato → 30 daqiqa blok (xotira ichida)
const failedAttempts = new Map();
const USERNAME_MAX = 5;
const USERNAME_BLOCK_MS = 30 * 60 * 1000;

function checkUsernameBlock(username) {
  const entry = failedAttempts.get(username);
  if (!entry) return false;
  if (Date.now() - entry.firstFail > USERNAME_BLOCK_MS) {
    failedAttempts.delete(username);
    return false;
  }
  return entry.count >= USERNAME_MAX;
}

function recordFailedAttempt(username) {
  const entry = failedAttempts.get(username);
  if (!entry || Date.now() - entry.firstFail > USERNAME_BLOCK_MS) {
    failedAttempts.set(username, { count: 1, firstFail: Date.now() });
  } else {
    entry.count++;
  }
}

function clearAttempts(username) {
  failedAttempts.delete(username);
}

// === LOGIN ===
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'nomalum';
  const user_agent = req.headers['user-agent'] || '';

  if (!username || !password)
    return res.status(400).json({ error: "Username va parol kiritish shart" });

  // Username blok tekshiruv
  if (checkUsernameBlock(username)) {
    await db.run_p(
      'INSERT INTO kirish_tarixi (username, ip_manzil, user_agent, status) VALUES ($1,$2,$3,$4)',
      [username, ip, user_agent, 'bloklangan']
    ).catch(() => {});
    return res.status(429).json({
      error: `"${username}" uchun juda ko'p xato urinish. 30 daqiqadan keyin urinib ko'ring.`
    });
  }

  try {
    const user = await db.get_p('SELECT * FROM users WHERE username = $1', [username]);
    if (!user) {
      recordFailedAttempt(username);
      await db.run_p(
        'INSERT INTO kirish_tarixi (username, ip_manzil, user_agent, status) VALUES ($1,$2,$3,$4)',
        [username, ip, user_agent, 'muvaffaqiyatsiz']
      ).catch(() => {});
      return res.status(400).json({ error: "Username yoki parol noto'g'ri" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      recordFailedAttempt(username);
      await db.run_p(
        'INSERT INTO kirish_tarixi (user_id, username, ip_manzil, user_agent, status) VALUES ($1,$2,$3,$4,$5)',
        [user.id, username, ip, user_agent, 'muvaffaqiyatsiz']
      ).catch(() => {});
      const remaining = USERNAME_MAX - (failedAttempts.get(username)?.count || 0);
      const msg = remaining > 0
        ? `Username yoki parol noto'g'ri. Yana ${remaining} ta urinish qoldi.`
        : "Juda ko'p xato! Account vaqtincha bloklandi.";
      return res.status(400).json({ error: msg });
    }

    // Muvaffaqiyatli — attemptlarni tozalaymiz
    clearAttempts(username);
    await db.run_p(
      'INSERT INTO kirish_tarixi (user_id, username, ip_manzil, user_agent, status) VALUES ($1,$2,$3,$4,$5)',
      [user.id, username, ip, user_agent, 'muvaffaqiyatli']
    ).catch(() => {});

    const token = jwt.sign(
      { id: user.id, username: user.username, dokon_nomi: user.dokon_nomi, full_name: user.full_name, role: user.role || 'user' },
      SECRET,
      { expiresIn: '7d' }  // 30d emas 7 kun — xavfsizroq
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, full_name: user.full_name, dokon_nomi: user.dokon_nomi, role: user.role || 'user' }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === PAROL RESET (admin) ===
router.post('/reset-password', async (req, res) => {
  const { secret, username, new_password } = req.body;
  const RESET_SECRET = process.env.RESET_SECRET || 'dokon_reset_2024';
  if (secret !== RESET_SECRET) return res.status(403).json({ error: "Ruxsat yo'q" });
  if (!username || !new_password) return res.status(400).json({ error: "username va new_password kerak" });
  try {
    const user = await db.get_p('SELECT id FROM users WHERE username = $1', [username]);
    if (!user) return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    const hash = await bcrypt.hash(new_password, 10);
    await db.run_p('UPDATE users SET password = $1 WHERE username = $2', [hash, username]);
    clearAttempts(username);
    res.json({ message: `✅ ${username} paroli muvaffaqiyatli yangilandi` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === PAROL O'ZGARTIRISH ===
router.post('/change-password', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token kerak' });
  try {
    const decoded = jwt.verify(token, SECRET);
    const { old_password, new_password } = req.body;
    if (!old_password || !new_password) return res.status(400).json({ error: 'Parollar kiritilmadi' });
    if (new_password.length < 6) return res.status(400).json({ error: "Yangi parol kamida 6 ta belgi bo'lsin" });
    const user = await db.get_p('SELECT * FROM users WHERE id = $1', [decoded.id]);
    const isMatch = await bcrypt.compare(old_password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Eski parol noto'g'ri" });
    const newHash = await bcrypt.hash(new_password, 10);
    await db.run_p('UPDATE users SET password = $1 WHERE id = $2', [newHash, decoded.id]);
    res.json({ message: "Parol muvaffaqiyatli o'zgartirildi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === ME ===
router.get('/me', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token kerak' });
  try {
    const user = jwt.verify(token, SECRET);
    res.json(user);
  } catch {
    res.status(401).json({ error: "Token noto'g'ri" });
  }
});

module.exports = router;