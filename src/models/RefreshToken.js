const mongoose = require('mongoose');

/**
 * Stores refresh tokens server-side.
 *
 * Two expiry mechanisms:
 *  1. is_revoked — set true on logout or when used (rotation)
 *  2. expires_at TTL index — MongoDB auto-deletes expired documents
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    token: {
      type:     String,
      required: true,
      unique:   true,
    },
    user_id: {
      type:     String,
      required: true,
    },
    expires_at: {
      type:     Date,
      required: true,
    },
    is_revoked: {
      type:    Boolean,
      default: false,
    },
    created_at: {
      type:    Date,
      default: () => new Date(),
    },
  },
  {
    _id:        true,   // keep _id for MongoDB TTL index
    versionKey: false,
  }
);

// MongoDB will automatically delete documents once expires_at has passed.
// The TTL monitor runs every ~60 seconds, so deletion may be slightly delayed.
refreshTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ user_id: 1 });
refreshTokenSchema.index({ token: 1 });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema, 'refresh_tokens');

module.exports = RefreshToken;
