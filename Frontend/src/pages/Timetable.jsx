import { useState } from 'react'
import Navbar from '../components/Navbar'

/**
 * ═══════════════════════════════════════════════════════════
 * AI 추천 시간표 페이지
 * ═══════════════════════════════════════════════════════════
 * - AI가 생성한 시간표 표시
 * - "수정하기" 클릭 → 과목 목록 패널 열림
 * - 목록에서 과목 클릭 → 시간표에 추가
 * - 시간표에서 과목 클릭 → 삭제
 * ═══════════════════════════════════════════════════════════
 */

// ─── TODO: 백엔드에서 받아올 추천 과목 목록 (API 연결 시 교체) ───
//
// ═══════════════════════════════════════════════════════════════════
// 백엔드 API 설계
// ═══════════════════════════════════════════════════════════════════
//
// [엔드포인트] POST /api/timetable/generate
//
// [Request Body]
// {
//   userId: string,
//   major: string,              // 본전공 코드
//   year: number,               // 학년
//   semester: number,           // 학기
//   career: string,             // 진로 키워드 (로그인 시 입력)
//   completedCourses: string[], // 기이수 과목 코드 목록
//   preferences: {
//     freeDay: string | null,   // 공강 요일 ('금' 등)
//     morningPrefer: boolean,   // 오전 수업 선호
//     consecutiveOk: boolean,   // 연강 허용
//     lunchBreak: boolean,      // 점심시간 확보
//     maxCredits: number,       // 최대 학점 (기본 18)
//     minCredits: number,       // 최소 학점 (기본 15)
//   }
// }
//
// [백엔드 내부 로직 - 추천 우선순위 엔진]
//
// Step 1. 사용자 상태 기반 판단
//   - 졸업요건 DB에서 남은 필수 과목 추출
//   - 현재 이수상태 + 진로 종합 분석
//
// Step 2. 추천 우선순위 결정
//   ① 졸업 필수 과목 (미이수) → 최우선
//   ② 선수과목 체인 분석 → 선수과목 관계 기반 다음 이수 과목
//   ③ 진로 기반 과목 추천 → 학과 과목 JSON 데이터 기반
//   ④ 학기별 로드맵 생성 → 다음 학기 기준 추천 과목 조합
//
// Step 3. 시간표 자동 생성
//   - 우선순위 높은 과목부터 배치
//   - 시간 충돌 자동 제거
//   - 선호 시간표 반영 (공강/오전/연강)
//   - 학점 제한 내에서 최적 조합
//
// [Response]
// {
//   schedule: [
//     { id, name, room, credit, professor, slots: [{day, hour}], color, priority }
//   ],
//   availableCourses: [...],  // 추가 가능한 과목 목록
//   totalCredits: number,
//   warnings: string[],       // "선수과목 미이수" 등 경고
//   roadmapSuggestion: {...}  // 다음 학기 로드맵 제안
// }
//
// [프론트에서 호출 위치]
// 1. Home.jsx - 페이지 로드 시 (미리보기용)
// 2. Timetable.jsx - 페이지 로드 시 (전체 시간표)
// 3. Timetable.jsx - 수동 수정 시 충돌 검증 (POST /api/timetable/validate)
//
// ═══════════════════════════════════════════════════════════════════
//
// useEffect(() => {
//   const generateTimetable = async () => {
//     const res = await fetch('/api/timetable/generate', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         userId: user.id,
//         major: user.major,
//         year: user.year,
//         semester: user.semester,
//         career: user.career,
//         completedCourses: user.completedCourses,
//         preferences: user.preferences,
//       })
//     })
//     const data = await res.json()
//     setAvailableCourses(data.availableCourses)
//     setSelectedIds(data.schedule.map(c => c.id))
//   }
//   generateTimetable()
// }, [])
const AVAILABLE_COURSES = [
  { id: 1, name: '운영체제', room: '과학관 201', credit: 3, professor: '김교수', slots: [{ day: 0, hour: 9 }, { day: 2, hour: 9 }], color: 'green' },
  { id: 2, name: '알고리즘', room: '공학관 101', credit: 3, professor: '이교수', slots: [{ day: 1, hour: 9 }, { day: 3, hour: 9 }], color: 'blue' },
  { id: 3, name: '자료구조', room: '소프트관 302', credit: 3, professor: '박교수', slots: [{ day: 4, hour: 11 }, { day: 4, hour: 12 }], color: 'purple' },
  { id: 4, name: '데이터베이스', room: '진리관 402', credit: 3, professor: '최교수', slots: [{ day: 1, hour: 13 }, { day: 4, hour: 13 }], color: 'orange' },
  { id: 5, name: '이산수학', room: '진리관 201', credit: 3, professor: '정교수', slots: [{ day: 1, hour: 14 }, { day: 3, hour: 14 }], color: 'teal' },
  { id: 6, name: '컴퓨터네트워크', room: '과학관 305', credit: 3, professor: '한교수', slots: [{ day: 0, hour: 13 }, { day: 2, hour: 13 }], color: 'pink' },
  { id: 7, name: '소프트웨어공학', room: '공학관 202', credit: 3, professor: '윤교수', slots: [{ day: 0, hour: 15 }, { day: 2, hour: 15 }], color: 'indigo' },
  { id: 8, name: '인공지능', room: '과학관 401', credit: 3, professor: '강교수', slots: [{ day: 1, hour: 11 }, { day: 3, hour: 11 }], color: 'rose' },
  { id: 9, name: '선형대수학', room: '진리관 101', credit: 3, professor: '송교수', slots: [{ day: 0, hour: 11 }, { day: 2, hour: 11 }], color: 'amber' },
  { id: 10, name: '확률과통계', room: '진리관 303', credit: 3, professor: '임교수', slots: [{ day: 3, hour: 15 }, { day: 4, hour: 15 }], color: 'cyan' },
]

