const { rateLimit } = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  // Use X-Forwarded-For safely since we set trust proxy in app.js
  message: { status: 'error', message: 'Too many requests. Please try again in a minute.' },
});

const apiLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             60,
  keyGenerator:    (req) => req.user ? req.user.id : req.ip,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { status: 'error', message: 'Too many requests. Please slow down.' },
});

module.exports = { authLimiter, apiLimiter };
