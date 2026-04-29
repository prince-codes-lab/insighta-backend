/**
 * Request logger middleware.
 *
 * Logs every request with:
 *   - HTTP method
 *   - Endpoint (path)
 *   - Status code
 *   - Response time in milliseconds
 *   - Authenticated user (if any)
 *
 * Uses res.on('finish') so it logs AFTER the response is sent
 * and knows the final status code.
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const user     = req.user ? `[${req.user.username}]` : '[guest]';
    const line     = `${new Date().toISOString()} ${req.method} ${req.path} ${res.statusCode} ${duration}ms ${user}`;

    // Colour-code by status for easy reading in the terminal
    if (res.statusCode >= 500)      console.error('🔴 ', line);
    else if (res.statusCode >= 400) console.warn('🟡 ', line);
    else                            console.log('🟢 ', line);
  });

  next();
}

module.exports = requestLogger;
