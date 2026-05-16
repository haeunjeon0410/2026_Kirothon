const { PDFParse } = require('pdf-parse');
const datasetService = require('./dataset.service');

/**
 * Transcript Parser Service v2
 *
 * High-accuracy extraction of completed courses from Korean university transcript PDFs.
 *
 * Strategy: Score-based filtering with positive signal detection.
 * Instead of trying to filter OUT bad lines, we score lines for positive signals
 * that indicate they ARE course rows, then apply a confidence threshold.
 *
 * Positive signals (a real course row typically has):
 *   - A grade (A+, B0, C+, P, S, etc.)
 *   - A credit number (1-4, often as "3" or "3.0")
 *   - A category prefix (전공필수, 전공선택, 교양필수, etc.)
 *   - Korean text of appropriate length (2-40 chars for course name)
 *   - Appears in a semester block context
 *
 * Negative signals (NOT a course row):
 *   - Very long lines (>80 chars without structural markers)
 *   - Contains sentence-ending particles (입니다, 합니다, 됩니다, etc.)
 *   - Contains explanatory keywords (안내, 유의, 참고, 문의, 확인, etc.)
 *   - Pure header/footer patterns
 *   - Contains URLs, phone numbers, addresses
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const GRADE_PATTERN = /\b([ABCDF][+0-]?|P|NP|S|U|W|I)\b/;
const CREDIT_PATTERN = /\b([1-4])(\.\d)?\b/;
const CATEGORY_PREFIXES = ['전공필수', '전공선택', '교양필수', '교양선택', '자유선택', '일반선택', '교직', '기초교양', '핵심교양', '소양교양', '전공기초'];
const CATEGORY_PATTERN = new RegExp(`(${CATEGORY_PREFIXES.join('|')})`);
const SEMESTER_PATTERN = /\d{4}[-년\s]*[12]학기|\d{4}[-/][12]|[12]학기/;
const COURSE_CODE_PATTERN = /[A-Z]{2,4}\d{3,4}/;

// Negative signals - lines that are definitely NOT courses
const SENTENCE_ENDINGS = /(입니다|합니다|됩니다|습니다|하세요|하시오|바랍니다|드립니다|겠습니다|있습니다|없습니다)\s*[.。]?\s*$/;
const EXPLANATORY_KEYWORDS = /안내|유의|참고|문의|확인|발급|신청|제출|기간|방법|절차|규정|학칙|조건|자격|대상|비고|특이사항|※|☎|TEL|FAX|http|www\.|@/i;
const HEADER_PATTERNS = [
  /^(학번|성명|학과|대학|학부|소속|생년월일|주민등록|입학|졸업|수료|재학|휴학|제적)/,
  /^(성적증명서|성적표|학업성적|Academic|Transcript|Grade|Report)/i,
  /^(합계|소계|총계|평균|평점|GPA|CGPA|총\s*학점|누적|취득학점)/i,
  /^(학기|학년도|년도|semester|year)/i,
  /^(page|페이지|\d+\s*\/\s*\d+)/i,
  /^(발급일|발급기관|증명|직인|인|seal)/i,
  /^[-=_─━┃│┌┐└┘├┤┬┴┼]+$/, // table borders
  /^\d{4}학년도/, // year headers
  /^(이\s*수\s*구\s*분|과\s*목\s*명|학\s*점|성\s*적|등\s*급)/, // column headers
];

const MINIMUM_CONFIDENCE = 0.4;

// ─── Main Parser ─────────────────────────────────────────────────────────────

/**
 * Parse a PDF buffer and extract course information with confidence scoring.
 */
async function parseTranscript(pdfBuffer, department) {
  // Step 1: Extract raw text
  const parser = new PDFParse({ data: pdfBuffer });
  const pdfData = await parser.getText();
  const rawText = pdfData.text || '';
  await parser.destroy();

  // Step 2: Split and clean lines
  const allLines = rawText
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // Step 3: Score each line for course-likelihood
  const scoredLines = allLines.map((line, idx) => scoreLine(line, idx, allLines));

  // Step 4: Filter by confidence threshold
  const candidateLines = scoredLines.filter((s) => s.confidence >= MINIMUM_CONFIDENCE);

  // Step 5: Extract course names from candidates
  const extractedCourses = candidateLines
    .map((s) => s.extractedName)
    .filter(Boolean);

  // Deduplicate
  const uniqueCourses = [...new Set(extractedCourses)];

  // Step 6: Match against dataset
  const allCourses = datasetService.getCoursesByDepartment(department);
  const { matched, unmatched } = matchCoursesAgainstDataset(uniqueCourses, allCourses);

  // Step 7: Build debugging metadata
  const rejectedLines = scoredLines
    .filter((s) => s.confidence < MINIMUM_CONFIDENCE && s.line.length > 3)
    .slice(0, 30) // cap for response size
    .map((s) => ({ line: s.line.slice(0, 60), confidence: s.confidence, reason: s.rejectReason }));

  return {
    rawTextLength: rawText.length,
    totalLines: allLines.length,
    filteredLines: allLines.length - candidateLines.length,
    candidateCourseLines: candidateLines.length,
    extractedCourses: uniqueCourses,
    matchedCourses: matched,
    unmatchedLines: unmatched,
    totalExtracted: uniqueCourses.length,
    totalMatched: matched.length,
    rejectedLines,
    debug: {
      confidenceThreshold: MINIMUM_CONFIDENCE,
      scoringSignals: ['grade', 'credit', 'category', 'courseCode', 'nameLength', 'context'],
    },
  };
}

