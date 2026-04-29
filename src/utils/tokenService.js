const jwt          = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const RefreshToken   = require('../models/RefreshToken');

// Access token: 3 minutes per spec
const ACCESS_TOKEN_TTL_SECONDS  = 3 * 60;

// Refresh token: 5 minutes per spec
const REFRESH_TOKEN_TTL_SECONDS = 5 * 60;

/**
 * Issues a new access + refresh token pair for a user.
 * Saves the refresh token to the database.
 *
 * @param {{ id: string, role: string, username: string }} user
 * @returns {{ access_token: string, refresh_token: string }}
 */
async function issueTokens(user) {
  // ── Access token (JWT) ────────────────────────────────────────────────────
  // The payload is the data embedded inside the token.
  // We store the minimum needed to identify the user and check their role
  // without hitting the database on every request.
  const accessToken = jwt.sign(
    {
      sub:      user.id,        // "subject" — standard JWT field for the user's ID
      role:     user.role,
      username: user.username,
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL_SECONDS }
  );

  // ── Refresh token (opaque random string stored in DB) ─────────────────────
  // Unlike JWTs, refresh tokens are NOT self-contained.
  // They're meaningless random strings — validity is checked by DB lookup.
  const rawToken = uuidv4();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  await RefreshToken.create({
    token:      rawToken,
    user_id:    user.id,
    expires_at: expiresAt,
    is_revoked: false,
  });

  return {
    access_token:  accessToken,
    refresh_token: rawToken,
  };
}

/**
 * Verifies a JWT access token and returns the decoded payload.
 * Throws if the token is missing, expired, or tampered with.
 *
 * @param {string} token
 * @returns {{ sub: string, role: string, username: string }}
 */
function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

/**
 * Rotates a refresh token — invalidates the old one, issues a fresh pair.
 * This is called by POST /auth/refresh.
 *
 * @param {string} rawToken  The refresh token sent by the client
 * @param {object} User      The User mongoose model (passed in to avoid circular deps)
 * @returns {{ access_token: string, refresh_token: string }}
 */
async function rotateRefreshToken(rawToken, User) {
  // 1. Find the token in the DB
  const stored = await RefreshToken.findOne({ token: rawToken });

  if (!stored)            throw Object.assign(new Error('Invalid refresh token'), { statusCode: 401 });
  if (stored.is_revoked)  throw Object.assign(new Error('Refresh token has been revoked'), { statusCode: 401 });
  if (stored.expires_at < new Date()) throw Object.assign(new Error('Refresh token expired'), { statusCode: 401 });

  // 2. Load the user
  const user = await User.findOne({ id: stored.user_id });
  if (!user)            throw Object.assign(new Error('User not found'), { statusCode: 401 });
  if (!user.is_active)  throw Object.assign(new Error('Account is deactivated'), { statusCode: 403 });

  // 3. Revoke the old token immediately (rotation — each refresh token is single-use)
  stored.is_revoked = true;
  await stored.save();

  // 4. Issue a fresh pair
  return issueTokens(user);
}

/**
 * Revokes all refresh tokens for a user (used on logout).
 *
 * @param {string} userId
 */
async function revokeAllUserTokens(userId) {
  await RefreshToken.updateMany(
    { user_id: userId, is_revoked: false },
    { $set: { is_revoked: true } }
  );
}

module.exports = {
  issueTokens,
  verifyAccessToken,
  rotateRefreshToken,
  revokeAllUserTokens,
};
