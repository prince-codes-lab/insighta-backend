const crypto         = require('crypto');
const axios          = require('axios');
const { v7: uuidv7 } = require('uuid');
const User           = require('../models/User');
const OAuthState     = require('../models/OAuthState');
const { issueTokens, rotateRefreshToken, revokeAllUserTokens } = require('../utils/tokenService');

function randomBase64url(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function sha256Base64url(str) {
  return crypto.createHash('sha256').update(str).digest('base64url');
}

// ── GET /auth/github ──────────────────────────────────────────────────────────
// For CLI: receives state + code_verifier from CLI, derives challenge itself
// For web: generates state itself, no PKCE

async function initiateOAuth(req, res, next) {
  try {
    const { state: cliState, code_verifier: cliVerifier, source } = req.query;
    const flowSource = source === 'cli' ? 'cli' : 'web';

    const state = cliState || randomBase64url(32);

    let code_challenge = null;
    let code_verifier  = null;

    if (flowSource === 'cli' && cliVerifier) {
      // CLI sends us the verifier — we derive the challenge and store both
      code_verifier  = cliVerifier;
      code_challenge = sha256Base64url(cliVerifier);
    }

    // Store state + verifier so callback can complete the exchange
    await OAuthState.create({ state, code_challenge, code_verifier, source: flowSource });

    const params = new URLSearchParams({
      client_id:    process.env.GITHUB_CLIENT_ID,
      redirect_uri: process.env.GITHUB_CALLBACK_URL,
      scope:        'read:user user:email',
      state,
    });

    // Only add PKCE params when we have a challenge (CLI flow)
    if (code_challenge) {
      params.set('code_challenge',        code_challenge);
      params.set('code_challenge_method', 'S256');
    }

    return res.redirect(`https://github.com/login/oauth/authorize?${params}`);

  } catch (err) {
    next(err);
  }
}

// ── GET /auth/github/callback ─────────────────────────────────────────────────

async function handleCallback(req, res, next) {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).json({ status: 'error', message: 'Missing code or state' });
    }

    // Validate and retrieve stored state
    const storedState = await OAuthState.findOne({ state });
    if (!storedState) {
      return res.status(400).json({ status: 'error', message: 'Invalid or expired state' });
    }

    // Delete immediately — one time use
    await OAuthState.deleteOne({ state });

    // Build exchange payload
    const exchangePayload = {
      client_id:     process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri:  process.env.GITHUB_CALLBACK_URL,
    };

    // If this was a PKCE flow, include the stored code_verifier
    if (storedState.source === 'cli' && storedState.code_verifier) {
      exchangePayload.code_verifier = storedState.code_verifier;
    }

    // Exchange code for GitHub access token
    let tokenRes;
    try {
      tokenRes = await axios.post(
        'https://github.com/login/oauth/access_token',
        exchangePayload,
        { headers: { Accept: 'application/json' } }
      );
    } catch (axiosErr) {
      const errData = axiosErr.response?.data || {};
      console.error('GitHub token exchange error:', axiosErr.response?.status, JSON.stringify(errData));
      return res.status(400).json({
        status:  'error',
        message: 'GitHub token exchange failed: ' + (errData.error_description || errData.error || axiosErr.message),
      });
    }

    const githubAccessToken = tokenRes.data.access_token;
    if (!githubAccessToken) {
      console.error('GitHub token exchange failed. Response:', JSON.stringify(tokenRes.data));
      return res.status(400).json({
        status:  'error',
        message: 'GitHub token exchange failed: ' + (tokenRes.data.error_description || tokenRes.data.error || 'unknown'),
      });
    }

    // Fetch GitHub user profile and emails in parallel
    const [userRes, emailRes] = await Promise.all([
      axios.get('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${githubAccessToken}` },
      }),
      axios.get('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${githubAccessToken}` },
      }).catch(() => ({ data: [] })),
    ]);

    const ghUser  = userRes.data;
    const primary = (emailRes.data || []).find?.(e => e.primary)?.email || ghUser.email || null;

    // Create or update user
    let user = await User.findOne({ github_id: String(ghUser.id) });

    if (!user) {
      user = await User.create({
        id:            uuidv7(),
        github_id:     String(ghUser.id),
        username:      ghUser.login,
        email:         primary,
        avatar_url:    ghUser.avatar_url,
        role:          'analyst',
        is_active:     true,
        last_login_at: new Date(),
        created_at:    new Date(),
      });
    } else {
      user.username      = ghUser.login;
      user.email         = primary;
      user.avatar_url    = ghUser.avatar_url;
      user.last_login_at = new Date();
      await user.save();
    }

    if (!user.is_active) {
      return res.status(403).json({ status: 'error', message: 'Account is deactivated' });
    }

    // Issue our tokens
    const tokens = await issueTokens(user);

    // ── CLI flow — return JSON ────────────────────────────────────────────────
    if (storedState.source === 'cli') {
      return res.status(200).json({
        status:        'success',
        access_token:  tokens.access_token,
        refresh_token: tokens.refresh_token,
        user: {
          id:         user.id,
          username:   user.username,
          role:       user.role,
          avatar_url: user.avatar_url,
        },
      });
    }

    // ── Web flow — set HTTP-only cookies and redirect ─────────────────────────
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure:   isProduction,
      sameSite: isProduction ? 'none' : 'lax',
    };

    res.cookie('access_token',  tokens.access_token,  { ...cookieOptions, maxAge: 3 * 60 * 1000 });
    res.cookie('refresh_token', tokens.refresh_token, { ...cookieOptions, maxAge: 5 * 60 * 1000 });

    const portalUrl = process.env.WEB_PORTAL_URL || 'http://localhost:5173';
    return res.redirect(`${portalUrl}/?loggedin=1`);

  } catch (err) {
    next(err);
  }
}

// ── POST /auth/refresh ────────────────────────────────────────────────────────

async function refreshTokens(req, res, next) {
  try {
    const rawToken = req.body?.refresh_token || req.cookies?.refresh_token;

    if (!rawToken) {
      return res.status(400).json({ status: 'error', message: 'Refresh token required' });
    }

    const tokens = await rotateRefreshToken(rawToken, User);

    if (req.cookies?.refresh_token) {
      const isProduction = process.env.NODE_ENV === 'production';
      const cookieOptions = {
        httpOnly: true,
        secure:   isProduction,
        sameSite: isProduction ? 'none' : 'lax',
      };
      res.cookie('access_token',  tokens.access_token,  { ...cookieOptions, maxAge: 3 * 60 * 1000 });
      res.cookie('refresh_token', tokens.refresh_token, { ...cookieOptions, maxAge: 5 * 60 * 1000 });
    }

    return res.status(200).json({
      status:        'success',
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token,
    });

  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ status: 'error', message: err.message });
    }
    next(err);
  }
}

// ── POST /auth/logout ─────────────────────────────────────────────────────────

async function logout(req, res, next) {
  try {
    await revokeAllUserTokens(req.user.id);
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return res.status(200).json({ status: 'success', message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

// ── GET /auth/me ──────────────────────────────────────────────────────────────

async function getMe(req, res) {
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
}

module.exports = { initiateOAuth, handleCallback, refreshTokens, logout, getMe };
