const asyncHandler = require('../middleware/asyncHandler');
const courseService = require('../services/course.service');
const datasetService = require('../services/dataset.service');

/**
 * GET /courses/major/:major
 */
exports.getCoursesByMajor = asyncHandler(async (req, res) => {
  const major = decodeURIComponent(req.params.major).normalize('NFC');
  const courses = courseService.getCoursesByMajor(major);
  res.json({ success: true, data: courses });
});

/**
 * GET /courses/departments
 */
exports.listDepartments = asyncHandler(async (req, res) => {
  const departments = datasetService.listDepartments();
  res.json({ success: true, data: departments });
});