// AI가 초기 추천한 과목 ID 목록
// TODO: 백엔드 응답으로 교체 → data.schedule.map(c => c.id)
const AI_RECOMMENDED_IDS = [1, 2, 3, 4, 5]

const DAYS = ['월', '화', '수', '목', '금']
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17]

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

function Timetable() {
  const [selectedIds, setSelectedIds] = useState(AI_RECOMMENDED_IDS)
  const [editMode, setEditMode] = useState(false)
  const [search, setSearch] = useState('')

  const selectedCourses = AVAILABLE_COURSES.filter(c => selectedIds.includes(c.id))
  const totalCredits = selectedCourses.reduce((sum, c) => sum + c.credit, 0)

  // 시간 충돌 체크
  const hasConflict = (course) => {
    for (const selected of selectedCourses) {
      for (const slot of course.slots) {
        if (selected.slots.some(s => s.day === slot.day && s.hour === slot.hour)) {
          return true
        }
      }
    }
    return false
  }

  const toggleCourse = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(i => i !== id))
    } else {
      const course = AVAILABLE_COURSES.find(c => c.id === id)
      if (course && !hasConflict(course) && totalCredits + course.credit <= 18) {
        setSelectedIds(prev => [...prev, id])
      }
    }
  }

  const getSlot = (day, hour) => selectedCourses.find(c => c.slots.some(s => s.day === day && s.hour === hour))

  const filteredAvailable = AVAILABLE_COURSES.filter(c =>
    c.name.includes(search) || c.professor.includes(search)
  )

  return (
    <>
      <Navbar />
      <div className="mt-14 flex">

        {/* ─── 메인: 시간표 ─── */}
        <div className={`flex-1 p-8 max-w-[900px] mx-auto transition-all ${editMode ? 'mr-[360px]' : ''}`}>
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-xl font-extrabold text-green-900">📅 AI 추천 시간표</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">{totalCredits}학점 · {selectedCourses.length}과목</span>
              <button
                onClick={() => setEditMode(!editMode)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition ${editMode ? 'bg-gray-200 text-gray-600' : 'bg-gradient-to-r from-green-700 to-green-600 text-white shadow-lg shadow-green-700/30'}`}
              >
                {editMode ? '완료' : '수정하기'}
              </button>
            </div>
          </div>

          {/* 시간표 그리드 */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="grid grid-cols-[48px_repeat(5,1fr)]">
              <div className="p-2 text-center text-[10px] text-gray-300 bg-gray-50 border-b-2 border-green-100">시간</div>
              {DAYS.map(d => <div key={d} className="p-2 text-center text-sm font-bold text-green-700 bg-lime-50 border-b-2 border-green-100">{d}</div>)}
              {HOURS.map(h => (
                <>
                  <div key={`h-${h}`} className="text-[10px] text-gray-300 flex items-start justify-end pr-2 pt-1 h-14 border-r border-gray-100 border-b border-gray-50">{h}:00</div>
                  {DAYS.map((_, di) => {
                    const c = getSlot(di, h)
                    return (
                      <div key={`${di}-${h}`} className={`h-14 border-r border-gray-50 border-b border-gray-50 p-0.5 ${h === 12 ? 'bg-green-50/20' : ''}`}>
                        {c && (
                          <div
                            className={`rounded-lg px-2 py-1 h-full flex flex-col justify-center cursor-pointer hover:opacity-80 transition ${colorMap[c.color]}`}
                            onClick={() => editMode && toggleCourse(c.id)}
                            title={editMode ? '클릭하여 삭제' : ''}
                          >
                            <div className="text-[11px] font-bold truncate">{c.name}</div>
                            <div className="text-[9px] opacity-70 truncate">{c.room}</div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </>
              ))}
            </div>
          </div>

          {/* 수강 과목 카드 */}
          <h3 className="text-sm font-bold text-gray-700 mt-6 mb-3">수강 과목</h3>
          <div className="grid grid-cols-2 gap-3">
            {selectedCourses.map(c => (
              <div key={c.id} className="bg-white rounded-xl p-3.5 shadow-sm flex items-center gap-3 hover:shadow-md transition cursor-pointer" onClick={() => editMode && toggleCourse(c.id)}>
                <div className={`w-1 h-10 rounded ${barColorMap[c.color]}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-800 truncate">{c.name}</div>
                  <div className="text-xs text-gray-400 truncate">{c.professor} · {c.room}</div>
                </div>
                <div className="text-sm font-extrabold text-green-700 shrink-0">{c.credit}학점</div>
                {editMode && <span className="text-red-400 text-xs shrink-0">✕</span>}
              </div>
            ))}
          </div>
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
                onChange={e => setSearch(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 outline-none focus:border-green-500 transition"
              />
              <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                <span>현재 {totalCredits}/18 학점</span>
                <span>{selectedCourses.length}과목 선택</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredAvailable.map(c => {
                const isSelected = selectedIds.includes(c.id)
                const conflict = !isSelected && hasConflict(c)
                const overCredit = !isSelected && totalCredits + c.credit > 18
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
                        <div className={`w-2 h-8 rounded ${barColorMap[c.color]}`} />
                        <div>
                          <div className="text-sm font-bold text-gray-800">{c.name}</div>
                          <div className="text-xs text-gray-400">{c.professor} · {c.room} · {c.credit}학점</div>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {isSelected ? (
                          <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded">추가됨</span>
                        ) : conflict ? (
                          <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded">충돌</span>
                        ) : overCredit ? (
                          <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded">학점초과</span>
                        ) : (
                          <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">+ 추가</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 mt-1.5 ml-4">
                      {c.slots.map((s, i) => (
                        <span key={i} className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{DAYS[s.day]} {s.hour}시</span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default Timetable
