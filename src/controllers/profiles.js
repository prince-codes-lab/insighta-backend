const { v7: uuidv7 }    = require('uuid');
const Profile            = require('../db/Profile');
const { buildQuery }     = require('../utils/queryBuilder');
const { parseQuery }     = require('../utils/nlParser');
const { enrichProfile }  = require('../utils/profileEnricher');

const PROJECTION = {
  _id: 0, id: 1, name: 1, gender: 1, gender_probability: 1,
  age: 1, age_group: 1, country_id: 1, country_name: 1,
  country_probability: 1, created_at: 1,
};

function buildPagination(total, page, limit, basePath, query) {
  const total_pages = Math.ceil(total / limit);
  const buildLink = (targetPage) => {
    const params = { ...query, page: targetPage, limit };
    const qs = new URLSearchParams(params).toString();
    return `${basePath}?${qs}`;
  };
  return {
    page, limit, total, total_pages,
    links: {
      self: buildLink(page),
      next: page < total_pages ? buildLink(page + 1) : null,
      prev: page > 1           ? buildLink(page - 1) : null,
    },
  };
}

async function getAllProfiles(req, res, next) {
  try {
    const { filters, sortBy, order, page, limit } = req.parsedParams;
    const { mongoFilter, sortObj } = buildQuery(filters, sortBy, order);
    const skip = (page - 1) * limit;
    const [total, data] = await Promise.all([
      Profile.countDocuments(mongoFilter),
      Profile.find(mongoFilter, PROJECTION).sort(sortObj).skip(skip).limit(limit).lean(),
    ]);
    const pagination = buildPagination(total, page, limit, '/api/profiles', req.query);
    return res.status(200).json({ status: 'success', ...pagination, data });
  } catch (err) { next(err); }
}

async function searchProfiles(req, res, next) {
  try {
    const { q, page, limit } = req.parsedParams;
    const nlFilters = parseQuery(q);
    if (!nlFilters) {
      return res.status(422).json({ status: 'error', message: 'Unable to interpret query' });
    }
    const { mongoFilter, sortObj } = buildQuery(nlFilters, 'created_at', 'desc');
    const skip = (page - 1) * limit;
    const [total, data] = await Promise.all([
      Profile.countDocuments(mongoFilter),
      Profile.find(mongoFilter, PROJECTION).sort(sortObj).skip(skip).limit(limit).lean(),
    ]);
    const pagination = buildPagination(total, page, limit, '/api/profiles/search', req.query);
    return res.status(200).json({ status: 'success', ...pagination, data });
  } catch (err) { next(err); }
}

async function createProfile(req, res, next) {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'name is required' });
    }
    const existing = await Profile.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({ status: 'error', message: 'A profile with this name already exists' });
    }
    const enriched = await enrichProfile(name);
    const profile  = await Profile.create({ id: uuidv7(), ...enriched, created_at: new Date() });
    const data = {};
    Object.keys(PROJECTION).forEach(k => { if (k !== '_id') data[k] = profile[k]; });
    return res.status(201).json({ status: 'success', data });
  } catch (err) { next(err); }
}

async function exportProfiles(req, res, next) {
  try {
    const { filters, sortBy, order } = req.parsedParams;
    const { mongoFilter, sortObj }   = buildQuery(filters, sortBy, order);
    const profiles = await Profile.find(mongoFilter, PROJECTION).sort(sortObj).lean();

    const COLUMNS = [
      'id','name','gender','gender_probability','age','age_group',
      'country_id','country_name','country_probability','created_at',
    ];
    const header = COLUMNS.join(',');
    const rows = profiles.map(p =>
      COLUMNS.map(col => {
        const str = String(p[col] ?? '');
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(',')
    );
    const csv      = [header, ...rows].join('\n');
    const filename = `profiles_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (err) { next(err); }
}

module.exports = { getAllProfiles, searchProfiles, createProfile, exportProfiles };
