const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(helmet());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: "Juda ko'p urinish. 15 daqiqadan keyin urinib ko'ring." } });
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/qarzdorlar', require('./routes/qarzdorlar'));
app.use('/api/qarzlar', require('./routes/qarzlar'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/mahsulotlar', require('./routes/mahsulotlar'));
app.use('/api/kirish-tarixi', require('./routes/kirish_tarixi'));
app.use('/api/byudjet', require('./routes/byudjet'));

app.get("/", (req, res) => res.json({ status: "ok", message: "Uy Hisobot API ✅" }));
app.get("/api/health", (req, res) => res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server ${PORT} portda ishlamoqda`));