import { useEffect, useMemo, useState } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../context/UserContext'
import { useHomeData } from '../hooks/useHomeData'
import { toFlatSchedule } from '../hooks/academicAdapters'
import { getCoursesByMajor, saveTimetable } from '../api'

/**
 * AI 추천 시간표 페이지
 *
 * - 백엔드 시간표: useHomeData().timetable (학점이수표 업로드 시 즉시 갱신됨)
 * - 후보 과목: GET /courses/major/:major 의 sections 중 시간표가 있는 첫 섹션
 * - 사용자가 토글한 결과는 로컬 상태로 관리, ‘저장’ 클릭 시 POST /profile/:userId/timetable
 */

const DAYS = ['월', '화', '수', '목', '금']
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17]
const DAY_INDEX = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4, SAT: 5 }
const PALETTE = ['green', 'blue', 'purple', 'orange', 'teal', 'pink', 'indigo', 'rose', 'amber', 'cyan']

const colorMap = {
  green: 'bg-green-100 border-l-[3px] border-green-600 text-green-900',
  blue: 'bg-blue-100 border-l-[3px] border-blue-600 text-blue-900',
  purple: 'bg-purple-100 border-l-[3px] border-purple-600 text-purple-900',
  orange: 'bg-orange-100 border-l-[3px] border-orange-500 text-orange-900',
  teal: 'bg-teal-100 border-l-[3px] border-teal-600 text-teal-900',
  pink: 'bg-pink-100 border-l-[3px] border-pink-500 text-pink-900',
  indigo: 'bg-indigo-100 border-l-[3px] border-indigo-600 text-indigo-900',
  rose: 'bg-rose-100 border-l-[3px] border-rose-500 text-rose-900',
  amber: 'bg-amber-100 border-l-[3px] border-amber-500 text-amber-900',
  cyan: 'bg-cyan-100 border-l-[3px] border-cyan-500 text-cyan-900',
}
const barColorMap = {
  green: 'bg-green-600', blue: 'bg-blue-600', purple: 'bg-purple-600',
  orange: 'bg-orange-500', teal: 'bg-teal-600', pink: 'bg-pink-500',
  indigo: 'bg-indigo-600', rose: 'bg-rose-500', amber: 'bg-amber-500', cyan: 'bg-cyan-500',
}

/** 백엔드 course 객체 → 프론트 시간표용 카드로 변환 */
function courseToCard(course, indexForColor) {
  const section = (course.sections || []).find((s) => s.hasSchedule) || course.sections?.[0]
  if (!section || !section.slots || section.slots.length === 0) return null

  const slots = []
  for (const s of section.slots) {
    const dayIdx = DAY_INDEX[s.day]
    if (dayIdx === undefined) continue
    const startH = parseInt(String(s.startTime).split(':')[0], 10)
    const endParts = String(s.endTime).split(':')
    const endH = parseInt(endParts[0], 10)
    const endM = parseInt(endParts[1] || '0', 10)
    if (!Number.isFinite(startH)) continue
    const last = endM >= 30 ? endH : Math.max(startH, endH - 1)
    for (let h = startH; h <= last; h++) {
      slots.push({ day: dayIdx, hour: h })
    }
  }

  if (slots.length === 0) return null

  return {
    id: course.courseCode,
    name: course.name,
    room: section.slots[0]?.location || '',
    professor: (section.professors && section.professors[0]) || '',
    credit: course.credits || 3,
    color: PALETTE[indexForColor % PALETTE.length],
    slots,
    category: course.category,
  }
}

