/**
 * Middleware to normalize Unicode strings in request body to NFC form.
 *
 * Korean text can arrive as NFD (decomposed, common from macOS) or NFC (composed).
 * This ensures consistent matching against dataset keys regardless of client platform.
 */
function normalizeUnicode(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = deepNormalize(req.body);
  }
  next();
}

function deepNormalize(obj) {
  if (typeof obj === 'string') return obj.normalize('NFC');
  if (Array.isArray(obj)) return obj.map(deepNormalize);
  if (obj !== null && typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key.normalize('NFC')] = deepNormalize(value);
    }
    return result;
  }
  return obj;
}

module.exports = normalizeUnicode;
