const { Router } = require('express');
const agentController = require('../controllers/agent.controller');

const router = Router();

// POST /agent/plan - Run the full AI agent planning pipeline
router.post('/plan', agentController.runFullPlan);

// GET /agent/demo - Run a demo scenario (no body required)
router.get('/demo', agentController.runDemo);

// GET /agent/session/:sessionId - Get agent session status and results
router.get('/session/:sessionId', agentController.getSession);

module.exports = router;
