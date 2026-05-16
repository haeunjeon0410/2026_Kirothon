const asyncHandler = require('../middleware/asyncHandler');
const agentOrchestrator = require('../agent/orchestrator');
const prisma = require('../utils/prisma');

/**
 * POST /agent/plan
 * Body (any one of):
 *   { userId, preferences? }
 *   { department, completedCourseNames, careerGoals, year, maxCreditsPerSemester? }
 */
exports.runFullPlan = asyncHandler(async (req, res) => {
  const result = await agentOrchestrator.runPipeline(req.body || {});
  res.json({ success: true, data: result });
});

/**
 * GET /agent/demo
 * Runs a realistic sample scenario with no request body required.
 * Returns a fully populated demo response suitable for hackathon judging.
 */
exports.runDemo = asyncHandler(async (req, res) => {
  const demoInput = {
    department: '경영학부',
    completedCourseNames: [
      '경영과학1',
      '회계원리',
      '경영데이터분석1:데이터분석을통한비즈니스모델개발',
    ],
    careerGoals: ['data_analytics', 'finance'],
    year: 2,
    maxCreditsPerSemester: 18,
  };

  const result = await agentOrchestrator.runPipeline(demoInput);
  res.json({ success: true, demo: true, data: result });
});

/**
 * GET /agent/session/:sessionId
 */
exports.getSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const session = await prisma.agentSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    return res.status(404).json({ success: false, error: { message: 'Session not found' } });
  }
  res.json({ success: true, data: session });
});
