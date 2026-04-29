const express        = require('express');
const cors           = require('cors');
const cookieParser   = require('cookie-parser');
const requestLogger  = require('./middleware/requestLogger');
const authRoutes     = require('./routes/auth');
const profileRoutes  = require('./routes/profiles');
const userRoutes     = require('./routes/users');

const app = express();

// Trust proxy — required for PXXL/hosting platforms that sit behind a reverse proxy
app.set('trust proxy', 1);

// CORS
app.use(cors({
  origin:      function(origin, callback) { callback(null, true); },
  credentials: true,
}));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-API-Version');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth',         authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/users',    userRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

// Global error handler
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