function Timetable() {
  const { user } = useUser()
  const { userId, timetable, loading } = useHomeData()

  const [editMode, setEditMode] = useState(false)
  const [search, setSearch] = useState('')
  const [majorCourses, setMajorCourses] = useState([])
  const [coursesError, setCoursesError] = useState('')
  const [coursesLoading, setCoursesLoading] = useState(false)
  // 사용자가 AI 추천 위에 직접 추가/제거한 항목을 따로 추적해
  // selectedIds 를 derived 로 계산 → bootstrap effect 가 필요 없음
  const [userAdds, setUserAdds] = useState(() => new Set())
  const [userRemoves, setUserRemoves] = useState(() => new Set())
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [saveErr, setSaveErr] = useState('')

  // ─── 학과 전체 과목 후보를 받아 카드로 변환 ───
  useEffect(() => {
    if (!user?.major) return undefined
    let cancelled = false

    const run = async () => {
      setCoursesLoading(true)
      setCoursesError('')
      try {
        const courses = await getCoursesByMajor(user.major)
        if (cancelled) return
        const cards = (courses || [])
          .map((c, i) => courseToCard(c, i))
          .filter(Boolean)
        setMajorCourses(cards)
      } catch (err) {
        if (cancelled) return
        setCoursesError(
          err?.error?.message ||
            err?.message ||
            '과목 목록을 불러오지 못했어요.'
        )
        setMajorCourses([])
      } finally {
        if (!cancelled) setCoursesLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [user?.major])

  // ─── 백엔드 시간표 → 프론트 카드 (AI 추천 시드) ───
  const aiRecommended = useMemo(() => {
    const flat = toFlatSchedule(timetable)
    return flat.map((c, i) => ({
      ...c,
      id: c.id ?? c.name,
      color: c.color || PALETTE[i % PALETTE.length],
    }))
  }, [timetable])

  // ─── 학과 후보 + AI 추천을 머지한 풀 카탈로그 ───
  const availableCourses = useMemo(() => {
    const merged = [...majorCourses]
    const seen = new Set(merged.map((c) => c.id))
    aiRecommended.forEach((c) => {
      if (!seen.has(c.id)) {
        merged.push(c)
        seen.add(c.id)
      }
    })
    return merged
  }, [majorCourses, aiRecommended])

  // ─── 선택 ID = AI추천 ∪ userAdds \ userRemoves (derived) ───
  const selectedIds = useMemo(() => {
    const out = []
    const seen = new Set()
    aiRecommended.forEach((c) => {
      if (!userRemoves.has(c.id) && !seen.has(c.id)) {
        out.push(c.id)
        seen.add(c.id)
      }
    })
    userAdds.forEach((id) => {
      if (!seen.has(id)) {
        out.push(id)
        seen.add(id)
      }
    })
    return out
  }, [aiRecommended, userAdds, userRemoves])

  const selectedCourses = availableCourses.filter((c) => selectedIds.includes(c.id))
  const totalCredits = selectedCourses.reduce((sum, c) => sum + (c.credit || 0), 0)

  const hasConflict = (course) => {
    for (const selected of selectedCourses) {
      if (selected.id === course.id) continue
      for (const slot of course.slots) {
        if (selected.slots.some((s) => s.day === slot.day && s.hour === slot.hour)) {
          return true
        }
      }
    }
    return false
  }

  const isAiRecommended = (id) => aiRecommended.some((c) => c.id === id)

  const toggleCourse = (id) => {
    setSaveMsg('')
    setSaveErr('')
    if (selectedIds.includes(id)) {
      // 제거
      if (isAiRecommended(id)) {
        setUserRemoves((prev) => {
          const next = new Set(prev)
          next.add(id)
          return next
        })
        setUserAdds((prev) => {
          if (!prev.has(id)) return prev
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      } else {
        setUserAdds((prev) => {
          if (!prev.has(id)) return prev
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
      return
    }
    // 추가
    const course = availableCourses.find((c) => c.id === id)
    if (course && !hasConflict(course) && totalCredits + (course.credit || 0) <= 18) {
      if (isAiRecommended(id)) {
        setUserRemoves((prev) => {
          if (!prev.has(id)) return prev
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      } else {
        setUserAdds((prev) => {
          const next = new Set(prev)
          next.add(id)
          return next
        })
      }
    }
  }

  const getSlot = (day, hour) =>
    selectedCourses.find((c) =>
      c.slots.some((s) => s.day === day && s.hour === hour)
    )

  const filteredAvailable = availableCourses.filter(
    (c) =>
      c.name.includes(search) ||
      (c.professor || '').includes(search)
  )

  const handleSave = async () => {
    if (!userId) {
      setSaveErr('로그인 정보가 없어 저장할 수 없어요.')
      return
    }
    setSaving(true)
    setSaveErr('')
    setSaveMsg('')
    try {
      const dayKeyByIdx = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
      const grouped = { MON: [], TUE: [], WED: [], THU: [], FRI: [], SAT: [] }
      selectedCourses.forEach((c) => {
        c.slots.forEach((s) => {
          const key = dayKeyByIdx[s.day]
          if (!key) return
          grouped[key].push({
            courseName: c.name,
            startTime: `${String(s.hour).padStart(2, '0')}:00`,
            endTime: `${String(s.hour + 1).padStart(2, '0')}:00`,
            location: c.room || null,
            professor: c.professor || null,
          })
        })
      })

      await saveTimetable(userId, {
        semester: user?.semester || 0,
        department: user?.major || '',
        schedule: grouped,
      })
      setSaveMsg('시간표가 저장되었어요.')
    } catch (err) {
      setSaveErr(
        err?.error?.message ||
          err?.message ||
          (typeof err === 'string' ? err : '저장 중 문제가 발생했어요.')
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="mt-14 flex">
        {/* ─── 메인: 시간표 ─── */}
        <div
          className={`flex-1 p-8 max-w-[900px] mx-auto transition-all ${
            editMode ? 'mr-[360px]' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-xl font-extrabold text-green-900">
              📅 AI 추천 시간표
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">
                {totalCredits}학점 · {selectedCourses.length}과목
              </span>
              <button
                onClick={handleSave}
                disabled={saving || selectedCourses.length === 0}
                className="px-3 py-2 rounded-xl text-sm font-bold bg-white border border-green-200 text-green-700 hover:bg-green-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? '저장 중...' : '💾 저장'}
              </button>
              <button
                onClick={() => setEditMode(!editMode)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                  editMode
                    ? 'bg-gray-200 text-gray-600'
                    : 'bg-gradient-to-r from-green-700 to-green-600 text-white shadow-lg shadow-green-700/30'
                }`}
              >
                {editMode ? '완료' : '수정하기'}
              </button>
            </div>
          </div>

          {(saveMsg || saveErr) && (
            <div
              className={`mb-3 px-3 py-2 rounded-lg text-xs ${
                saveErr
                  ? 'bg-red-50 border border-red-200 text-red-600'
                  : 'bg-green-50 border border-green-200 text-green-700'
              }`}
            >
              {saveErr || saveMsg}
            </div>
          )}

          {/* 시간표 그리드 */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="grid grid-cols-[48px_repeat(5,1fr)]">
              <div className="p-2 text-center text-[10px] text-gray-300 bg-gray-50 border-b-2 border-green-100">
                시간
              </div>
              {DAYS.map((d) => (
                <div
                  key={d}
                  className="p-2 text-center text-sm font-bold text-green-700 bg-lime-50 border-b-2 border-green-100"
                >
                  {d}
                </div>
              ))}
              {HOURS.map((h) => (
                <>
                  <div
                    key={`h-${h}`}
                    className="text-[10px] text-gray-300 flex items-start justify-end pr-2 pt-1 h-14 border-r border-gray-100 border-b border-gray-50"
                  >
                    {h}:00
                  </div>
                  {DAYS.map((_, di) => {
                    const c = getSlot(di, h)
                    return (
                      <div
                        key={`${di}-${h}`}
                        className={`h-14 border-r border-gray-50 border-b border-gray-50 p-0.5 ${
                          h === 12 ? 'bg-green-50/20' : ''
                        }`}
                      >
                        {c && (
                          <div
                            className={`rounded-lg px-2 py-1 h-full flex flex-col justify-center cursor-pointer hover:opacity-80 transition ${
                              colorMap[c.color] || colorMap.green
                            }`}
                            onClick={() => editMode && toggleCourse(c.id)}
                            title={editMode ? '클릭하여 삭제' : ''}
                          >
                            <div className="text-[11px] font-bold truncate">
                              {c.name}
                            </div>
                            <div className="text-[9px] opacity-70 truncate">
                              {c.room || ''}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </>
              ))}
            </div>
          </div>

          {!loading && selectedCourses.length === 0 && (
            <div className="mt-6 bg-white rounded-2xl p-10 shadow-sm text-center">
              <div className="text-3xl mb-2">🗓️</div>
              <p className="text-sm text-gray-500 font-semibold mb-1">
                아직 선택된 과목이 없어요
              </p>
              <p className="text-xs text-gray-400">
                ‘수정하기’ 버튼으로 과목을 추가해보세요.
              </p>
            </div>
          )}

          {selectedCourses.length > 0 && (
            <>
              <h3 className="text-sm font-bold text-gray-700 mt-6 mb-3">
                수강 과목
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {selectedCourses.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white rounded-xl p-3.5 shadow-sm flex items-center gap-3 hover:shadow-md transition cursor-pointer"
                    onClick={() => editMode && toggleCourse(c.id)}
                  >
                    <div
                      className={`w-1 h-10 rounded ${
                        barColorMap[c.color] || barColorMap.green
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-800 truncate">
                        {c.name}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {[c.professor, c.room].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div className="text-sm font-extrabold text-green-700 shrink-0">
                      {c.credit}학점
                    </div>
                    {editMode && (
                      <span className="text-red-400 text-xs shrink-0">✕</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ─── 사이드: 과목 목록 (수정 모드) ─── */}
        {editMode && (
          <div className="fixed top-14 right-0 w-[360px] h-[calc(100vh-56px)] bg-white border-l border-gray-200 shadow-xl flex flex-col z-30">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 mb-3">과목 추가</h3>
              <input
                type="text"
                placeholder="과목명 또는 교수명 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 outline-none focus:border-green-500 transition"
              />
              <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                <span>현재 {totalCredits}/18 학점</span>
                <span>{selectedCourses.length}과목 선택</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {coursesLoading ? (
                <div className="py-8 text-center text-xs text-gray-300">
                  과목 목록을 불러오는 중...
                </div>
              ) : coursesError ? (
                <div className="py-6 text-center text-xs text-red-500">
                  {coursesError}
                </div>
              ) : filteredAvailable.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  표시할 과목이 없어요.
                </div>
              ) : (
                filteredAvailable.map((c) => {
                  const isSelected = selectedIds.includes(c.id)
                  const conflict = !isSelected && hasConflict(c)
                  const overCredit =
                    !isSelected && totalCredits + (c.credit || 0) > 18
                  const disabled = conflict || overCredit

                  return (
                    <div
                      key={c.id}
                      className={`rounded-xl p-3 border transition cursor-pointer ${
                        isSelected
                          ? 'bg-green-50 border-green-200'
                          : disabled
                            ? 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed'
                            : 'bg-white border-gray-100 hover:border-green-300 hover:shadow-sm'
                      }`}
                      onClick={() => !disabled && toggleCourse(c.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-8 rounded ${
                              barColorMap[c.color] || barColorMap.green
                            }`}
                          />
                          <div>
                            <div className="text-sm font-bold text-gray-800">
                              {c.name}
                            </div>
                            <div className="text-xs text-gray-400">
                              {[c.professor, c.room, `${c.credit}학점`]
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {isSelected ? (
                            <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded">
                              추가됨
                            </span>
                          ) : conflict ? (
                            <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded">
                              충돌
                            </span>
                          ) : overCredit ? (
                            <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded">
                              학점초과
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                              + 추가
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 mt-1.5 ml-4 flex-wrap">
                        {c.slots.map((s, i) => (
                          <span
                            key={i}
                            className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded"
                          >
                            {DAYS[s.day]} {s.hour}시
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default Timetable
