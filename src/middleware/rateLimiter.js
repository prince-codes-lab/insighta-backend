const { rateLimit } = require('express-rate-limit');

/**
 * Auth endpoints — 10 requests per minute per IP.
 * Prevents OAuth abuse and brute-force attempts.
 */
const authLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { status: 'error', message: 'Too many requests. Please try again in a minute.' },
});

/**
 * API endpoints — 60 requests per minute per authenticated user (falls back to IP).
 */
const apiLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             60,
  keyGenerator:    (req) => req.user ? req.user.id : req.ip,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { status: 'error', message: 'Too many requests. Please slow down.' },
});

module.exports = { authLimiter, apiLimiter };
