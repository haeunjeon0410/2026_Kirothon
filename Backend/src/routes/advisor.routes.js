const { Router } = require('express');
const advisorController = require('../controllers/advisor.controller');

const router = Router();

// GET /advisor/status - Check AI advisor availability
router.get('/status', advisorController.status);

// POST /advisor/explain - Run pipeline + generate all AI explanations
router.post('/explain', advisorController.explain);

// POST /advisor/chat - Run pipeline + generate conversational advisor response
router.post('/chat', advisorController.chat);

// POST /advisor/roadmap - Explain roadmap from existing pipeline result
router.post('/roadmap', advisorController.explainRoadmap);

// POST /advisor/graduation - Explain graduation risks from existing pipeline result
router.post('/graduation', advisorController.explainGraduation);

// POST /advisor/strategy - Get strategy advice from existing pipeline result
router.post('/strategy', advisorController.explainStrategy);

// POST /advisor/timetable - Summarize timetable tradeoffs from existing pipeline result
router.post('/timetable', advisorController.explainTimetable);

module.exports = router;
