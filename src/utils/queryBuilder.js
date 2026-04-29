/**
 * Builds a MongoDB filter object and sort object from validated parameters.
 *
 * Used by both GET /api/profiles (structured filters) and
 * GET /api/profiles/search (NL-parsed filters).
 */

// Whitelist of sortable fields → MongoDB field names
const VALID_SORT_FIELDS = {
  age:                'age',
  created_at:         'created_at',
  gender_probability: 'gender_probability',
};

/**
 * @param {object}          filters  Validated filter values
 * @param {string}          sortBy   One of 'age' | 'created_at' | 'gender_probability'
 * @param {'asc'|'desc'}    order
 * @returns {{ mongoFilter: object, sortObj: object }}
 */
function buildQuery(filters, sortBy, order) {
  const mongoFilter = {};

  // ── Exact-match filters ───────────────────────────────────────────────────
  if (filters.gender)     mongoFilter.gender     = filters.gender;
  if (filters.age_group)  mongoFilter.age_group  = filters.age_group;
  if (filters.country_id) mongoFilter.country_id = filters.country_id.toUpperCase();

  // ── Range filters on age ──────────────────────────────────────────────────
  if (filters.min_age !== undefined || filters.max_age !== undefined) {
    mongoFilter.age = {};
    if (filters.min_age !== undefined) mongoFilter.age.$gte = filters.min_age;
    if (filters.max_age !== undefined) mongoFilter.age.$lte = filters.max_age;
  }

  // ── Range filters on probability scores ───────────────────────────────────
  if (filters.min_gender_probability !== undefined) {
    mongoFilter.gender_probability = { $gte: filters.min_gender_probability };
  }

  if (filters.min_country_probability !== undefined) {
    mongoFilter.country_probability = { $gte: filters.min_country_probability };
  }

  // ── Sort ──────────────────────────────────────────────────────────────────
  const sortField = VALID_SORT_FIELDS[sortBy] || 'created_at';
  const sortDir   = order === 'asc' ? 1 : -1;   // MongoDB: 1=asc, -1=desc
  const sortObj   = { [sortField]: sortDir };

  return { mongoFilter, sortObj };
}

module.exports = { buildQuery };