// ─── Line Scoring Engine ─────────────────────────────────────────────────────

/**
 * Score a single line for course-row likelihood.
 * Returns { line, confidence (0-1), extractedName, signals, rejectReason }
 */
function scoreLine(line, index, allLines) {
  const result = { line, confidence: 0, extractedName: null, signals: [], rejectReason: '' };

  // Quick reject: too short or too long
  if (line.length < 3) {
    result.rejectReason = 'too_short';
    return result;
  }
  if (line.length > 120) {
    result.rejectReason = 'too_long';
    return result;
  }

  // Quick reject: header/footer patterns
  if (HEADER_PATTERNS.some((p) => p.test(line))) {
    result.rejectReason = 'header_pattern';
    return result;
  }

  // Quick reject: explanatory text
  if (EXPLANATORY_KEYWORDS.test(line)) {
    result.rejectReason = 'explanatory_text';
    return result;
  }

  // Quick reject: sentence-like text (ends with Korean sentence particles)
  if (SENTENCE_ENDINGS.test(line)) {
    result.rejectReason = 'sentence_text';
    return result;
  }

  // Quick reject: pure numbers or dates
  if (/^\d[\d\s./-]*$/.test(line)) {
    result.rejectReason = 'pure_numbers';
    return result;
  }

  // Quick reject: no Korean characters at all
  if (!/[가-힣]/.test(line)) {
    result.rejectReason = 'no_korean';
    return result;
  }

  // ─── Positive signal scoring ───────────────────────────────────────────

  let score = 0;

  // Signal 1: Contains a grade pattern (+0.3)
  if (GRADE_PATTERN.test(line)) {
    score += 0.3;
    result.signals.push('grade');
  }

  // Signal 2: Contains a credit number (+0.2)
  if (CREDIT_PATTERN.test(line)) {
    score += 0.2;
    result.signals.push('credit');
  }

  // Signal 3: Contains a category prefix (+0.25)
  if (CATEGORY_PATTERN.test(line)) {
    score += 0.25;
    result.signals.push('category');
  }

  // Signal 4: Contains a course code like "BUS301" (+0.2)
  if (COURSE_CODE_PATTERN.test(line)) {
    score += 0.2;
    result.signals.push('courseCode');
  }

  // Signal 5: Korean text of appropriate course-name length (+0.15)
  const koreanText = extractKoreanSegment(line);
  if (koreanText && koreanText.length >= 2 && koreanText.length <= 40) {
    score += 0.15;
    result.signals.push('nameLength');
  }

  // Signal 6: Context - near a semester header (+0.1)
  if (isNearSemesterHeader(index, allLines)) {
    score += 0.1;
    result.signals.push('context');
  }

  // Signal 7: Line structure looks tabular (multiple whitespace-separated fields) (+0.1)
  const fields = line.split(/\s{2,}/).filter(Boolean);
  if (fields.length >= 3 && fields.length <= 8) {
    score += 0.1;
    result.signals.push('tabular');
  }

  // ─── Negative signal penalties ─────────────────────────────────────────

  // Penalty: Very long continuous Korean text without breaks (likely a paragraph)
  const longestKoreanRun = getLongestKoreanRun(line);
  if (longestKoreanRun > 30 && !GRADE_PATTERN.test(line)) {
    score -= 0.3;
    result.signals.push('long_paragraph');
  }

  // Penalty: Contains multiple sentences (periods followed by Korean)
  if (/\.\s*[가-힣]/.test(line) && line.split(/\.\s*[가-힣]/).length > 2) {
    score -= 0.2;
    result.signals.push('multi_sentence');
  }

  // Penalty: Looks like a requirement description
  if (/이상|이하|미만|초과|필요|충족|요건|조건/.test(line) && !GRADE_PATTERN.test(line)) {
    score -= 0.15;
    result.signals.push('requirement_desc');
  }

  // Clamp
  result.confidence = Math.max(0, Math.min(1, score));

  // Extract course name if confidence is sufficient
  if (result.confidence >= MINIMUM_CONFIDENCE) {
    result.extractedName = extractCourseNameFromScoredLine(line);
  }

  if (result.confidence < MINIMUM_CONFIDENCE && !result.rejectReason) {
    result.rejectReason = `low_score_${result.confidence.toFixed(2)}`;
  }

  return result;
}

