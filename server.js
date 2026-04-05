const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();
const db = require('./config/db');

const authRoutes       = require('./routes/auth');
const courseRoutes     = require('./routes/courses');
const enrollmentRoutes = require('./routes/enrollment');
const reportRoutes     = require('./routes/reports');

const app = express();

function requireStudentSession(req, res, next) {
  if (!req.session.student) {
    return res.redirect('/');
  }
  return next();
}

function redirectIfLoggedIn(req, res, next) {
  if (req.session.student) {
    return res.redirect('/dashboard');
  }
  return next();
}

// ── Middleware ──────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'bfu-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 2 } // 2 hours
}));

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/courses',    courseRoutes);
app.use('/api/enrollment', enrollmentRoutes);
app.use('/api/reports',    reportRoutes);

// ── Serve frontend and admin pages ─────────────────────────
app.get('/', redirectIfLoggedIn, (req, res) =>
  res.sendFile(path.join(__dirname, 'public/frontend/pages/login.html'))
);
app.get('/register', redirectIfLoggedIn, (req, res) =>
  res.sendFile(path.join(__dirname, 'public/frontend/pages/register.html'))
);
app.get('/courses', requireStudentSession, (req, res) =>
  res.sendFile(path.join(__dirname, 'public/frontend/pages/courses.html'))
);
app.get('/my-courses', requireStudentSession, (req, res) =>
  res.sendFile(path.join(__dirname, 'public/frontend/pages/my-courses.html'))
);
app.get('/dashboard', requireStudentSession, (req, res) =>
  res.sendFile(path.join(__dirname, 'public/admin/pages/dashboard.html'))
);

// ── Start ───────────────────────────────────────────────────
const PORT = Number(process.env.PORT || 3000);

async function startServer() {
  try {
    await db.ready;
    app.listen(PORT, () => {
      console.log(`\n✅  Bright Future University Portal running at:`);
      console.log(`    http://localhost:${PORT}\n`);
    });
  } catch (err) {
    console.error('❌ Failed to initialize database:', err.message);
    process.exit(1);
  }
}

startServer();
