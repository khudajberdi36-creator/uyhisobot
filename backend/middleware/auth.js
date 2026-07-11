const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'dokon_qarz_secret_2024';

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token kerak' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Token noto'g'ri" });
  }
};
