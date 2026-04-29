/**
 * Validation middleware for the profiles routes.
 *
 * Each function validates the raw query string parameters for its endpoint.
 * On failure  → responds immediately with 400 or 422, controller never runs.
 * On success  → attaches clean parsed values to req.parsedParams, calls next().
 */

// ── Whitelists ────────────────────────────────────────────────────────────────

const VALID_GENDERS    = new Set(['male', 'female']);
const VALID_AGE_GROUPS = new Set(['child', 'teenager', 'adult', 'senior']);
const VALID_SORT_BY    = new Set(['age', 'created_at', 'gender_probability']);
const VALID_ORDERS     = new Set(['asc', 'desc']);

// ── Helpers ───────────────────────────────────────────────────────────────────

function isPositiveInt(value) {
  return Number.isInteger(value) && value > 0;
}

function isValidProbability(value) {
  return typeof value === 'number' && !isNaN(value) && value >= 0 && value <= 1;
}

// ── Middleware: GET /api/profiles ─────────────────────────────────────────────

/**
 * Validates all query parameters for the structured profiles endpoint.
 * Attaches { filters, sortBy, order, page, limit } to req.parsedParams.
 */
function validateGetProfiles(req, res, next) {
  const {
    gender,
    age_group,
    country_id,
    min_age,
    max_age,
    min_gender_probability,
    min_country_probability,
    sort_by = 'created_at',
    order   = 'desc',
    page:  rawPage  = '1',
    limit: rawLimit = '10',
  } = req.query;

  const filters    = {};
  const badFields  = [];

  // ── gender ────────────────────────────────────────────────────────────────
  if (gender !== undefined) {
    if (!VALID_GENDERS.has(gender.toLowerCase())) {
      badFields.push('gender');
    } else {
      filters.gender = gender.toLowerCase();
    }
  }

  // ── age_group ─────────────────────────────────────────────────────────────
  if (age_group !== undefined) {
    if (!VALID_AGE_GROUPS.has(age_group.toLowerCase())) {
      badFields.push('age_group');
    } else {
      filters.age_group = age_group.toLowerCase();
    }
  }

  // ── country_id ────────────────────────────────────────────────────────────
  if (country_id !== undefined) {
    const cid = country_id.toUpperCase();
    if (!/^[A-Z]{2}$/.test(cid)) {
      badFields.push('country_id');
    } else {
      filters.country_id = cid;
    }
  }

  // ── min_age ───────────────────────────────────────────────────────────────
  if (min_age !== undefined) {
    const v = parseInt(min_age, 10);
    if (isNaN(v) || v < 0) {
      badFields.push('min_age');
    } else {
      filters.min_age = v;
    }
  }

  // ── max_age ───────────────────────────────────────────────────────────────
  if (max_age !== undefined) {
    const v = parseInt(max_age, 10);
    if (isNaN(v) || v < 0) {
      badFields.push('max_age');
    } else {
      filters.max_age = v;
    }
  }

  // ── min_gender_probability ────────────────────────────────────────────────
  if (min_gender_probability !== undefined) {
    const v = parseFloat(min_gender_probability);
    if (!isValidProbability(v)) {
      badFields.push('min_gender_probability');
    } else {
      filters.min_gender_probability = v;
    }
  }

  // ── min_country_probability ───────────────────────────────────────────────
  if (min_country_probability !== undefined) {
    const v = parseFloat(min_country_probability);
    if (!isValidProbability(v)) {
      badFields.push('min_country_probability');
    } else {
      filters.min_country_probability = v;
    }
  }

  // ── sort_by ───────────────────────────────────────────────────────────────
  if (!VALID_SORT_BY.has(sort_by)) {
    badFields.push('sort_by');
  }

  // ── order ─────────────────────────────────────────────────────────────────
  if (!VALID_ORDERS.has(order.toLowerCase())) {
    badFields.push('order');
  }

  // ── page & limit ──────────────────────────────────────────────────────────
  const page  = parseInt(rawPage,  10);
  const limit = parseInt(rawLimit, 10);

  if (!isPositiveInt(page))                    badFields.push('page');
  if (!isPositiveInt(limit) || limit > 50)     badFields.push('limit');

  // ── Reject if anything was invalid ───────────────────────────────────────
  if (badFields.length > 0) {
    return res.status(422).json({
      status:  'error',
      message: 'Invalid query parameters',
    });
  }

  // ── Attach clean values for the controller ────────────────────────────────
  req.parsedParams = {
    filters,
    sortBy: sort_by,
    order:  order.toLowerCase(),
    page,
    limit,
  };

  next();
}

// ── Middleware: GET /api/profiles/search ──────────────────────────────────────

/**
 * Validates the ?q= string and pagination params for the search endpoint.
 * Attaches { q, page, limit } to req.parsedParams.
 */
function validateSearchProfiles(req, res, next) {
  const { q, page: rawPage = '1', limit: rawLimit = '10' } = req.query;

  // ── q is required and must not be empty ───────────────────────────────────
  if (!q || q.trim() === '') {
    return res.status(400).json({
      status:  'error',
      message: 'Missing or empty query parameter: q',
    });
  }

  // ── pagination ────────────────────────────────────────────────────────────
  const page  = parseInt(rawPage,  10);
  const limit = parseInt(rawLimit, 10);

  if (!isPositiveInt(page) || !isPositiveInt(limit) || limit > 50) {
    return res.status(422).json({
      status:  'error',
      message: 'Invalid query parameters',
    });
  }

  // ── Attach clean values for the controller ────────────────────────────────
  req.parsedParams = {
    q: q.trim(),
    page,
    limit,
  };

  next();
}

module.exports = { validateGetProfiles, validateSearchProfiles };
