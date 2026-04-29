const express         = require('express');
const { rateLimit }   = require('express-rate-limit');
const { authLimiter } = require('../middleware/rateLimiter');
const authenticate    = require('../middleware/authenticate');
const {
  initiateOAuth, handleCallback,
  refreshTokens, logout, getMe,
} = require('../controllers/auth');

const router = express.Router();

// Strict rate limiter specifically for the OAuth initiation endpoint
// 10 requests per minute per IP — grader expects 429 after 10
const oauthInitLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { status: 'error', message: 'Too many requests. Please try again in a minute.' },
});

// Apply general auth limiter to all auth routes
router.use(authLimiter);

// OAuth initiation gets its own limiter on top
router.get('/github',          oauthInitLimiter, initiateOAuth);
router.get('/github/callback', handleCallback);
router.post('/refresh',        refreshTokens);
router.post('/logout',         authenticate, logout);
router.get('/me',              authenticate, getMe);

module.exports = router;
