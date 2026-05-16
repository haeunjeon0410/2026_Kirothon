const asyncHandler = require('../middleware/asyncHandler');
const academicService = require('../services/academic.service');

/**
 * POST /academic/analyze
 * Body: { department, completedCourseNames }
 */
exports.analyzeRecord = asyncHandler(async (req, res) => {
  const result = await academicService.analyzeRecord(req.body || {});
  res.json({ success: true, data: result });
});

/**
 * GET /academic/graduation-status/:userId?department=...&completedCourseNames=A,B&track=singleMajor&year=2
 */
exports.getGraduationStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const query = {};
  if (req.query.department) query.department = req.query.department.normalize('NFC');
  if (req.query.completedCourseNames) query.completedCourseNames = req.query.completedCourseNames.normalize('NFC');
  if (req.query.track) query.track = req.query.track;
  if (req.query.year) query.year = req.query.year;
  if (req.query.secondDepartment) query.secondDepartment = req.query.secondDepartment.normalize('NFC');
  if (req.query.minorDepartment) query.minorDepartment = req.query.minorDepartment.normalize('NFC');
  const status = await academicService.getGraduationStatus(userId, query);
  res.json({ success: true, data: status });
});

/**
 * GET /academic/tracks/:department
 */
exports.listTracks = asyncHandler(async (req, res) => {
  const department = decodeURIComponent(req.params.department).normalize('NFC');
  const tracks = await academicService.listTracks(department);
  res.json({ success: true, data: tracks });
});
