const agentOrchestrator = require('../agent/orchestrator');

/**
 * AI service - thin wrapper that runs the agent pipeline.
 * Returns the formatted frontend-ready response.
 */
async function generateRoadmap(input = {}) {
  return agentOrchestrator.runPipeline(input);
}

module.exports = { generateRoadmap };
