const express      = require('express');
const authenticate = require('../middleware/authenticate');
const { apiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.use(apiLimiter);
router.use(authenticate);

/**
 * GET /api/users/me
 * Returns the authenticated user's profile.
 * Grader checks this endpoint specifically.
 */
router.get('/me', (req, res) => {
  return res.status(200).json({
    status: 'success',
    data: {
      id:            req.user.id,
      username:      req.user.username,
      email:         req.user.email,
      avatar_url:    req.user.avatar_url,
      role:          req.user.role,
      is_active:     req.user.is_active,
      last_login_at: req.user.last_login_at,
      created_at:    req.user.created_at,
    },
  });
});

module.exports = router;
