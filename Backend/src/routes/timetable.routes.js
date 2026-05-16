const { Router } = require('express');
const timetableController = require('../controllers/timetable.controller');

const router = Router();

// POST /timetable/generate - Generate conflict-free timetable
router.post('/generate', timetableController.generateTimetable);

module.exports = router;
