const datasetService = require('../../services/dataset.service');
const graduationService = require('../../services/graduation.service');

/**
 * Step 2: Check graduation requirements
 *
 * Uses the graduation engine to evaluate the student's progress against
 * their selected track (singleMajor, doubleMajor, minor, advancedMajor, linkedMajor).
 *
 * Input from context.input:
 *   - track (optional, defaults to 'singleMajor')
 *   - secondDepartment (optional, for doubleMajor/linkedMajor)
 *   - minorDepartment (optional, for minor track)
 */
async function checkGraduation(context) {
  const { department, completedCodes, year } = context.analyzeHistory;
  const input = context.input || {};

  const allCourses = datasetService.getCoursesByDepartment(department);
  const completedCourses = allCourses.filter((c) => completedCodes.includes(c.courseCode));

  const profile = graduationService.buildProfile({
    department,
    track: input.track || 'singleMajor',
    secondDepartment: input.secondDepartment || null,
    minorDepartment: input.minorDepartment || null,
    year: year || input.year || 1,
    completedCourses,
  });

  return graduationService.evaluate(profile);
}

module.exports = checkGraduation;
