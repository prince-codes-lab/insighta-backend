/**
 * Role-based access control middleware factory.
 *
 * Usage:
 *   router.post('/profiles', authenticate, authorize('admin'), createProfile);
 *   router.get('/profiles',  authenticate, authorize('admin', 'analyst'), getProfiles);
 *
 * This function returns a middleware function.
 * The returned middleware checks req.user.role against the allowed roles.
 *
 * Must always run AFTER authenticate (which attaches req.user).
 *
 * @param {...string} roles  One or more allowed roles
 * @returns {Function}       Express middleware
 */
function authorize(...roles) {
  return (req, res, next) => {
    // req.user was attached by authenticate middleware
    if (!req.user) {
      return res.status(401).json({
        status:  'error',
        message: 'Not authenticated',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status:  'error',
        message: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }

    next();
  };
}

module.exports = authorize;
