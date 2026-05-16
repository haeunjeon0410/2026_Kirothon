const AppError = require('../utils/AppError');

/**
 * Generic request body validator.
 * Pass an array of required field names.
 */
function validateRequest(requiredFields) {
  return (req, res, next) => {
    const missing = requiredFields.filter((field) => {
      const value = req.body[field];
      return value === undefined || value === null || value === '';
    });

    if (missing.length > 0) {
      throw new AppError(`Missing required fields: ${missing.join(', ')}`, 400);
    }

    next();
  };
}

module.exports = validateRequest;
