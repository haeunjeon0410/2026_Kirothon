const asyncHandler = require('../middleware/asyncHandler');
const transcriptParser = require('../services/transcriptParser.service');
const agentOrchestrator = require('../agent/orchestrator');
const AppError = require('../utils/AppError');

/**
 * POST /upload/transcript
 *
 * Upload an academic transcript PDF and automatically:
 *   1. Extract text from PDF
 *   2. Detect completed course names
 *   3. Match against dataset
 *   4. Run the agent pipeline with matched courses
 *
 * Body (multipart/form-data):
 *   - file: PDF file
 *   - department: string (required)
 *   - year: number (optional, default 1)
 *   - careerGoals: JSON string array (optional)
 *   - track: string (optional, default 'singleMajor')
 *   - preferences: JSON string (optional, timetable preferences)
 *   - runPipeline: "true" | "false" (optional, default "true")
 */
exports.uploadTranscript = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file uploaded. Please upload a PDF file.', 400);
  }

  if (req.file.mimetype !== 'application/pdf') {
    throw new AppError('Only PDF files are supported.', 400);
  }

  const department = req.body.department;
  if (!department) {
    throw new AppError('department is required in the request body.', 400);
  }

  const year = parseInt(req.body.year, 10) || 1;
  const track = req.body.track || 'singleMajor';
  const runPipeline = req.body.runPipeline !== 'false';

  let careerGoals = [];
  if (req.body.careerGoals) {
    try {
      careerGoals = JSON.parse(req.body.careerGoals);
    } catch (e) {
      careerGoals = req.body.careerGoals.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }

  let preferences = {};
  if (req.body.preferences) {
    try {
      preferences = JSON.parse(req.body.preferences);
    } catch (e) {
      // ignore invalid preferences JSON
    }
  }

  // Parse the transcript
  const parseResult = await transcriptParser.parseTranscript(req.file.buffer, department);

  // Build the completed course names from matched results
  const completedCourseNames = transcriptParser.buildCompletedCourseNames(parseResult.matchedCourses);

  // Optionally run the full agent pipeline
  let pipelineResult = null;
  if (runPipeline && completedCourseNames.length > 0) {
    pipelineResult = await agentOrchestrator.runPipeline({
      department,
      completedCourseNames,
      careerGoals,
      year,
      track,
      preferences,
    });
  }

  res.json({
    success: true,
    data: {
      parsing: {
        rawTextLength: parseResult.rawTextLength,
        totalLines: parseResult.totalLines,
        totalExtracted: parseResult.totalExtracted,
        totalMatched: parseResult.totalMatched,
        totalUnmatched: parseResult.unmatchedLines.length,
      },
      extractedCourses: parseResult.extractedCourses,
      matchedCourses: parseResult.matchedCourses,
      unmatchedLines: parseResult.unmatchedLines,
      completedCourseNames,
      generatedProfile: {
        department,
        year,
        track,
        careerGoals,
        completedCourseNames,
        preferences,
      },
      pipeline: pipelineResult,
    },
  });
});

/**
 * POST /upload/transcript/parse-only
 *
 * Parse a transcript PDF without running the agent pipeline.
 * Useful for previewing extraction results before committing.
 */
exports.parseOnly = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file uploaded. Please upload a PDF file.', 400);
  }

  if (req.file.mimetype !== 'application/pdf') {
    throw new AppError('Only PDF files are supported.', 400);
  }

  const department = req.body.department;
  if (!department) {
    throw new AppError('department is required in the request body.', 400);
  }

  const parseResult = await transcriptParser.parseTranscript(req.file.buffer, department);
  const completedCourseNames = transcriptParser.buildCompletedCourseNames(parseResult.matchedCourses);

  res.json({
    success: true,
    data: {
      parsing: {
        rawTextLength: parseResult.rawTextLength,
        totalLines: parseResult.totalLines,
        totalExtracted: parseResult.totalExtracted,
        totalMatched: parseResult.totalMatched,
        totalUnmatched: parseResult.unmatchedLines.length,
      },
      extractedCourses: parseResult.extractedCourses,
      matchedCourses: parseResult.matchedCourses,
      unmatchedLines: parseResult.unmatchedLines,
      completedCourseNames,
    },
  });
});
