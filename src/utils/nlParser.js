/**
 * Rule-based natural language query parser.
 *
 * Converts plain-English queries into a filter object that can be
 * applied directly to a MongoDB query. Zero AI / LLM dependency.
 *
 * Parsing order:
 *   1. Gender
 *   2. Age group
 *   3. "young" keyword (only if no age group found)
 *   4. Explicit age thresholds (above / below)
 *   5. Country (from / in)
 *   6. Reject if nothing was parsed
 */

const { lookupCountryCode } = require('./countries');

// ── Keyword patterns ──────────────────────────────────────────────────────────

// Male keywords
const MALE_RE = /\b(male|males|man|men|boy|boys|gentleman|gentlemen)\b/i;

// Female keywords
const FEMALE_RE = /\b(female|females|woman|women|girl|girls|lady|ladies)\b/i;

// Age group keywords mapped to stored enum values
const AGE_GROUP_PATTERNS = [
  { re: /\b(child|children|kid|kids|infant|infants|toddler|toddlers)\b/i,          group: 'child'    },
  { re: /\b(teen|teens|teenager|teenagers|adolescent|adolescents|juvenile)\b/i,    group: 'teenager' },
  { re: /\b(adult|adults|grown-?up|grown-?ups|middle-?aged)\b/i,                   group: 'adult'    },
  { re: /\b(senior|seniors|elderly|elder|elders|old\s+people|aged)\b/i,            group: 'senior'   },
];

// "young" — maps to 16–24 per spec (NOT a stored age_group)
const YOUNG_RE = /\byoung\b/i;

// Explicit age thresholds — captures the numeric value
// Handles: above 30, over 30, older than 30, at least 30, minimum age 30, from age 30
const ABOVE_RE = /\b(?:above|over|older\s+than|at\s+least|minimum\s+age|from\s+age)\s+(\d{1,3})\b/i;

// Handles: below 18, under 18, younger than 18, at most 18, maximum age 18, up to 18
const BELOW_RE = /\b(?:below|under|younger\s+than|at\s+most|maximum\s+age|up\s+to)\s+(\d{1,3})\b/i;

// Country extraction — grabs text following "from" or "in"
// Stops at digits, certain age keywords, or end-of-string
const FROM_RE = /\b(?:from|in)\s+([a-z][a-z''\-\s]*?)(?=\s+(?:\d|above|below|over|under|older|younger|aged|between|with\b|and\s+(?:above|below|over|under))|$)/i;

// ── Parser ────────────────────────────────────────────────────────────────────

/**
 * @param {string} q  Raw query string from ?q=
 * @returns {object|null}  Filter object, or null if the query can't be interpreted
 */
function parseQuery(q) {
  if (!q || typeof q !== 'string' || !q.trim()) return null;

  const query   = q.trim();
  const filters = {};

  // ── 1. Gender ──────────────────────────────────────────────────────────────
  const hasMale   = MALE_RE.test(query);
  const hasFemale = FEMALE_RE.test(query);

  if (hasMale && !hasFemale)  filters.gender = 'male';
  if (hasFemale && !hasMale)  filters.gender = 'female';
  // If BOTH appear (e.g. "male and female teenagers"), no gender filter is set.
  // This matches the spec example: "male and female teenagers above 17" → age_group + min_age only.

  // ── 2. Age group ───────────────────────────────────────────────────────────
  for (const { re, group } of AGE_GROUP_PATTERNS) {
    if (re.test(query)) {
      filters.age_group = group;
      break; // first match wins
    }
  }

  // ── 3. "young" → age range 16–24 (only when no explicit age_group found) ──
  if (!filters.age_group && YOUNG_RE.test(query)) {
    filters.min_age = 16;
    filters.max_age = 24;
  }

  // ── 4. Explicit age thresholds ─────────────────────────────────────────────
  const aboveMatch = ABOVE_RE.exec(query);
  if (aboveMatch) {
    filters.min_age = parseInt(aboveMatch[1], 10);
  }

  const belowMatch = BELOW_RE.exec(query);
  if (belowMatch) {
    filters.max_age = parseInt(belowMatch[1], 10);
  }

  // ── 5. Country ─────────────────────────────────────────────────────────────
  const fromMatch = FROM_RE.exec(query);
  if (fromMatch) {
    const code = lookupCountryCode(fromMatch[1]);
    if (code) filters.country_id = code;
  }

  // ── 6. If nothing was parsed, signal failure ───────────────────────────────
  if (Object.keys(filters).length === 0) return null;

  return filters;
}

module.exports = { parseQuery };
