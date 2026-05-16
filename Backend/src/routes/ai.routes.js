const { Router } = require('express');
const aiController = require('../controllers/ai.controller');

const router = Router();

// POST /ai/roadmap - Generate AI-powered academic roadmap
router.post('/roadmap', aiController.generateRoadmap);

module.exports = router;
