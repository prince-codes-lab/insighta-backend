const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    token:      { type: String, required: true, unique: true },
    user_id:    { type: String, required: true },
    expires_at: { type: Date, required: true },
    is_revoked: { type: Boolean, default: false },
    created_at: { type: Date, default: () => new Date() },
  },
  { _id: true, versionKey: false }
);

// TTL index — MongoDB auto-deletes expired tokens
refreshTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
// No duplicate indexes — unique:true on token already creates one

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema, 'refresh_tokens');
module.exports = RefreshToken;
