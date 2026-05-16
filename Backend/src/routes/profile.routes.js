const { Router } = require('express');
const profileController = require('../controllers/profile.controller');

const router = Router();

// ─── Academic Profile ────────────────────────────────────────────────────────

// PUT /profile/:userId - Create or update academic profile
router.put('/:userId', profileController.saveProfile);

// GET /profile/:userId - Get academic profile
router.get('/:userId', profileController.getProfile);

// ─── Saved Roadmaps ──────────────────────────────────────────────────────────

// POST /profile/:userId/roadmap - Save a roadmap
router.post('/:userId/roadmap', profileController.saveRoadmap);

// GET /profile/:userId/roadmap - Get latest roadmap
router.get('/:userId/roadmap', profileController.getLatestRoadmap);

// GET /profile/:userId/roadmaps - Get roadmap history
router.get('/:userId/roadmaps', profileController.getRoadmapHistory);

// ─── Saved Timetables ────────────────────────────────────────────────────────

// POST /profile/:userId/timetable - Save a timetable
router.post('/:userId/timetable', profileController.saveTimetable);

// GET /profile/:userId/timetable - Get latest timetable
router.get('/:userId/timetable', profileController.getLatestTimetable);

// GET /profile/:userId/timetables - Get timetable history
router.get('/:userId/timetables', profileController.getTimetableHistory);

module.exports = router;
