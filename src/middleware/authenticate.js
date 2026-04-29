const { verifyAccessToken } = require('../utils/tokenService');
const User = require('../models/User');

/**
 * Middleware that protects all /api/* routes.
 *
 * Flow:
 *  1. Extract the Bearer token from the Authorization header
 *  2. Verify the JWT signature and expiry
 *  3. Load the full user from the database
 *  4. Check that the account is still active
 *  5. Attach user to req.user and call next()
 *
 * Any failure returns immediately — the controller never runs.
 */
async function authenticate(req, res, next) {
  try {
    // ── 1. Extract token ────────────────────────────────────────────────────
    const authHeader = req.headers['authorization'];

    // Authorization header must look like: "Bearer eyJhbGciOi..."
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status:  'error',
        message: 'Authorization header missing or malformed',
      });
    }

    // Split "Bearer <token>" and take the second part
    const token = authHeader.split(' ')[1];

    // ── 2. Verify the JWT ───────────────────────────────────────────────────
    // verifyAccessToken throws if the token is expired or tampered with
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      const message = err.name === 'TokenExpiredError'
        ? 'Access token expired'
        : 'Invalid access token';
      return res.status(401).json({ status: 'error', message });
    }

    // ── 3. Load the user from the database ─────────────────────────────────
    // The JWT payload contains the user's id in the `sub` field
    const user = await User.findOne({ id: payload.sub });
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'User not found' });
    }

    // ── 4. Check account is active ──────────────────────────────────────────
    if (!user.is_active) {
      return res.status(403).json({ status: 'error', message: 'Account is deactivated' });
    }

    // ── 5. Attach user to request ───────────────────────────────────────────
    // Controllers and downstream middleware access user via req.user
    req.user = user;
    next();

  } catch (err) {
    next(err);
  }
}

module.exports = authenticate;
