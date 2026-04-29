const mongoose = require('mongoose');

/**
 * Temporarily stores PKCE state during OAuth flow.
 * Includes code_verifier so the backend can complete the exchange
 * without needing the CLI to send it again in the callback.
 */
const oauthStateSchema = new mongoose.Schema(
  {
    state:          { type: String, required: true, unique: true },
    code_challenge: { type: String, default: null },
    code_verifier:  { type: String, default: null }, // stored for CLI PKCE exchange
    source:         { type: String, default: 'web' }, // 'cli' or 'web'
    expires_at: {
      type:    Date,
      default: () => new Date(Date.now() + 10 * 60 * 1000),
    },
  },
  { _id: true, versionKey: false }
);

oauthStateSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
oauthStateSchema.index({ state: 1 });

module.exports = mongoose.model('OAuthState', oauthStateSchema, 'oauth_states');
