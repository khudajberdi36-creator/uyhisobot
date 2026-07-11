# 🏠 Uy Hisobot — Oilaviy boshqaruv tizimi

Uy/oila ichidagi hisobotlarni yuritish uchun veb-tizim: oila a'zolari, ular sotib
olgan tovarlar, to'langan/qolgan qarzlar, statistika va admin panel bitta joyda.

## ✨ Imkoniyatlar
- 👨‍👩‍👧‍👦 **Oila a'zolari** — har bir a'zo bo'yicha qarz tarixi, telefon/telegram/whatsapp
- 🛒 **Tovarlar** — narx, miqdor, birlik, kategoriya, ogohlantirish chegarasi bilan
- 💵 **Naqd xarid** — a'zosiz to'g'ridan-to'g'ri xaridlar
- ⚠️ **Muddati o'tgan** qarzlar bo'limi
- 📊 **Bosh sahifa** — umumiy statistika, oylik grafik, top a'zolar
- 👑 **Admin panel** — foydalanuvchilarni (masalan har bir oila a'zosi login) qo'shish/o'chirish, parolni tiklash
- 🛡️ **Kirish tarixi** — kim, qachon tizimga kirgani
- 📄 Excel/PDF hisobot eksporti
- 🔐 JWT autentifikatsiya + har bir amal uchun parol so'rash imkoniyati
- 📱 PWA (mobil qurilmaga o'rnatish mumkin)

## Loyiha tuzilmasi
```
uyhisobot/
├── backend/     → Node.js + Express + PostgreSQL API (Render'ga deploy qilinadi)
└── frontend/    → React ilova (Vercel'ga deploy qilinadi)
```

Texnologiyalar: **Node/Express + PostgreSQL** (backend), **React** (frontend),
tavsiya etilgan hosting: **Neon** (baza) + **Render** (backend) + **Vercel** (frontend).

---

## 🧪 Lokal ishga tushirish

### Backend
```bash
cd backend
npm install
cp .env.example .env      # va DATABASE_URL ni to'ldiring
npm run dev                # http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm start                  # http://localhost:3000
```
Lokalda frontend `/api` so'rovlarini backendga yo'naltirishi uchun
`frontend/package.json` ichiga `"proxy": "http://localhost:5000"` qo'shing
(agar mavjud bo'lmasa) yoki `.env` da `REACT_APP_API_URL` belgilang.

---

## 1️⃣ Baza — Neon (PostgreSQL)

1. https://neon.tech → ro'yxatdan o'ting → **New Project** yarating
2. Dashboard → **Connection Details** → "Connection string" ni nusxalang
   (masalan: `postgresql://user:pass@ep-xxxx.neon.tech/neondb?sslmode=require`)
3. Bu qatorni keyingi qadamda Render'dagi `DATABASE_URL` ga qo'yasiz
4. Jadvallar backend birinchi marta ishga tushganda avtomatik yaratiladi —
   Neon'da qo'lda hech narsa yaratish shart emas

---

## 2️⃣ Backend — Render.com ga deploy

1. `backend/` papkasi bilan birga butun loyihani GitHub repoga yuklang
2. https://render.com → **New +** → **Web Service** → GitHub reponi ulang
3. **Root Directory** = `backend`
4. Build command: `npm install`, Start command: `npm start`
   (bular `render.yaml` ichida allaqachon yozilgan)
5. **Environment** bo'limiga quyidagilarni kiriting:

| Variable | Qiymat |
|----------|--------|
| `DATABASE_URL` | Neon'dan olingan connection string |
| `JWT_SECRET` | o'zingiz o'ylab topgan uzun maxfiy so'z |
| `RESET_SECRET` | parol-reset uchun boshqa maxfiy so'z |
| `NODE_ENV` | `production` |
| `USER1_LOGIN` | masalan: `begzod` |
| `USER1_PASSWORD` | shu foydalanuvchi paroli |
| `USER1_NAME` | masalan: `Begzod` |
| `USER1_DOKON` | masalan: `Bizning oila` |
| `ADMIN_LOGIN` | masalan: `admin` |
| `ADMIN_PASSWORD` | admin paroli |

6. Deploy tugagach backend manzilini nusxalang, masalan:
   `https://uyhisobot-backend.onrender.com`

---

## 3️⃣ Frontend — Vercel ga deploy

1. `frontend/vercel.json` faylini oching va backend manzilini tekshiring/yangilang:
   ```json
   { "source": "/api/:path*", "destination": "https://uyhisobot-backend.onrender.com/api/:path*" }
   ```
   (agar Render'dagi xizmat nomi boshqacha bo'lsa, shu yerga o'zingiznikini yozing)
2. https://vercel.com → **Add New... → Project** → GitHub reponi ulang
3. **Root Directory** = `frontend`
4. Framework preset: Create React App (avtomatik aniqlanadi)
5. **Deploy** tugmasini bosing ✅

---

## 4️⃣ GitHub'ga yuklash

Loyihani allaqachon yaratgan `uyhisobot` bo'sh repoga yuklash uchun (loyiha
papkasi ichida, `git init` qilinmagan bo'lsa):

```bash
cd uyhisobot
git init
git add .
git commit -m "Uy Hisobot - boshlang'ich versiya"
git branch -M main
git remote add origin https://github.com/khudajberdi36-creator/uyhisobot.git
git push -u origin main
```

---

## ✅ Tekshirish
- `https://uyhisobot-backend.onrender.com/` ochsangiz `{"status":"ok"}` ko'rinishi kerak
- Birinchi kirishda `USER1_LOGIN` / `USER1_PASSWORD` (yoki `ADMIN_LOGIN` / `ADMIN_PASSWORD`) bilan kiring
- Admin panelda (👑 Admin) yangi foydalanuvchilar (masalan, har bir oila a'zosi uchun alohida login) qo'shishingiz mumkin

## 🔐 Parolni tiklash (agar unutilsa)
```
POST https://uyhisobot-backend.onrender.com/api/auth/reset-password
Body: { "secret": "RESET_SECRET qiymati", "username": "begzod", "new_password": "yangiparol" }
```
