const prisma = require('../utils/prisma');
const steps = require('./steps');
const { formatResponse } = require('./responseFormatter');

/**
 * Agent Orchestrator
 *
 * Runs the SookMap academic planning pipeline as ordered reasoning steps.
 * Each step receives the shared context and returns enriched data, which
 * subsequent steps can read via context[stepName].
 *
 * Pipeline (priority order matches recommendation policy):
 *   1. analyzeHistory      - Resolve student record against the dataset
 *   2. checkGraduation     - Detect required-credit gaps (priority #1)
 *   3. detectMissing       - List all missing courses
 *   4. analyzePrereqs      - Build prerequisite chains (priority #2)
 *   5. matchCareerGoals    - Career relevance scoring (priority #3)
 *   6. generateRoadmap     - Build semester plan respecting all priorities
 *   7. generateTimetable   - Solve a conflict-free schedule (priority #4)
 *   8. detectRisks         - Surface remaining issues
 *
 * The pipeline can run without a userId; pass `department`,
 * `completedCourseNames`, `careerGoals`, and `year` directly in input.
 */
async function runPipeline(input = {}) {
  const userId = input.userId || null;
  let session = null;

  // Persist a session record only when we have a userId (DB-backed)
  if (userId) {
    try {
      session = await prisma.agentSession.create({
        data: {
          userId,
          type: 'full_plan',
          status: 'running',
          input,
          steps: [],
        },
      });
    } catch (err) {
      console.warn('[agent] Could not persist session (continuing without):', err.message);
    }
  }

  const context = { input, stepResults: [] };
  const pipelineStart = Date.now();

  const pipeline = [
    { name: 'analyzeHistory', fn: steps.analyzeHistory },
    { name: 'checkGraduation', fn: steps.checkGraduation },
    { name: 'detectMissing', fn: steps.detectMissing },
    { name: 'analyzePrereqs', fn: steps.analyzePrereqs },
    { name: 'matchCareerGoals', fn: steps.matchCareerGoals },
    { name: 'generateRoadmap', fn: steps.generateRoadmap },
    { name: 'generateTimetable', fn: steps.generateTimetable },
    { name: 'detectRisks', fn: steps.detectRisks },
  ];

  try {
    for (const step of pipeline) {
      const t0 = Date.now();
      const result = await step.fn(context);
      const duration = Date.now() - t0;
      context.stepResults.push({ name: step.name, status: 'completed', duration, result });
      context[step.name] = result;
    }

    const pipelineEnd = Date.now();
    const executionTime = pipelineEnd - pipelineStart;

    // Format for frontend consumption with metadata
    const meta = {
      executionTime,
      steps: context.stepResults.map((s) => ({ name: s.name, duration: s.duration })),
    };
    const formatted = formatResponse(context, meta);

    // Raw output for session persistence (full detail)
    const rawOutput = {
      analysis: context.analyzeHistory,
      graduation: context.checkGraduation,
      missing: context.detectMissing,
      prereqs: context.analyzePrereqs,
      careerMatch: context.matchCareerGoals,
      roadmap: context.generateRoadmap,
      timetable: context.generateTimetable,
      risks: context.detectRisks,
    };

    if (session) {
      try {
        await prisma.agentSession.update({
          where: { id: session.id },
          data: { status: 'completed', steps: context.stepResults, output: rawOutput },
        });
      } catch (err) {
        console.warn('[agent] Could not persist session output:', err.message);
      }
    }

    return {
      sessionId: session ? session.id : null,
      status: 'completed',
      ...formatted,
    };
  } catch (error) {
    if (session) {
      try {
        await prisma.agentSession.update({
          where: { id: session.id },
          data: { status: 'failed', steps: context.stepResults, output: { error: error.message } },
        });
      } catch (_) { /* ignore */ }
    }
    throw error;
  }
}

module.exports = { runPipeline };
