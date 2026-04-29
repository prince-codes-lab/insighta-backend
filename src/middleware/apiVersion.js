/**
 * Enforces the X-API-Version: 1 header on all /api/* requests.
 *
 * Per the spec, requests without this header receive:
 *   400 Bad Request
 *   { "status": "error", "message": "API version header required" }
 */
function apiVersion(req, res, next) {
  const version = req.headers['x-api-version'];

  if (!version || version.trim() !== '1') {
    return res.status(400).json({
      status:  'error',
      message: 'API version header required',
    });
  }

  next();
}

module.exports = apiVersion;
