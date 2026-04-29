const axios = require('axios');

/**
 * Derives age_group from a numeric age.
 *
 * @param {number} age
 * @returns {string}
 */
function deriveAgeGroup(age) {
  if (age < 13) return 'child';
  if (age < 18) return 'teenager';
  if (age < 65) return 'adult';
  return 'senior';
}

/**
 * Calls the three free prediction APIs in parallel for a given name:
 *   - genderize.io  → gender + probability
 *   - agify.io      → age
 *   - nationalize.io → country_id + country_probability
 *
 * Then assembles and returns a complete profile object.
 *
 * @param {string} name  The full name to enrich
 * @returns {object}     Enriched profile data (without id / created_at)
 */
async function enrichProfile(name) {
  const encoded = encodeURIComponent(name.trim());

  // Fire all three requests at the same time — no waiting for one before the next
  const [genderRes, ageRes, nationRes] = await Promise.all([
    axios.get(`https://api.genderize.io/?name=${encoded}`),
    axios.get(`https://api.agify.io/?name=${encoded}`),
    axios.get(`https://api.nationalize.io/?name=${encoded}`),
  ]);

  const gender      = genderRes.data.gender     || 'male';
  const genderProb  = genderRes.data.probability || 0.5;

  // agify returns null for unknown names — default to 25
  const age         = ageRes.data.age || 25;

  // nationalize returns an array of countries sorted by probability
  // Pick the highest-probability one, or default to NG
  const countries     = nationRes.data.country || [];
  const topCountry    = countries[0] || { country_id: 'NG', probability: 0.5 };
  const countryId     = topCountry.country_id;
  const countryProb   = topCountry.probability;

  // Resolve the full country name from our existing lookup map
  const countryName = resolveCountryName(countryId);

  return {
    name:                name.trim(),
    gender:              gender.toLowerCase(),
    gender_probability:  parseFloat(genderProb.toFixed(4)),
    age:                 parseInt(age, 10),
    age_group:           deriveAgeGroup(parseInt(age, 10)),
    country_id:          countryId.toUpperCase(),
    country_name:        countryName,
    country_probability: parseFloat(countryProb.toFixed(4)),
  };
}

/**
 * Simple reverse lookup — ISO-2 code → country name.
 * Uses a minimal map; falls back to the code itself if not found.
 *
 * @param {string} code  ISO 3166-1 alpha-2
 * @returns {string}
 */
function resolveCountryName(code) {
  const MAP = {
    NG: 'Nigeria',    GH: 'Ghana',      KE: 'Kenya',
    ZA: 'South Africa', TZ: 'Tanzania', UG: 'Uganda',
    ET: 'Ethiopia',   EG: 'Egypt',      CM: 'Cameroon',
    SN: 'Senegal',    CI: "Côte d'Ivoire", AO: 'Angola',
    MZ: 'Mozambique', ZM: 'Zambia',     ZW: 'Zimbabwe',
    RW: 'Rwanda',     ML: 'Mali',       BJ: 'Benin',
    US: 'United States', CA: 'Canada',  MX: 'Mexico',
    BR: 'Brazil',     AR: 'Argentina',  CO: 'Colombia',
    GB: 'United Kingdom', FR: 'France', DE: 'Germany',
    IT: 'Italy',      ES: 'Spain',      PT: 'Portugal',
    IN: 'India',      CN: 'China',      JP: 'Japan',
    KR: 'South Korea', AU: 'Australia', PH: 'Philippines',
    PK: 'Pakistan',   BD: 'Bangladesh', ID: 'Indonesia',
    VN: 'Vietnam',    TH: 'Thailand',   MA: 'Morocco',
    DZ: 'Algeria',    TN: 'Tunisia',    SD: 'Sudan',
    CD: 'DR Congo',   CG: 'Congo',      BF: 'Burkina Faso',
    NE: 'Niger',      TD: 'Chad',       SO: 'Somalia',
    BI: 'Burundi',    BW: 'Botswana',   MW: 'Malawi',
    LS: 'Lesotho',    SZ: 'Eswatini',   GM: 'Gambia',
    GN: 'Guinea',     SL: 'Sierra Leone', LR: 'Liberia',
    BF2: 'Burkina',   MR: 'Mauritania', CF: 'Central African Republic',
    SS: 'South Sudan', ER: 'Eritrea',   DJ: 'Djibouti',
    RU: 'Russia',     UA: 'Ukraine',    PL: 'Poland',
    TR: 'Turkey',     SA: 'Saudi Arabia', AE: 'UAE',
    IR: 'Iran',       IQ: 'Iraq',       IL: 'Israel',
    NZ: 'New Zealand',
  };
  return MAP[code] || code;
}

module.exports = { enrichProfile };
