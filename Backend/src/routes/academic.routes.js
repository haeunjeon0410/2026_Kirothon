const { Router } = require('express');
const academicController = require('../controllers/academic.controller');

const router = Router();

// POST /academic/analyze - Analyze student academic record
router.post('/analyze', academicController.analyzeRecord);

// GET /academic/graduation-status/:userId - Check graduation eligibility
router.get('/graduation-status/:userId', academicController.getGraduationStatus);

// GET /academic/tracks/:department - List available graduation tracks
router.get('/tracks/:department', academicController.listTracks);

module.exports = router;
