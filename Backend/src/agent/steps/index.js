/**
 * Agent pipeline steps - each step is an independent reasoning module.
 */
module.exports = {
  analyzeHistory: require('./analyzeHistory'),
  checkGraduation: require('./checkGraduation'),
  detectMissing: require('./detectMissing'),
  analyzePrereqs: require('./analyzePrereqs'),
  matchCareerGoals: require('./matchCareerGoals'),
  generateRoadmap: require('./generateRoadmap'),
  generateTimetable: require('./generateTimetable'),
  detectRisks: require('./detectRisks'),
};
