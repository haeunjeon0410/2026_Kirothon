const prisma = require('../utils/prisma');
const AppError = require('../utils/AppError');

/**
 * User Academic Profile Service
 *
 * Manages persistent academic profiles, saved roadmaps, and saved timetables.
 * All operations are user-scoped and support overwriting previous plans.
 */

// ─── Academic Profile ────────────────────────────────────────────────────────

/**
 * Create or update a user's academic profile.
 * Upserts on userId — only one profile per user.
 */
async function saveProfile(userId, data) {
  if (!userId) throw new AppError('userId is required', 400);

  const profile = await prisma.userAcademicProfile.upsert({
    where: { userId },
    create: {
      userId,
      mainMajor: data.mainMajor || '',
      doubleMajor: data.doubleMajor || null,
      minor: data.minor || null,
      linkedMajor: data.linkedMajor || null,
      advancedMajor: data.advancedMajor || null,
      track: data.track || 'singleMajor',
      currentSemester: data.currentSemester || 1,
      currentYear: data.currentYear || 1,
      careerGoals: data.careerGoals || [],
      completedCourseNames: data.completedCourseNames || [],
      timetablePreferences: data.timetablePreferences || null,
    },
    update: {
      mainMajor: data.mainMajor,
      doubleMajor: data.doubleMajor !== undefined ? data.doubleMajor : undefined,
      minor: data.minor !== undefined ? data.minor : undefined,
      linkedMajor: data.linkedMajor !== undefined ? data.linkedMajor : undefined,
      advancedMajor: data.advancedMajor !== undefined ? data.advancedMajor : undefined,
      track: data.track !== undefined ? data.track : undefined,
      currentSemester: data.currentSemester !== undefined ? data.currentSemester : undefined,
      currentYear: data.currentYear !== undefined ? data.currentYear : undefined,
      careerGoals: data.careerGoals !== undefined ? data.careerGoals : undefined,
      completedCourseNames: data.completedCourseNames !== undefined ? data.completedCourseNames : undefined,
      timetablePreferences: data.timetablePreferences !== undefined ? data.timetablePreferences : undefined,
    },
  });

  return formatProfile(profile);
}

/**
 * Get a user's academic profile.
 */
async function getProfile(userId) {
  if (!userId) throw new AppError('userId is required', 400);

  const profile = await prisma.userAcademicProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new AppError('Academic profile not found. Create one first.', 404);
  }

  return formatProfile(profile);
}

function formatProfile(profile) {
  return {
    id: profile.id,
    userId: profile.userId,
    mainMajor: profile.mainMajor,
    doubleMajor: profile.doubleMajor,
    minor: profile.minor,
    linkedMajor: profile.linkedMajor,
    advancedMajor: profile.advancedMajor,
    track: profile.track,
    currentSemester: profile.currentSemester,
    currentYear: profile.currentYear,
    careerGoals: profile.careerGoals,
    completedCourseNames: profile.completedCourseNames,
    timetablePreferences: profile.timetablePreferences,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

// ─── Saved Roadmaps ──────────────────────────────────────────────────────────

/**
 * Save a roadmap for a user. Marks previous roadmaps as not-latest.
 */
async function saveRoadmap(userId, data) {
  if (!userId) throw new AppError('userId is required', 400);

  // Mark all previous roadmaps as not-latest
  await prisma.savedRoadmap.updateMany({
    where: { userId, isLatest: true },
    data: { isLatest: false },
  });

  const roadmap = await prisma.savedRoadmap.create({
    data: {
      userId,
      title: data.title || 'Generated Roadmap',
      department: data.department || '',
      track: data.track || 'singleMajor',
      semesters: data.semesters || [],
      metadata: data.metadata || null,
      isLatest: true,
    },
  });

  return formatRoadmap(roadmap);
}

/**
 * Get the latest saved roadmap for a user.
 */
async function getLatestRoadmap(userId) {
  if (!userId) throw new AppError('userId is required', 400);

  const roadmap = await prisma.savedRoadmap.findFirst({
    where: { userId, isLatest: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!roadmap) {
    throw new AppError('No saved roadmap found. Generate one first.', 404);
  }

  return formatRoadmap(roadmap);
}

/**
 * Get all saved roadmaps for a user (history).
 */
async function getRoadmapHistory(userId) {
  if (!userId) throw new AppError('userId is required', 400);

  const roadmaps = await prisma.savedRoadmap.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return roadmaps.map(formatRoadmap);
}

function formatRoadmap(roadmap) {
  return {
    id: roadmap.id,
    userId: roadmap.userId,
    title: roadmap.title,
    department: roadmap.department,
    track: roadmap.track,
    semesters: roadmap.semesters,
    metadata: roadmap.metadata,
    isLatest: roadmap.isLatest,
    createdAt: roadmap.createdAt,
    updatedAt: roadmap.updatedAt,
  };
}

// ─── Saved Timetables ────────────────────────────────────────────────────────

/**
 * Save a timetable for a user. Marks previous timetables as not-latest.
 */
async function saveTimetable(userId, data) {
  if (!userId) throw new AppError('userId is required', 400);

  // Mark all previous timetables as not-latest
  await prisma.savedTimetable.updateMany({
    where: { userId, isLatest: true },
    data: { isLatest: false },
  });

  const timetable = await prisma.savedTimetable.create({
    data: {
      userId,
      semester: data.semester || 0,
      department: data.department || '',
      schedule: data.schedule || {},
      preferences: data.preferences || null,
      timetableScore: data.timetableScore || null,
      satisfiedPreferences: data.satisfiedPreferences || null,
      violatedPreferences: data.violatedPreferences || null,
      optimizationReasoning: data.optimizationReasoning || null,
      isLatest: true,
    },
  });

  return formatTimetable(timetable);
}

/**
 * Get the latest saved timetable for a user.
 */
async function getLatestTimetable(userId) {
  if (!userId) throw new AppError('userId is required', 400);

  const timetable = await prisma.savedTimetable.findFirst({
    where: { userId, isLatest: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!timetable) {
    throw new AppError('No saved timetable found. Generate one first.', 404);
  }

  return formatTimetable(timetable);
}

/**
 * Get all saved timetables for a user (history).
 */
async function getTimetableHistory(userId) {
  if (!userId) throw new AppError('userId is required', 400);

  const timetables = await prisma.savedTimetable.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return timetables.map(formatTimetable);
}

function formatTimetable(timetable) {
  return {
    id: timetable.id,
    userId: timetable.userId,
    semester: timetable.semester,
    department: timetable.department,
    schedule: timetable.schedule,
    preferences: timetable.preferences,
    timetableScore: timetable.timetableScore,
    satisfiedPreferences: timetable.satisfiedPreferences,
    violatedPreferences: timetable.violatedPreferences,
    optimizationReasoning: timetable.optimizationReasoning,
    isLatest: timetable.isLatest,
    createdAt: timetable.createdAt,
  };
}

module.exports = {
  saveProfile,
  getProfile,
  saveRoadmap,
  getLatestRoadmap,
  getRoadmapHistory,
  saveTimetable,
  getLatestTimetable,
  getTimetableHistory,
};
