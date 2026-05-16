const asyncHandler = require('../middleware/asyncHandler');
const advisorService = require('../services/advisor.service');
const agentOrchestrator = require('../agent/orchestrator');

/**
 * POST /advisor/explain
 * Run the pipeline and generate AI explanations for all sections.
 * Body: same as /agent/plan
 */
exports.explain = asyncHandler(async (req, res) => {
  const pipelineResult = await agentOrchestrator.runPipeline(req.body || {});

  // Generate AI explanations in parallel (fallback-safe)
  const [roadmapExplanation, graduationExplanation, strategyAdvice, timetableExplanation] =
    await Promise.all([
      advisorService.explainRoadmap(pipelineResult),
      advisorService.explainGraduationRisks(pipelineResult),
      advisorService.provideStrategyAdvice(pipelineResult),
      advisorService.summarizeTimetableTradeoffs(pipelineResult),
    ]);

  res.json({
    success: true,
    data: {
      ...pipelineResult,
      advisor: {
        aiAvailable: advisorService.isAvailable(),
        roadmapExplanation,
        graduationExplanation,
        strategyAdvice,
        timetableExplanation,
      },
    },
  });
});

/**
 * POST /advisor/chat
 * Generate a full conversational advisor response.
 * Body: same as /agent/plan
 */
exports.chat = asyncHandler(async (req, res) => {
  const pipelineResult = await agentOrchestrator.runPipeline(req.body || {});
  const advisorResponse = await advisorService.generateAdvisorResponse(pipelineResult);

  res.json({
    success: true,
    data: {
      ...pipelineResult,
      advisor: {
        ...advisorResponse,
        aiAvailable: advisorService.isAvailable(),
      },
    },
  });
});

/**
 * POST /advisor/roadmap
 * Explain an existing pipeline result's roadmap.
 * Body: { pipelineResult } (pass the full result from /agent/plan)
 */
exports.explainRoadmap = asyncHandler(async (req, res) => {
  const { pipelineResult } = req.body;
  if (!pipelineResult) {
    return res.status(400).json({ success: false, error: { message: 'pipelineResult is required in body' } });
  }
  const explanation = await advisorService.explainRoadmap(pipelineResult);
  res.json({ success: true, data: { explanation, aiAvailable: advisorService.isAvailable() } });
});

/**
 * POST /advisor/graduation
 * Explain graduation risks from an existing pipeline result.
 * Body: { pipelineResult }
 */
exports.explainGraduation = asyncHandler(async (req, res) => {
  const { pipelineResult } = req.body;
  if (!pipelineResult) {
    return res.status(400).json({ success: false, error: { message: 'pipelineResult is required in body' } });
  }
  const explanation = await advisorService.explainGraduationRisks(pipelineResult);
  res.json({ success: true, data: { explanation, aiAvailable: advisorService.isAvailable() } });
});

/**
 * POST /advisor/strategy
 * Get strategic academic advice from an existing pipeline result.
 * Body: { pipelineResult }
 */
exports.explainStrategy = asyncHandler(async (req, res) => {
  const { pipelineResult } = req.body;
  if (!pipelineResult) {
    return res.status(400).json({ success: false, error: { message: 'pipelineResult is required in body' } });
  }
  const advice = await advisorService.provideStrategyAdvice(pipelineResult);
  res.json({ success: true, data: { advice, aiAvailable: advisorService.isAvailable() } });
});

/**
 * POST /advisor/timetable
 * Summarize timetable tradeoffs from an existing pipeline result.
 * Body: { pipelineResult }
 */
exports.explainTimetable = asyncHandler(async (req, res) => {
  const { pipelineResult } = req.body;
  if (!pipelineResult) {
    return res.status(400).json({ success: false, error: { message: 'pipelineResult is required in body' } });
  }
  const explanation = await advisorService.summarizeTimetableTradeoffs(pipelineResult);
  res.json({ success: true, data: { explanation, aiAvailable: advisorService.isAvailable() } });
});

/**
 * GET /advisor/status
 * Check if the AI advisor is available (OpenAI configured).
 */
exports.status = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      aiAvailable: advisorService.isAvailable(),
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      note: advisorService.isAvailable()
        ? 'AI advisor is active. Responses will include GPT-generated explanations.'
        : 'AI advisor is in fallback mode. Responses use rule-based explanations. Set OPENAI_API_KEY to enable.',
    },
  });
});
