const express      = require('express');
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');
const apiVersion   = require('../middleware/apiVersion');
const { apiLimiter } = require('../middleware/rateLimiter');
const { validateGetProfiles, validateSearchProfiles } = require('../middleware/validate');
const {
  getAllProfiles, searchProfiles,
  createProfile, exportProfiles,
} = require('../controllers/profiles');

const router = express.Router();

// Every /api/profiles route requires: rate limit + API version header + authentication
router.use(apiLimiter);
router.use(apiVersion);
router.use(authenticate);

// GET /api/profiles/search  — analyst + admin
router.get('/search', validateSearchProfiles, authorize('admin', 'analyst'), searchProfiles);

// GET /api/profiles/export  — analyst + admin (same filters as list)
router.get('/export', validateGetProfiles, authorize('admin', 'analyst'), exportProfiles);

// GET /api/profiles         — analyst + admin
router.get('/', validateGetProfiles, authorize('admin', 'analyst'), getAllProfiles);

// POST /api/profiles        — admin only
router.post('/', authorize('admin'), createProfile);

module.exports = router;
