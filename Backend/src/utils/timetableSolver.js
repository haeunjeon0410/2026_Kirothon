/**
 * Timetable Solver
 *
 * Given a list of courses (each with multiple time-slot sections),
 * select one section per course such that no two selected sections overlap.
 *
 * Modes:
 *   - solve()       : returns the first valid solution (fast)
 *   - solveAll()    : returns up to N valid solutions for preference ranking
 *
 * Algorithm: backtracking with most-constrained-first ordering.
 * Designed for hackathon scale (≤ 20 courses, ≤ 10 sections each).
 */

/**
 * Convert "HH:MM" to minutes since midnight for fast comparison.
 */
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Check if two slot arrays conflict on any day/time overlap.
 */
function slotsConflict(slotsA, slotsB) {
  for (const a of slotsA) {
    for (const b of slotsB) {
      if (a.day !== b.day) continue;
      const aStart = toMinutes(a.startTime);
      const aEnd = toMinutes(a.endTime);
      const bStart = toMinutes(b.startTime);
      const bEnd = toMinutes(b.endTime);
      if (aStart < bEnd && bStart < aEnd) return true;
    }
  }
  return false;
}

/**
 * Prepare courses for solving: separate TBD from schedulable, sort by constraint.
 */
function prepareCourses(courses) {
  const schedulableCourses = [];
  const tbdCourses = [];

  for (const course of (courses || [])) {
    const scheduled = (course.sections || []).filter((s) => s.slots && s.slots.length > 0);
    if (scheduled.length === 0) {
      tbdCourses.push(course);
    } else {
      schedulableCourses.push({ ...course, scheduledSections: scheduled });
    }
  }

  // Most-constrained-first: order by ascending section count
  schedulableCourses.sort((a, b) => a.scheduledSections.length - b.scheduledSections.length);

  return { schedulableCourses, tbdCourses };
}

/**
 * Format a raw assignment into the standard schedule output shape.
 */
function formatAssignment(assignment) {
  return assignment.map(({ course, section }) => ({
    courseCode: course.courseCode,
    courseName: course.name,
    category: course.category,
    credits: course.credits,
    sectionId: section.sectionId,
    professors: section.professors,
    slots: section.slots,
    rawTime: section.rawTime,
  }));
}

/**
 * Format TBD courses.
 */
function formatTbd(tbdCourses) {
  return tbdCourses.map((c) => ({
    courseCode: c.courseCode,
    courseName: c.name,
    category: c.category,
    credits: c.credits,
    reason: 'No scheduled time available',
  }));
}

// ─── Single Solution (original behavior) ─────────────────────────────────────

/**
 * Solve timetable: returns the first valid conflict-free assignment.
 */
function solve(courses) {
  if (!courses || courses.length === 0) {
    return { success: true, schedule: [], tbd: [], unschedulable: [], conflicts: [] };
  }

  const { schedulableCourses, tbdCourses } = prepareCourses(courses);
  const assignment = [];
  const result = backtrackFirst(schedulableCourses, 0, assignment);

  if (result) {
    return {
      success: true,
      schedule: formatAssignment(result),
      tbd: formatTbd(tbdCourses),
      unschedulable: [],
      conflicts: [],
    };
  }

  return greedyFallback(schedulableCourses, tbdCourses);
}

// ─── Multiple Solutions (for preference optimization) ─────────────────────────

/**
 * Generate up to `maxSolutions` valid conflict-free timetable assignments.
 * Used by the preference optimizer to rank and select the best schedule.
 *
 * @param {Array} courses - courses to schedule
 * @param {number} maxSolutions - cap on solutions to generate (default 20)
 * @returns {Array} array of solution objects, each with { schedule, tbd }
 */
function solveAll(courses, maxSolutions = 20) {
  if (!courses || courses.length === 0) {
    return [{ schedule: [], tbd: [], success: true }];
  }

  const { schedulableCourses, tbdCourses } = prepareCourses(courses);
  const solutions = [];
  const tbd = formatTbd(tbdCourses);

  backtrackAll(schedulableCourses, 0, [], solutions, maxSolutions);

  if (solutions.length === 0) {
    // No perfect solution — return greedy fallback as single option
    const fallback = greedyFallback(schedulableCourses, tbdCourses);
    return [fallback];
  }

  return solutions.map((assignment) => ({
    success: true,
    schedule: formatAssignment(assignment),
    tbd,
    unschedulable: [],
    conflicts: [],
  }));
}

// ─── Backtracking ────────────────────────────────────────────────────────────

function backtrackFirst(courses, index, assignment) {
  if (index >= courses.length) return [...assignment];

  const course = courses[index];
  for (const section of course.scheduledSections) {
    const conflictsWithExisting = assignment.some((a) =>
      slotsConflict(a.section.slots, section.slots)
    );
    if (conflictsWithExisting) continue;
    assignment.push({ course, section });
    const result = backtrackFirst(courses, index + 1, assignment);
    if (result) return result;
    assignment.pop();
  }
  return null;
}

function backtrackAll(courses, index, assignment, solutions, maxSolutions) {
  if (solutions.length >= maxSolutions) return;
  if (index >= courses.length) {
    solutions.push([...assignment]);
    return;
  }

  const course = courses[index];
  for (const section of course.scheduledSections) {
    if (solutions.length >= maxSolutions) return;
    const conflictsWithExisting = assignment.some((a) =>
      slotsConflict(a.section.slots, section.slots)
    );
    if (conflictsWithExisting) continue;
    assignment.push({ course, section });
    backtrackAll(courses, index + 1, assignment, solutions, maxSolutions);
    assignment.pop();
  }
}

// ─── Greedy Fallback ─────────────────────────────────────────────────────────

function greedyFallback(schedulableCourses, tbdCourses) {
  const schedule = [];
  const unschedulable = [];
  const conflicts = [];

  for (const course of schedulableCourses) {
    let placed = false;
    for (const section of course.scheduledSections) {
      const hasConflict = schedule.some((s) => slotsConflict(s.slots, section.slots));
      if (!hasConflict) {
        schedule.push({
          courseCode: course.courseCode,
          courseName: course.name,
          category: course.category,
          credits: course.credits,
          sectionId: section.sectionId,
          professors: section.professors,
          slots: section.slots,
          rawTime: section.rawTime,
        });
        placed = true;
        break;
      }
    }
    if (!placed) {
      unschedulable.push({
        courseCode: course.courseCode,
        courseName: course.name,
        category: course.category,
        reason: 'All sections conflict with already-placed courses',
      });
      conflicts.push({ courseCode: course.courseCode });
    }
  }

  return {
    success: false,
    schedule,
    tbd: formatTbd(tbdCourses),
    unschedulable,
    conflicts,
  };
}

module.exports = { solve, solveAll, slotsConflict, toMinutes };