// ─── Course Name Extraction ──────────────────────────────────────────────────

/**
 * Extract the course name from a line that has been scored as a likely course row.
 * More aggressive extraction than before — uses structural patterns.
 */
function extractCourseNameFromScoredLine(line) {
  // Strategy: Try multiple extraction patterns in order of specificity

  // Pattern 1: Category + CourseName + Credit + Grade
  // "전공선택  경영과학1  3  A+"
  // Use greedy match up to the LAST standalone number before grade
  const catMatch = line.match(new RegExp(`(?:${CATEGORY_PREFIXES.join('|')})\\s+(.+?)\\s{2,}\\d`));
  if (catMatch) {
    const name = cleanCourseName(catMatch[1]);
    if (name) return name;
  }

  // Pattern 1b: Category + CourseName + single-space + Credit + Grade (tighter format)
  const catMatch2 = line.match(new RegExp(`(?:${CATEGORY_PREFIXES.join('|')})\\s+(.+?)\\s+(\\d\\.?\\d?)\\s+[ABCDF][+0-]?`, 'i'));
  if (catMatch2) {
    const name = cleanCourseName(catMatch2[1]);
    if (name) return name;
  }

  // Pattern 2: CourseCode + CourseName + Credit + Grade
  // "BUS301  경영전략론  3  A+"
  const codeMatch = line.match(/[A-Z]{2,4}\d{3,4}\s+(.+?)\s+\d/);
  if (codeMatch) {
    const name = cleanCourseName(codeMatch[1]);
    if (name) return name;
  }

  // Pattern 3: Line with grade at end — everything before the last number/grade cluster is the name
  // "경영과학1  3  A+"
  const gradeEndMatch = line.match(/^(.+?)\s+\d[\d./]*\s+[ABCDF][+0-]?\s*$/i);
  if (gradeEndMatch) {
    const name = cleanCourseName(gradeEndMatch[1]);
    if (name) return name;
  }

  // Pattern 4: Line with just credit and grade
  // "경영전략론  3.0  B+"
  const creditGradeMatch = line.match(/^(.+?)\s+\d\.\d\s+[ABCDF][+0-]?\s*$/i);
  if (creditGradeMatch) {
    const name = cleanCourseName(creditGradeMatch[1]);
    if (name) return name;
  }

  // Pattern 5: Tabular — take the longest Korean segment
  const fields = line.split(/\s{2,}/).filter(Boolean);
  if (fields.length >= 3) {
    const koreanFields = fields.filter((f) => /[가-힣]/.test(f) && f.length >= 2);
    // Pick the longest Korean field that isn't a category label
    const sorted = koreanFields
      .filter((f) => !CATEGORY_PREFIXES.includes(f))
      .sort((a, b) => b.length - a.length);
    if (sorted.length > 0) {
      const name = cleanCourseName(sorted[0]);
      if (name) return name;
    }
  }

  // Pattern 6: Fallback — extract the main Korean segment
  const koreanSeg = extractKoreanSegment(line);
  if (koreanSeg && koreanSeg.length >= 2 && koreanSeg.length <= 40) {
    const name = cleanCourseName(koreanSeg);
    if (name) return name;
  }

  return null;
}

/**
 * Clean a raw course name candidate.
 */
