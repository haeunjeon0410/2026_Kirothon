const asyncHandler = require('../middleware/asyncHandler');
const profileService = require('../services/profile.service');

// ─── Academic Profile ────────────────────────────────────────────────────────

/**
 * PUT /profile/:userId
 * Create or update academic profile.
 */
exports.saveProfile = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await profileService.saveProfile(userId, req.body || {});
  res.json({ success: true, data: result });
});

/**
 * GET /profile/:userId
 * Get academic profile.
 */
exports.getProfile = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await profileService.getProfile(userId);
  res.json({ success: true, data: result });
});

// ─── Saved Roadmaps ──────────────────────────────────────────────────────────

/**
 * POST /profile/:userId/roadmap
 * Save a generated roadmap.
 */
exports.saveRoadmap = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await profileService.saveRoadmap(userId, req.body || {});
  res.status(201).json({ success: true, data: result });
});

/**
 * GET /profile/:userId/roadmap
 * Get the latest saved roadmap.
 */
exports.getLatestRoadmap = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await profileService.getLatestRoadmap(userId);
  res.json({ success: true, data: result });
});

/**
 * GET /profile/:userId/roadmaps
 * Get roadmap history (last 10).
 */
exports.getRoadmapHistory = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await profileService.getRoadmapHistory(userId);
  res.json({ success: true, data: result });
});

// ─── Saved Timetables ────────────────────────────────────────────────────────

/**
 * POST /profile/:userId/timetable
 * Save a generated timetable.
 */
exports.saveTimetable = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await profileService.saveTimetable(userId, req.body || {});
  res.status(201).json({ success: true, data: result });
});

/**
 * GET /profile/:userId/timetable
 * Get the latest saved timetable.
 */
exports.getLatestTimetable = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await profileService.getLatestTimetable(userId);
  res.json({ success: true, data: result });
});

/**
 * GET /profile/:userId/timetables
 * Get timetable history (last 10).
 */
exports.getTimetableHistory = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await profileService.getTimetableHistory(userId);
  res.json({ success: true, data: result });
});
