/**
 * Course parser utility
 * Normalizes raw course records from department JSON files into a consistent shape.
 *
 * Raw input fields:
 *   name      - "경영과학1"
 *   category  - "전공필수" | "전공선택"
 *   time      - "화목13:30-14:45(명신관104)" or "" (TBD)
 *   professor - "박철순" or multiline
 *   year      - "2학년" | "전공기초" | "3-4학년" | "전학년" | "교직"
 *   credit    - "3/2.0/1.0"  (total / lecture / lab)
 *   note      - ""
 */

const KOREAN_DAY_MAP = { '월': 'MON', '화': 'TUE', '수': 'WED', '목': 'THU', '금': 'FRI', '토': 'SAT', '일': 'SUN' };

/**
 * Parse the time string into structured slots.
 * Examples:
 *   "화목13:30-14:45(명신관104)" -> [{day:'TUE',start:'13:30',end:'14:45',location:'명신관104'},
 *                                    {day:'THU',start:'13:30',end:'14:45',location:'명신관104'}]
 *   "" -> []
 */
function parseTimeString(raw) {
  if (!raw || typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  // Match: leading Korean day chars, then HH:MM-HH:MM, then optional (location)
  const match = trimmed.match(/^([월화수목금토일]+)(\d{1,2}:\d{2})-(\d{1,2}:\d{2})(?:\(([^)]+)\))?$/);
  if (!match) return [];

  const [, dayChars, start, end, location] = match;
  return [...dayChars].map((ch) => ({
    day: KOREAN_DAY_MAP[ch] || ch,
    startTime: normalizeTime(start),
    endTime: normalizeTime(end),
    location: location || null,
  }));
}

function normalizeTime(t) {
  const [h, m] = t.split(':');
  return `${String(h).padStart(2, '0')}:${m}`;
}

/**
 * Parse credit string "3/2.0/1.0" -> {total:3, lecture:2.0, lab:1.0}
 */
function parseCredit(raw) {
  if (!raw || typeof raw !== 'string') return { total: 0, lecture: 0, lab: 0 };
  const parts = raw.split('/').map((p) => parseFloat(p.trim()));
  return {
    total: Number.isFinite(parts[0]) ? parts[0] : 0,
    lecture: Number.isFinite(parts[1]) ? parts[1] : 0,
    lab: Number.isFinite(parts[2]) ? parts[2] : 0,
  };
}

/**
 * Parse year field into a numeric recommended year (1-4) and flags.
 *   "1학년" -> 1, "전공기초" -> 1, "3-4학년" -> 3, "전학년" -> 1, "교직" -> 0
 */
function parseYear(raw) {
  if (!raw) return { recommendedYear: 0, flexible: true };
  const r = raw.trim();
  if (r === '전공기초') return { recommendedYear: 1, flexible: false };
  if (r === '전학년') return { recommendedYear: 1, flexible: true };
  if (r === '교직') return { recommendedYear: 0, flexible: true };
  const range = r.match(/^(\d)-(\d)학년$/);
  if (range) return { recommendedYear: parseInt(range[1], 10), flexible: true };
  const single = r.match(/^(\d)학년$/);
  if (single) return { recommendedYear: parseInt(single[1], 10), flexible: false };
  return { recommendedYear: 0, flexible: true };
}

/**
 * Parse multiline professor field into an array of names.
 */
function parseProfessor(raw) {
  if (!raw) return [];
  return raw.split(/\n+/).map((s) => s.trim()).filter(Boolean);
}

/**
 * Generate a stable course code from a course name.
 * Since the dataset has no official codes, we derive one for internal use.
 */
function deriveCourseCode(name) {
  const slug = name.replace(/[^\w가-힣]/g, '');
  return slug;
}

/**
 * Normalize a single raw course section.
 * Each row in the JSON is a SECTION (a specific time/professor offering).
 */
function normalizeSection(raw, department, index) {
  const slots = parseTimeString(raw.time);
  const credit = parseCredit(raw.credit);
  const yearInfo = parseYear(raw.year);

  return {
    sectionId: `${department}-${deriveCourseCode(raw.name)}-${index}`,
    courseCode: deriveCourseCode(raw.name),
    name: raw.name,
    department,
    category: raw.category || '미분류',
    credits: credit.total,
    creditDetail: credit,
    professors: parseProfessor(raw.professor),
    rawTime: raw.time || '',
    slots,
    recommendedYear: yearInfo.recommendedYear,
    yearFlexible: yearInfo.flexible,
    rawYear: raw.year || '',
    note: raw.note || '',
    hasSchedule: slots.length > 0,
  };
}

/**
 * Group sections by courseCode into a Course with multiple sections.
 */
function groupSectionsByCourse(sections) {
  const map = new Map();
  for (const sec of sections) {
    if (!map.has(sec.courseCode)) {
      map.set(sec.courseCode, {
        courseCode: sec.courseCode,
        name: sec.name,
        department: sec.department,
        category: sec.category,
        credits: sec.credits,
        recommendedYear: sec.recommendedYear,
        yearFlexible: sec.yearFlexible,
        sections: [],
      });
    }
    map.get(sec.courseCode).sections.push(sec);
  }
  return Array.from(map.values());
}

/**
 * Parse an entire department JSON file structure.
 *   { "경영학부": { updated_at, courses: [...] } }
 */
function parseDepartmentJson(json) {
  const departments = [];
  for (const [deptName, deptData] of Object.entries(json)) {
    if (!deptData || !Array.isArray(deptData.courses)) continue;

    const sections = deptData.courses.map((raw, idx) => normalizeSection(raw, deptName, idx));
    const courses = groupSectionsByCourse(sections);

    departments.push({
      department: deptName,
      updatedAt: deptData.updated_at || null,
      sections,
      courses,
    });
  }
  return departments;
}

module.exports = {
  parseTimeString,
  parseCredit,
  parseYear,
  parseProfessor,
  deriveCourseCode,
  normalizeSection,
  groupSectionsByCourse,
  parseDepartmentJson,
};
