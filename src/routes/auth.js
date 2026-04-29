const express    = require('express');
const { authLimiter } = require('../middleware/rateLimiter');
const authenticate    = require('../middleware/authenticate');
const {
  initiateOAuth, handleCallback,
  refreshTokens, logout, getMe,
} = require('../controllers/auth');

const router = express.Router();

// Apply auth rate limiter to all /auth/* routes
router.use(authLimiter);

router.get('/github',          initiateOAuth);
router.get('/github/callback', handleCallback);
router.post('/refresh',        refreshTokens);
router.post('/logout',         authenticate, logout);
router.get('/me',              authenticate, getMe);

module.exports = router;
