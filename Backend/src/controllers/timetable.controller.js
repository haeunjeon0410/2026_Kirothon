const asyncHandler = require('../middleware/asyncHandler');
const timetableService = require('../services/timetable.service');

/**
 * POST /timetable/generate
 *
 * Generate a conflict-free, preference-optimized timetable.
 *
 * Body:
 *   - department: string (required)
 *   - courses: string[] (course names) — also accepts `courseNames` or `courseCodes`
 *   - preferences: object (optional timetable preferences)
 *   - year: number (optional, unused but accepted for frontend compat)
 *   - maxCredits: number (optional, unused but accepted for frontend compat)
 */
exports.generateTimetable = asyncHandler(async (req, res) => {
  try {
    const result = await timetableService.generateTimetable(req.body || {});
    res.json({ success: true, data: result });
  } catch (err) {
    // If the error has details (validation info), include them in the response
    if (err.details) {
      return res.status(err.statusCode || 400).json({
        success: false,
        error: {
          message: err.message,
          ...err.details,
        },
      });
    }
    throw err;
  }
});
