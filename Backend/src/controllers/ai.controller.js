const asyncHandler = require('../middleware/asyncHandler');
const aiService = require('../services/ai.service');

/**
 * POST /ai/roadmap
 * Body: { department, completedCourseNames, careerGoals, year, maxCreditsPerSemester? }
 */
exports.generateRoadmap = asyncHandler(async (req, res) => {
  const result = await aiService.generateRoadmap(req.body || {});
  res.json({ success: true, data: result });
});
