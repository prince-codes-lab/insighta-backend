const jwt            = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const RefreshToken   = require('../models/RefreshToken');

const ACCESS_TOKEN_TTL_SECONDS  = 3 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 5 * 60;

async function issueTokens(user) {
  const accessToken = jwt.sign(
    { sub: user.id, role: user.role, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL_SECONDS }
  );

  const rawToken  = uuidv4();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  // Use insertOne-style create — avoids any .save() call
  await RefreshToken.collection.insertOne({
    token:      rawToken,
    user_id:    user.id,
    expires_at: expiresAt,
    is_revoked: false,
    created_at: new Date(),
  });

  return { access_token: accessToken, refresh_token: rawToken };
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

async function rotateRefreshToken(rawToken, User) {
  const stored = await RefreshToken.findOne({ token: rawToken });

  if (!stored)           throw Object.assign(new Error('Invalid refresh token'),        { statusCode: 401 });
  if (stored.is_revoked) throw Object.assign(new Error('Refresh token has been revoked'), { statusCode: 401 });
  if (stored.expires_at < new Date()) throw Object.assign(new Error('Refresh token expired'), { statusCode: 401 });

  const user = await User.findOne({ id: stored.user_id });
  if (!user)           throw Object.assign(new Error('User not found'),        { statusCode: 401 });
  if (!user.is_active) throw Object.assign(new Error('Account is deactivated'), { statusCode: 403 });

  // Revoke old token using updateOne — avoids .save() on document with no _id issues
  await RefreshToken.updateOne({ token: rawToken }, { $set: { is_revoked: true } });

  return issueTokens(user);
}

async function revokeAllUserTokens(userId) {
  await RefreshToken.updateMany(
    { user_id: userId, is_revoked: false },
    { $set: { is_revoked: true } }
  );
}

module.exports = { issueTokens, verifyAccessToken, rotateRefreshToken, revokeAllUserTokens };
