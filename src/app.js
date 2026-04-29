const express        = require('express');
const cors           = require('cors');
const cookieParser   = require('cookie-parser');
const requestLogger  = require('./middleware/requestLogger');
const authRoutes     = require('./routes/auth');
const profileRoutes  = require('./routes/profiles');

const app = express();

// ── CORS ───────────────────────────────────────────────────────────────────────
app.use(cors({
  origin:      [process.env.WEB_PORTAL_URL || 'http://localhost:5173', /localhost/],
  credentials: true,   // needed for cookies to work cross-origin
}));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  next();
});

app.use(express.json());
app.use(cookieParser());

// ── Request logging ────────────────────────────────────────────────────────────
app.use(requestLogger);

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/auth',         authRoutes);
app.use('/api/profiles', profileRoutes);

// ── 404 ────────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

// ── Global error handler ───────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  const code = err.statusCode || 500;
  res.status(code).json({
    status:  'error',
    message: code >= 500 ? 'Internal server error' : err.message,
  });
});

module.exports = app;
