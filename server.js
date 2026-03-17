const express = require('express');
const session = require('express-session');
const { DateTime } = require('luxon');
const cron = require('node-cron');
const multer = require('multer');
const path = require('path');
const db = require('better-sqlite3')('rejoice_master.db');
const app = express();

// --- MULTI-PURPOSE STORAGE ENGINE ---
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// --- CONSOLIDATED DATABASE SCHEMA ---
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT, last_name TEXT, username TEXT UNIQUE, 
    email TEXT UNIQUE, password TEXT, role TEXT DEFAULT 'User', tag TEXT DEFAULT 'Reliable', 
    status TEXT DEFAULT 'Active', trust_score INTEGER DEFAULT 100
  );
  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, amount REAL, cycle TEXT, 
    max_slots INTEGER DEFAULT 100, terms_text TEXT, status TEXT DEFAULT 'Registration'
  );
  CREATE TABLE IF NOT EXISTS slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT, group_id INTEGER, slot_number INTEGER, 
    user_id INTEGER, status TEXT DEFAULT 'available', lock_time DATETIME
  );
  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, content TEXT, image TEXT, 
    tag TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'rejoice-obsidian-2026-master', resave: false, saveUninitialized: true }));

// --- AUTOMATION: GMT+1 NIGERIA CYCLE RESET ---
cron.schedule('0 0 * * *', () => {
    console.log(`[REJOICE] Cycle Reset: ${DateTime.now().setZone('Africa/Lagos').toFormat('ff')}`);
}, { timezone: "Africa/Lagos" });

// --- AUTOMATION: 10-MINUTE SLOT LOCK CLEANER ---
cron.schedule('* * * * *', () => {
    db.prepare("UPDATE slots SET status = 'available', user_id = NULL WHERE status = 'locked' AND lock_time < datetime('now', '-10 minutes')").run();
});

// --- ADMIN BROADCAST: PROMOTIONAL, SECURITY, GIVEAWAYS ---
app.post('/admin/broadcast', upload.single('image'), (req, res) => {
    const { title, content, tag } = req.body;
    const img = req.file ? `/uploads/${req.file.filename}` : null;
    db.prepare("INSERT INTO announcements (title, content, image, tag) VALUES (?, ?, ?, ?)").run(title, content, img, tag);
    res.redirect('/');
});

// --- ADMIN 081205 PASSCODE GATEWAY ---
app.post('/admin/auth', (req, res) => {
    if (req.body.passcode === '081205') {
        req.session.role = 'Admin';
        res.redirect('/admin/dashboard');
    } else {
        res.redirect('/login?error=denied');
    }
});

app.listen(5000, () => console.log("REJOICE AJO ENTERPRISE: ONLINE"));
