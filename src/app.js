const express        = require('express');
const cors           = require('cors');
const cookieParser   = require('cookie-parser');
const requestLogger  = require('./middleware/requestLogger');
const authRoutes     = require('./routes/auth');
const profileRoutes  = require('./routes/profiles');

const app = express();

// ── Trust proxy ────────────────────────────────────────────────────────────────
// PXXL (and most hosting platforms) sit behind a reverse proxy.
// This tells Express to trust the X-Forwarded-For header so that:
//  1. req.ip returns the real client IP (not the proxy IP)
//  2. express-rate-limit works correctly
app.set('trust proxy', 1);

// ── CORS ───────────────────────────────────────────────────────────────────────
app.use(cors({
  origin:      function(origin, callback) {
    // Allow requests with no origin (curl, mobile apps, same-origin)
    if (!origin) return callback(null, true);
    return callback(null, true);
  },
  credentials: true,
}));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
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
