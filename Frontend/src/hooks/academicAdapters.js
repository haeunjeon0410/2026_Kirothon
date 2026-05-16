/**
 * 백엔드 응답 → 화면용 데이터 어댑터.
 *
 * 페이지 컴포넌트가 백엔드 스키마를 직접 다루지 않게 분리.
 * 모든 함수는 입력이 누락되어도 안전한 기본값을 반환.
 */

const CATEGORY_COLOR = {
  majorRequired: 'blue',
  majorElective: 'green',
  generalRequired: 'yellow',
  generalElective: 'purple',
  freeElective: 'gray',
  secondMajor: 'pink',
  minorCredits: 'cyan',
  linkedCredits: 'indigo',
}

const CATEGORY_LABEL_FALLBACK = {
  majorRequired: '전공필수',
  majorElective: '전공선택',
  generalRequired: '교양필수',
  generalElective: '교양선택',
  freeElective: '자유선택',
  secondMajor: '제2전공',
  minorCredits: '부전공',
  linkedCredits: '연계전공',
}

/** 졸업 카테고리 배열을 화면용 카드 형태로 변환 */
export function toCategoryCards(graduation) {
  const cats = graduation?.categories || []
  return cats.map((c) => ({
    label: c.label || CATEGORY_LABEL_FALLBACK[c.categoryId] || c.categoryId,
    earned: c.earned || 0,
    required: c.required || 0,
    remaining: c.remaining ?? Math.max(0, (c.required || 0) - (c.earned || 0)),
    progress: c.progress || 0,
    fulfilled: !!c.fulfilled,
    color: CATEGORY_COLOR[c.categoryId] || 'gray',
  }))
}

/** 전체 이수율 계산 */
export function toCreditSummary(graduation) {
  const earned = graduation?.totalCreditsEarned || 0
  const required = graduation?.totalCreditsRequired || 0
  const remaining = graduation?.totalCreditsRemaining ?? Math.max(0, required - earned)
  const percent = required > 0 ? Math.round((earned / required) * 100) : 0
  return { earned, required, remaining, percent }
}

/** 추가학기 위험 요약 */
export function toExtraSemesterRisk(graduation) {
  const risk = graduation?.semesterRisk
  if (!risk) return { risky: false, message: '', riskLevel: null }
  const risky = risk.riskLevel === 'high' || (risk.extraSemestersNeeded || 0) > 0
  return {
    risky,
    riskLevel: risk.riskLevel,
    message: risk.message || '',
    extraSemestersNeeded: risk.extraSemestersNeeded || 0,
  }
}

/** 미이수 필수 과목 (mandatoryCoursesStatus + unmetConditions 의 MANDATORY_COURSES) */
export function toMissingMandatory(graduation, pipeline) {
  // 1) graduation 자체에 mandatoryCoursesStatus 가 있으면 우선 사용
  const mandatory = graduation?.mandatoryCoursesStatus || []
  const fromMandatory = mandatory
    .filter((m) => !m.completed)
    .map((m) => ({ name: m.courseName, type: '필수', credit: 3, year: '권장' }))
  if (fromMandatory.length > 0) return fromMandatory

  // 2) pipeline 응답이 있다면 recommendedCourses 의 priority 높은 항목 일부를 보여줌
  const recs = pipeline?.recommendedCourses?.courses || []
  return recs
    .filter((c) => c.category === '전공필수' || c.category === '교양필수')
    .slice(0, 5)
    .map((c) => ({
      name: c.courseName,
      type: c.category,
      credit: c.credits || 3,
      year: '권장',
    }))
}

/**
 * 백엔드 timetable.schedule (요일별 그룹) → 프론트 그리드용 평면 배열.
 *
 * 백엔드 형식:
 *   { MON:[{courseName, startTime:'09:00', endTime:'10:30', location, professor}], TUE:[...] }
 * 프론트 형식 (Home.jsx, Timetable.jsx 가 기대하는 모양):
 *   [{ id, name, room, professor, credit, color, slots:[{day, hour}] }]
 */
const DAY_INDEX = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4, SAT: 5 }
const PALETTE = ['green', 'blue', 'purple', 'orange', 'teal', 'pink', 'indigo', 'rose', 'amber', 'cyan']

export function toFlatSchedule(timetable) {
  const schedule = timetable?.schedule
  if (!schedule || typeof schedule !== 'object') return []

  const buckets = new Map()

  Object.entries(schedule).forEach(([dayKey, slots]) => {
    const dayIdx = DAY_INDEX[dayKey]
    if (dayIdx === undefined || !Array.isArray(slots)) return

    slots.forEach((s) => {
      const name = s.courseName || ''
      if (!name) return
      const startHour = parseStartHour(s.startTime)
      const endHour = parseEndHour(s.endTime, startHour)
      if (startHour === null) return

      if (!buckets.has(name)) {
        buckets.set(name, {
          id: buckets.size + 1,
          name,
          room: s.location || '',
          professor: s.professor || '',
          credit: 3,
          color: PALETTE[buckets.size % PALETTE.length],
          slots: [],
        })
      }
      const entry = buckets.get(name)
      // start 부터 end-1 까지 한 시간 단위로 펼침
      for (let h = startHour; h < endHour; h++) {
        if (!entry.slots.some((sl) => sl.day === dayIdx && sl.hour === h)) {
          entry.slots.push({ day: dayIdx, hour: h })
        }
      }
    })
  })

  return Array.from(buckets.values())
}

function parseStartHour(t) {
  if (!t) return null
  const [h] = String(t).split(':').map((x) => parseInt(x, 10))
  return Number.isFinite(h) ? h : null
}
function parseEndHour(t, fallbackStart) {
  if (!t) return fallbackStart != null ? fallbackStart + 1 : null
  const parts = String(t).split(':').map((x) => parseInt(x, 10))
  const h = parts[0]
  const m = parts[1] || 0
  if (!Number.isFinite(h)) return fallbackStart != null ? fallbackStart + 1 : null
  // 분이 30 이상이면 다음 시간 슬롯도 포함되도록 +1
  return m >= 30 ? h + 1 : h
}

/** 로드맵 응답 → 학기별 코스 목록 */
export function toRoadmapSemesters(roadmap) {
  const semesters = roadmap?.semesters || roadmap?.roadmap?.semesters || []
  return semesters.map((sem) => ({
    semester: sem.semester || sem.semesterNumber || 0,
    totalCredits: sem.totalCredits || 0,
    courses: (sem.courses || []).map((c) => ({
      name: c.courseName || c.name || '',
      category: c.category || '',
      credits: c.credits || 0,
    })),
  }))
}

/** 현재 수강 중 (백엔드 응답에 명시 필드가 없으므로 timetable 기반으로 노출) */
export function toCurrentCourses(timetable) {
  const flat = toFlatSchedule(timetable)
  return flat.map((c) => ({
    name: c.name,
    type: '수강중',
    credit: c.credit || 3,
  }))
}
