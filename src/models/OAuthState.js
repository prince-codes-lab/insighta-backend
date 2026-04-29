const mongoose = require('mongoose');

/**
 * Temporarily stores PKCE state and code_challenge during the OAuth flow.
 *
 * Created when the OAuth flow begins (GET /auth/github).
 * Read and deleted when the callback arrives (GET /auth/github/callback).
 * Auto-deleted by MongoDB TTL after 10 minutes if never used.
 */
const oauthStateSchema = new mongoose.Schema(
  {
    state: {
      type:     String,
      required: true,
      unique:   true,
    },
    // The hashed version of code_verifier, sent to GitHub during callback.
    // Only present for CLI (PKCE) flows. Null for browser flows.
    code_challenge: {
      type:    String,
      default: null,
    },
    // 'cli' or 'web'
    source: {
      type:    String,
      default: 'web',
    },
    expires_at: {
      type:    Date,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
  },
  {
    _id:        true,
    versionKey: false,
  }
);

// Auto-delete after expires_at
oauthStateSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
oauthStateSchema.index({ state: 1 });

const OAuthState = mongoose.model('OAuthState', oauthStateSchema, 'oauth_states');

module.exports = OAuthState;
