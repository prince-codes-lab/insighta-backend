# Insighta Labs+ — Backend

Secure demographic intelligence platform. Extends Stage 2 with authentication, role-based access, API versioning, CSV export, and rate limiting.

---

## Quick Start

```bash
npm install
cp .env.example .env    # fill in all values
npm run seed
npm start
```

---

## System Architecture

```
Client (CLI / Web Portal)
        │
        ▼
  Express Server
  ├── /auth/*        GitHub OAuth + token management
  └── /api/profiles  Profile queries (protected)
        │
        ├── rateLimiter     (10/min auth, 60/min api)
        ├── requestLogger   (method, path, status, time)
        ├── apiVersion      (X-API-Version: 1 required)
        ├── authenticate    (JWT verification)
        ├── authorize       (role check)
        └── MongoDB
            ├── profiles        (2026 seeded records)
            ├── users           (GitHub OAuth users)
            ├── refresh_tokens  (with TTL auto-expiry)
            └── oauth_states    (PKCE state, 10min TTL)
```

---

## Authentication Flow

### CLI (PKCE)
1. CLI generates `code_verifier` (random) and `code_challenge` = SHA-256(`code_verifier`)
2. CLI calls `GET /auth/github?state=X&code_challenge=Y&source=cli`
3. Backend stores state + challenge, redirects to GitHub
4. GitHub redirects to `GET /auth/github/callback?code=Z&state=X`
5. Backend validates state, exchanges code with GitHub, fetches user
6. Backend creates/updates user, issues access + refresh tokens
7. Returns JSON `{ access_token, refresh_token, user }` to CLI

### Web (Browser)
Same as CLI but without PKCE. After callback, sets HTTP-only cookies and redirects to dashboard.

---

## Token Handling

| Token | Type | Expiry | Storage |
|-------|------|--------|---------|
| Access | JWT (signed) | 3 minutes | CLI: file / Web: HTTP-only cookie |
| Refresh | Opaque UUID (DB) | 5 minutes | CLI: file / Web: HTTP-only cookie |

- Each refresh token is **single-use** — using it issues a new pair and revokes the old one
- Logout revokes all refresh tokens for the user
- MongoDB TTL index auto-deletes expired tokens

---

## Role Enforcement

| Role | Can do |
|------|--------|
| `analyst` (default) | GET /api/profiles, GET /api/profiles/search, GET /api/profiles/export |
| `admin` | All of the above + POST /api/profiles |

Enforcement chain on every `/api/*` request:
```
apiVersion → authenticate → authorize(role) → controller
```
No scattered role checks. All enforced in middleware before the controller runs.

---

## API Versioning

All `/api/*` requests must include:
```
X-API-Version: 1
```
Missing → `400 { "status": "error", "message": "API version header required" }`

---

## Pagination Shape (Updated)

```json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 2026,
  "total_pages": 203,
  "links": {
    "self": "/api/profiles?page=1&limit=10",
    "next": "/api/profiles?page=2&limit=10",
    "prev": null
  },
  "data": [...]
}
```

---

## Natural Language Parsing

Rule-based parser — zero AI. See Stage 2 README for full keyword tables.

Supported patterns:
- Gender: `male/males/man/men` or `female/females/woman/women`
- Age group: `child/teenager/adult/senior` keywords
- `young` → ages 16–24 (not a stored group)
- Thresholds: `above 30`, `under 18`, `older than 25`
- Country: `from nigeria`, `in kenya` (80+ countries + aliases)

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string for JWT signing |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App secret |
| `GITHUB_CALLBACK_URL` | Must match GitHub app settings |
| `WEB_PORTAL_URL` | Web portal origin for CORS |
| `SEED_FILE_PATH` | Local path to seed JSON |
| `PORT` | Server port (default 3000) |

---

## Rate Limiting

| Scope | Limit |
|-------|-------|
| `/auth/*` | 10 requests / minute / IP |
| `/api/*` | 60 requests / minute / user |

Returns `429 Too Many Requests` when exceeded.
