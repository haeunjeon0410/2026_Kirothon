const fs = require('fs');
const path = require('path');
const { parseDepartmentJson } = require('../utils/courseParser');

/**
 * Dataset Service
 *
 * Loads all department course JSON files from src/data/ at startup and
 * exposes a queryable in-memory dataset. Designed for hackathon-scale data
 * (hundreds of courses) - no DB round trips needed for course lookups.
 */

const DATA_DIR = path.resolve(__dirname, '../data');

let _cache = null;

/**
 * Load and parse all department JSON files. Cached after first call.
 */
function loadDataset() {
  if (_cache) return _cache;

  const departments = [];
  const allSections = [];
  const allCourses = [];

  if (!fs.existsSync(DATA_DIR)) {
    _cache = { departments: [], sections: [], courses: [], byCode: new Map(), byDepartment: new Map() };
    return _cache;
  }

  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    const fullPath = path.join(DATA_DIR, file);
    try {
      let content = fs.readFileSync(fullPath, 'utf-8');
      // Strip BOM (Windows editors may prepend \uFEFF)
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      const raw = JSON.parse(content);
      const parsed = parseDepartmentJson(raw);
      for (const dept of parsed) {
        departments.push(dept);
        allSections.push(...dept.sections);
        allCourses.push(...dept.courses);
      }
    } catch (err) {
      console.error(`[dataset] Failed to load ${file}:`, err.message);
    }
  }

  // Indexes - normalize Unicode (NFC) for consistent Korean string matching
  const byCode = new Map();
  for (const c of allCourses) byCode.set(c.courseCode, c);

  const byDepartment = new Map();
  for (const dept of departments) {
    byDepartment.set(dept.department, dept);
    // Also index the NFC-normalized form in case input uses different normalization
    byDepartment.set(dept.department.normalize('NFC'), dept);
  }

  _cache = {
    departments,
    sections: allSections,
    courses: allCourses,
    byCode,
    byDepartment,
  };

  console.log(`[dataset] Loaded ${departments.length} departments, ${allCourses.length} courses, ${allSections.length} sections`);
  return _cache;
}

/**
 * Force reload (for tests or hot-reload).
 */
function reload() {
  _cache = null;
  return loadDataset();
}

/**
 * Get all courses for a given department / major.
 * Normalizes the department name (NFC) for consistent Korean matching.
 */
function getCoursesByDepartment(department) {
  const ds = loadDataset();
  const normalized = department ? department.normalize('NFC') : department;
  const dept = ds.byDepartment.get(normalized) || ds.byDepartment.get(department);
  return dept ? dept.courses : [];
}

/**
 * Get all sections for a given department.
 */
function getSectionsByDepartment(department) {
  const ds = loadDataset();
  const normalized = department ? department.normalize('NFC') : department;
  const dept = ds.byDepartment.get(normalized) || ds.byDepartment.get(department);
  return dept ? dept.sections : [];
}

/**
 * Look up a single course by its derived courseCode.
 */
function getCourseByCode(courseCode) {
  const ds = loadDataset();
  return ds.byCode.get(courseCode) || null;
}

/**
 * List all known departments.
 */
function listDepartments() {
  const ds = loadDataset();
  return ds.departments.map((d) => ({
    department: d.department,
    updatedAt: d.updatedAt,
    courseCount: d.courses.length,
    sectionCount: d.sections.length,
  }));
}

module.exports = {
  loadDataset,
  reload,
  getCoursesByDepartment,
  getSectionsByDepartment,
  getCourseByCode,
  listDepartments,
};
