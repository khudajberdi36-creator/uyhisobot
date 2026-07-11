const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const db = {
  query: (text, params) => pool.query(text, params),
  get_p: async (text, params = []) => {
    const res = await pool.query(text, params);
    return res.rows[0] || null;
  },
  all_p: async (text, params = []) => {
    const res = await pool.query(text, params);
    return res.rows;
  },
  run_p: async (text, params = []) => {
    const res = await pool.query(text, params);
    return { lastID: res.rows[0]?.id, changes: res.rowCount, rows: res.rows };
  }
};

async function initDB() {
  // Asosiy jadvallar
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL DEFAULT 'Foydalanuvchi',
      dokon_nomi TEXT NOT NULL DEFAULT 'Dokon',
      role TEXT DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS qarzdorlar (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      ism TEXT NOT NULL,
      familiya TEXT,
      telefon TEXT NOT NULL,
      telegram TEXT,
      instagram TEXT,
      whatsapp TEXT,
      manzil TEXT,
      izoh TEXT,
      eslatma TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS qarzlar (
      id SERIAL PRIMARY KEY,
      qarzdor_id INTEGER NOT NULL REFERENCES qarzdorlar(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      summa NUMERIC NOT NULL,
      valyuta TEXT DEFAULT 'UZS',
      sana DATE NOT NULL,
      muddat DATE,
      sabab TEXT,
      status TEXT DEFAULT 'active',
      mahsulot_id INTEGER,
      qarz_raqam INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tolovlar (
      id SERIAL PRIMARY KEY,
      qarz_id INTEGER NOT NULL REFERENCES qarzlar(id) ON DELETE CASCADE,
      summa NUMERIC NOT NULL,
      sana DATE NOT NULL,
      izoh TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS kategoriyalar (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      nomi TEXT NOT NULL,
      rang TEXT DEFAULT '#6366f1',
      emoji TEXT DEFAULT '📦',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mahsulotlar (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kategoriya_id INTEGER REFERENCES kategoriyalar(id) ON DELETE SET NULL,
      nomi TEXT NOT NULL,
      narx NUMERIC NOT NULL DEFAULT 0,
      miqdor NUMERIC NOT NULL DEFAULT 0,
      birlik TEXT DEFAULT 'dona',
      birlik_miqdor NUMERIC DEFAULT NULL,
      ogohlantirish_chegara INTEGER DEFAULT 5,
      emoji TEXT DEFAULT '📦',
      barcode TEXT,
      izoh TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS naxt_sotuvlar (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      mahsulot_id INTEGER REFERENCES mahsulotlar(id) ON DELETE SET NULL,
      miqdor NUMERIC NOT NULL DEFAULT 1,
      narx NUMERIC NOT NULL DEFAULT 0,
      jami_summa NUMERIC NOT NULL DEFAULT 0,
      sana DATE NOT NULL,
      izoh TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS kirimlar (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sana DATE NOT NULL,
      tavsif TEXT NOT NULL,
      summa NUMERIC NOT NULL,
      manba TEXT DEFAULT 'boshqa',
      kim_kiritgan TEXT,
      izoh TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chiqimlar (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sana DATE NOT NULL,
      tavsif TEXT NOT NULL,
      summa NUMERIC NOT NULL,
      kategoriya TEXT NOT NULL DEFAULT 'boshqa',
      kim_kiritgan TEXT,
      izoh TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS kirish_tarixi (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      username TEXT,
      ip_manzil TEXT,
      user_agent TEXT,
      status TEXT DEFAULT 'muvaffaqiyatli',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ✅ Eski DB uchun ustunlarni qo'shish (IF NOT EXISTS - xato bermaydi)
  const migrations = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT DEFAULT 'Foydalanuvchi'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS dokon_nomi TEXT DEFAULT 'Dokon'`,
    `ALTER TABLE qarzlar ADD COLUMN IF NOT EXISTS mahsulot_id INTEGER`,
    `ALTER TABLE qarzlar ADD COLUMN IF NOT EXISTS qarz_raqam INTEGER DEFAULT 0`,
    `ALTER TABLE qarzdorlar ADD COLUMN IF NOT EXISTS eslatma TEXT`,
    `ALTER TABLE mahsulotlar ADD COLUMN IF NOT EXISTS ogohlantirish_chegara INTEGER DEFAULT 5`,
    `ALTER TABLE mahsulotlar ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '📦'`,
    `ALTER TABLE qarzlar ADD COLUMN IF NOT EXISTS mahsulot_miqdor NUMERIC DEFAULT 1`,
    `ALTER TABLE qarzlar ADD COLUMN IF NOT EXISTS mahsulot_birlik TEXT DEFAULT 'dona'`,
    `ALTER TABLE mahsulotlar ADD COLUMN IF NOT EXISTS birlik_miqdor NUMERIC DEFAULT NULL`,
    // naxt_sotuvlar jadvali mavjud bo'lmasa CREATE qiladi (yuqorida allaqachon)
    // Lekin eski DB larda yo'q bo'lishi mumkin - shuning uchun alohida yaratamiz:
    `CREATE TABLE IF NOT EXISTS naxt_sotuvlar (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      mahsulot_id INTEGER REFERENCES mahsulotlar(id) ON DELETE SET NULL,
      miqdor NUMERIC NOT NULL DEFAULT 1,
      narx NUMERIC NOT NULL DEFAULT 0,
      jami_summa NUMERIC NOT NULL DEFAULT 0,
      sana DATE NOT NULL,
      izoh TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  ];

  for (const sql of migrations) {
    await pool.query(sql).catch(err => {
      console.log('Migration skip:', err.message.substring(0, 60));
    });
  }

  await pool.query(`ALTER TABLE mahsulotlar ADD COLUMN IF NOT EXISTS barcode TEXT;`).catch(() => {});
  console.log('✅ Database tayyor');
  await seedUsers();
}

async function seedUsers() {
  const bcrypt = require('bcryptjs');
  const defaultUsers = [
    {
      username: process.env.USER1_LOGIN || 'begzod',
      password: process.env.USER1_PASSWORD || 'begzod777@gmail.com',
      full_name: process.env.USER1_NAME || 'Begzod',
      dokon_nomi: process.env.USER1_DOKON || 'Bizning oila',
      role: 'user'
    },
    {
      username: process.env.ADMIN_LOGIN || 'admin',
      password: process.env.ADMIN_PASSWORD || 'begzod777.08',
      full_name: 'Admin',
      dokon_nomi: 'Boshqaruv',
      role: 'admin'
    }
  ];

  for (const u of defaultUsers) {
    const exists = await db.get_p('SELECT id FROM users WHERE username = $1', [u.username]);
    if (!exists) {
      const hash = await bcrypt.hash(u.password, 10);
      await pool.query(
        'INSERT INTO users (username, password, full_name, dokon_nomi, role) VALUES ($1,$2,$3,$4,$5)',
        [u.username, hash, u.full_name, u.dokon_nomi, u.role]
      );
      console.log(`✅ Foydalanuvchi yaratildi: ${u.username}`);
    }
  }
}

initDB().catch(err => console.error('DB xato:', err));

module.exports = db;