function cleanCourseName(raw) {
  if (!raw) return null;
  let name = raw.trim();

  // Remove leading numbers (but NOT trailing — they're often part of course names like 경영과학1)
  name = name.replace(/^\d+\s*/, '');

  // Remove category prefixes that might still be attached
  for (const prefix of CATEGORY_PREFIXES) {
    if (name.startsWith(prefix)) {
      name = name.slice(prefix.length).trim();
    }
  }

  // Remove trailing grade/credit artifacts
  name = name.replace(/\s+[ABCDF][+0-]?\s*$/i, '').trim();
  name = name.replace(/\s+\d+([/.]\d+)*\s*$/, '').trim();
  name = name.replace(/\s+(P|NP|S|U|W)\s*$/i, '').trim();

  // Must have Korean and be reasonable length
  if (!/[가-힣]/.test(name)) return null;
  if (name.length < 2 || name.length > 50) return null;

  // Must not be just a category label
  if (CATEGORY_PREFIXES.includes(name)) return null;

  return name;
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Extract the primary Korean text segment from a line.
 */
function extractKoreanSegment(line) {
  // Find the longest continuous Korean+allowed-chars segment
  const matches = line.match(/[가-힣][가-힣0-9A-Za-zⅠⅡⅢⅣ:()（）\s]*/g);
  if (!matches) return null;
  return matches.sort((a, b) => b.length - a.length)[0]?.trim() || null;
}

/**
 * Get the length of the longest continuous Korean character run.
 */
function getLongestKoreanRun(line) {
  const matches = line.match(/[가-힣]+/g);
  if (!matches) return 0;
  return Math.max(...matches.map((m) => m.length));
}

/**
 * Check if a line is near (within 5 lines of) a semester header.
 */
function isNearSemesterHeader(index, allLines) {
  const lookback = Math.max(0, index - 5);
  for (let i = lookback; i < index; i++) {
    if (SEMESTER_PATTERN.test(allLines[i])) return true;
  }
  return false;
}

// ─── Dataset Matching ────────────────────────────────────────────────────────

/**
 * Match extracted course names against the dataset.
 * Uses exact match first, then normalized, substring, and head matching.
 */
function matchCoursesAgainstDataset(extractedNames, datasetCourses) {
  const matched = [];
  const unmatched = [];

  if (!datasetCourses || datasetCourses.length === 0) {
    return { matched: [], unmatched: extractedNames };
  }

  const byExactName = new Map(datasetCourses.map((c) => [c.name, c]));
  const byNormalizedName = new Map(
    datasetCourses.map((c) => [normalizeName(c.name), c])
  );

  for (const name of extractedNames) {
    // Exact match
    if (byExactName.has(name)) {
      matched.push({ extractedName: name, matchedCourse: byExactName.get(name).name, matchType: 'exact', confidence: 1.0 });
      continue;
    }

    // Normalized match
    const normalized = normalizeName(name);
    if (byNormalizedName.has(normalized)) {
      matched.push({ extractedName: name, matchedCourse: byNormalizedName.get(normalized).name, matchType: 'normalized', confidence: 0.95 });
      continue;
    }

    // Substring match (bidirectional)
    const substringMatch = datasetCourses.find(
      (c) => c.name.includes(name) || name.includes(c.name)
    );
    if (substringMatch && Math.min(name.length, substringMatch.name.length) >= 3) {
      matched.push({ extractedName: name, matchedCourse: substringMatch.name, matchType: 'substring', confidence: 0.8 });
      continue;
    }

    // Head match (before colon/parenthesis)
    const head = name.split(/[:(/（]/)[0].trim();
    if (head.length >= 3) {
      const headMatch = datasetCourses.find(
        (c) => c.name.startsWith(head) || c.name.split(/[:(/（]/)[0].trim() === head
      );
      if (headMatch) {
        matched.push({ extractedName: name, matchedCourse: headMatch.name, matchType: 'headMatch', confidence: 0.7 });
        continue;
      }
    }

    // Normalized substring (remove all spaces/punctuation, then check containment)
    const normName = normalizeName(name);
    const normSubMatch = datasetCourses.find((c) => {
      const normC = normalizeName(c.name);
      return normC.includes(normName) || normName.includes(normC);
    });
    if (normSubMatch && normName.length >= 4) {
      matched.push({ extractedName: name, matchedCourse: normSubMatch.name, matchType: 'normalizedSubstring', confidence: 0.65 });
      continue;
    }

    unmatched.push(name);
  }

  return { matched, unmatched };
}

/**
 * Normalize a course name for fuzzy comparison.
 */
function normalizeName(name) {
  return name
    .replace(/\s+/g, '')
    .replace(/[()（）:/\-_]/g, '')
    .toLowerCase()
    .normalize('NFC');
}

/**
 * Build a completedCourseNames array from matched results.
 */
function buildCompletedCourseNames(matchedCourses) {
  return [...new Set(matchedCourses.map((m) => m.matchedCourse))];
}

// ─── Legacy exports for backward compatibility ───────────────────────────────

function extractCourseLines(lines) {
  const scored = lines.map((line, idx) => scoreLine(line, idx, lines));
  return scored
    .filter((s) => s.confidence >= MINIMUM_CONFIDENCE)
    .map((s) => s.extractedName)
    .filter(Boolean);
}

function extractCourseName(line) {
  const scored = scoreLine(line, 0, [line]);
  return scored.confidence >= MINIMUM_CONFIDENCE ? scored.extractedName : null;
}

module.exports = {
  parseTranscript,
  extractCourseLines,
  extractCourseName,
  matchCoursesAgainstDataset,
  buildCompletedCourseNames,
  scoreLine,
  MINIMUM_CONFIDENCE,
};
