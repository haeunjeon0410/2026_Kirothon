import Navbar from '../components/Navbar'
import { AVAILABLE_COURSES, AI_RECOMMENDED_IDS, DAYS, HOURS, colorMap } from '../data/timetable'

/**
 * ═══════════════════════════════════════════════════════════
 * 홈 화면 구성
 * ═══════════════════════════════════════════════════════════
 * 1. 학점 이수 현황 (도넛 차트)
 * 2. 커리큘럼 로드맵 (AI 생성) → 백엔드 연결 후 구현
 * 3. AI 추천 시간표 → 백엔드 연결 후 실제 데이터 교체
 * ═══════════════════════════════════════════════════════════
 */

// AI 추천 과목만 필터
const selectedCourses = AVAILABLE_COURSES.filter(c => AI_RECOMMENDED_IDS.includes(c.id))

function Home() {
  // ─── TODO: 백엔드 API 연결 ───
  // const [timetable, setTimetable] = useState([])
  // const [roadmap, setRoadmap] = useState(null)
  //
  // useEffect(() => {
  //   // AI 시간표 생성 API 호출
  //   // POST /api/timetable/generate
  //   // body: { userId, preferences: { 공강요일, 오전선호, 연강선호, 점심확보 } }
  //   // 응답: 시간표 데이터
  //   fetch('/api/timetable/generate', { method: 'POST', body: JSON.stringify(userPrefs) })
  //     .then(res => res.json())
  //     .then(data => setTimetable(data.schedule))
  //
  //   // AI 로드맵 생성 API 호출
  //   // POST /api/roadmap/generate
  //   // body: { userId, major, year, semester, career }
  //   // 응답: 로드맵 트리 데이터
  //   fetch('/api/roadmap/generate', { method: 'POST', body: JSON.stringify(userInfo) })
  //     .then(res => res.json())
  //     .then(data => setRoadmap(data.roadmap))
  // }, [])

  const getSlot = (day, hour) => selectedCourses.find(c => c.slots.some(s => s.day === day && s.hour === hour))

  return (
    <>
      <Navbar />
      <div className="mt-14 p-8 max-w-[1100px] mx-auto">

        {/* 환영 배너 */}
        <div className="bg-gradient-to-r from-green-700 via-green-600 to-green-400 rounded-2xl px-9 py-7 text-white flex items-center justify-between mb-7">
          <div>
            <h1 className="text-xl font-extrabold mb-1">안녕하세요, 전민서님 👋</h1>
            <p className="text-sm opacity-85">컴퓨터과학전공 · 2학년 · AI·ML 트랙</p>
          </div>
          <div className="text-5xl opacity-90">🌿</div>
        </div>

        {/* ═══ 학점 이수 현황 ═══ */}
        {/*
         * ═══════════════════════════════════════════════════════════════════
         * 학점 이수 현황 - 백엔드 연결 설계
         * ═══════════════════════════════════════════════════════════════════
         *
         * [엔드포인트] POST /api/credits/analyze
         *
         * [Request]
         * { userId, pdfFile (multipart) }
         *   또는
         * { userId } (이미 업로드된 경우 저장된 데이터 조회)
         *
         * [백엔드 내부 로직]
         * 1. 학점이수표 PDF 업로드 → 파싱 (OCR 또는 구조화 파싱)
         * 2. 이수 학점 분석 → 전필/전선/교필/교선 자동 분류
         * 3. 대학별 졸업 요건 적용 → 단과대별 졸업 기준 반영
         * 4. 전공별 졸업 요건 적용 → 본전공 및 다중전공 졸업 기준
         * 5. 졸업 요건 분석 → 부족 학점 및 미이수 필수 과목 계산
         * 6. 졸업 가능 여부 분석 → 현재 이수 상태 기반 판단
         * 7. 추가학기 가능성 판단 → 로드맵 기준 추가학기 필요 여부 예측
         *
         * [Response]
         * {
         *   totalCredits: { earned: 62, required: 130 },
         *   breakdown: {
         *     majorRequired: { earned: 18, required: 30 },
         *     majorElective: { earned: 20, required: 30 },
         *     generalRequired: { earned: 8, required: 12 },
         *     generalElective: { earned: 16, required: 28 },
         *   },
         *   missingCourses: [...],        // 미이수 필수 과목
         *   canGraduate: boolean,         // 졸업 가능 여부
         *   extraSemesterRisk: boolean,   // 추가학기 위험
         *   extraSemesterReason: string,  // 사유
         *   graduationEstimate: '2026-2', // 예상 졸업 시기
         * }
         *
         * [프론트 호출 위치]
         * - Home.jsx 로드 시 자동 호출
         * - PDF 업로드 후 재분석
         * ═══════════════════════════════════════════════════════════════════
         */}

        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-700">학점 이수 현황</h3>
          <button className="text-xs text-green-600 font-medium border border-green-200 rounded-lg px-3 py-1 hover:bg-green-50 transition">
            📄 이수표 재업로드
          </button>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <div className="flex items-center gap-9">
            {/* 도넛 차트 + 이수율 */}
            <div className="shrink-0 min-w-[110px]">
              <div className="text-sm text-gray-400 mb-2">전체 이수율</div>
              <div className="text-4xl font-extrabold text-gray-800 leading-none">62<span className="text-2xl">%</span></div>
              <div className="text-xs text-gray-300 mt-1 mb-4">(62/100 학점)</div>
              <div className="text-xs text-gray-500">• 졸업요건: <strong className="text-green-700">130학점</strong> 이상</div>
            </div>
            <div className="shrink-0">
              <svg width="140" height="140" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="52" fill="none" stroke="#eee" strokeWidth="18" transform="rotate(-90 70 70)"/>
                <circle cx="70" cy="70" r="52" fill="none" stroke="#4285f4" strokeWidth="18" strokeDasharray="58.8 267.9" strokeDashoffset="0" transform="rotate(-90 70 70)"/>
                <circle cx="70" cy="70" r="52" fill="none" stroke="#34a853" strokeWidth="18" strokeDasharray="65.3 261.4" strokeDashoffset="267.9" transform="rotate(-90 70 70)"/>
                <circle cx="70" cy="70" r="52" fill="none" stroke="#fbbc04" strokeWidth="18" strokeDasharray="26.1 300.6" strokeDashoffset="202.6" transform="rotate(-90 70 70)"/>
                <circle cx="70" cy="70" r="52" fill="none" stroke="#a78bfa" strokeWidth="18" strokeDasharray="52.3 274.4" strokeDashoffset="176.5" transform="rotate(-90 70 70)"/>
              </svg>
            </div>
            {/* 범례 */}
            <div className="flex-1 flex flex-col gap-3.5">
              {[
                { color: 'bg-blue-500', label: '전공필수', earned: 18, required: 30 },
                { color: 'bg-green-600', label: '전공선택', earned: 20, required: 30 },
                { color: 'bg-yellow-400', label: '교양필수', earned: 8, required: 12 },
                { color: 'bg-purple-400', label: '교양선택', earned: 16, required: 28 },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${r.color}`} />
                    <span className="text-sm text-gray-600">{r.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800">{r.earned} / {r.required}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.earned >= r.required ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                      {r.earned >= r.required ? '충족' : `-${r.required - r.earned}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 졸업 분석 요약 */}
          <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">졸업 가능 여부</div>
              <div className="text-sm font-bold text-yellow-600">⚠️ 조건부 가능</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">예상 졸업</div>
              <div className="text-sm font-bold text-gray-800">2026-2</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">부족 학점</div>
              <div className="text-sm font-bold text-red-500">38학점</div>
            </div>
          </div>
        </div>

        {/* 추가학기 경고 팝업 (조건부 표시) */}
        {/* TODO: extraSemesterRisk === true 일 때만 표시 */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-7 flex items-start gap-3">
          <span className="text-lg">⚠️</span>
          <div>
            <div className="text-sm font-bold text-red-700 mb-1">추가학기 가능성 감지</div>
            <p className="text-xs text-red-600 leading-relaxed">현재 이수 속도 기준, 졸업 필수 과목 3개가 남아있어 추가학기가 필요할 수 있어요. 다음 학기 로드맵을 확인해보세요.</p>
          </div>
        </div>

        {/* ═══ 커리큘럼 로드맵 + AI 시간표 2열 ═══ */}
        <div className="grid grid-cols-2 gap-5 mb-7">

          {/* ─── 커리큘럼 로드맵 (AI 생성 후 연결) ─── */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-gray-700">🗺️ 커리큘럼 로드맵</span>
              <a href="/roadmap" className="text-xs text-green-600 font-medium">전체 보기 →</a>
            </div>

            {/*
             * ═══════════════════════════════════════════════════════
             * TODO: AI 로드맵 백엔드 연결
             * ═══════════════════════════════════════════════════════
             * 
             * 로드맵 생성 방식 (2가지):
             * 1. 선수과목 기반 자동 생성
             *    - 학과 커리큘럼 DB에서 선수과목 관계 추출
             *    - 현재 이수 현황 기반으로 남은 과목 트리 생성
             * 
             * 2. 진로 기반 AI 추천
             *    - 사용자 입력 진로/관심 키워드 기반
             *    - AI가 추천 과목 순서 + 선택과목 제안
             * 
             * API: POST /api/roadmap/generate
             * Request: { userId, major, year, semester, career, completedCourses }
             * Response: { roadmap: { areas: [...], courses: [...], connections: [...] } }
             * 
             * 이 영역에 로드맵 트리/그래프 시각화 컴포넌트 렌더링
             * ═══════════════════════════════════════════════════════
             */}

            <div className="flex items-center justify-center h-48 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <div className="text-center">
                <div className="text-3xl mb-2">🗺️</div>
                <p className="text-sm text-gray-400 font-medium">AI가 로드맵을 생성 중이에요</p>
                <p className="text-xs text-gray-300 mt-1">로그인 정보 기반으로 분석 후 표시됩니다</p>
              </div>
            </div>
          </div>

          {/* ─── AI 추천 시간표 ─── */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-gray-700">📅 AI 추천 시간표</span>
              <a href="/timetable" className="text-xs text-green-600 font-medium">수정하기 →</a>
            </div>

            {/*
             * ═══════════════════════════════════════════════════════
             * AI 시간표 자동 생성 설계
             * ═══════════════════════════════════════════════════════
             * 
             * [필수] 추천 과목 기반 자동 시간표 생성
             * [필수] 시간 충돌 자동 제거 - 겹치는 강의 자동 제외
             * [필수] 선호 시간표 반영 - 공강/오전수업/연강 선호 반영
             * [필수] 기이수 과목 제외 - 이미 수강 완료한 과목 자동 제외
             * [필수] 학점 제한 반영 - 최대/최소 신청 학점 범위 내 생성
             * [필수] 시간표 수동 수정 - 사용자가 직접 강좌 추가/삭제 가능
             * 
             * API: POST /api/timetable/generate
             * Request: {
             *   userId,
             *   preferences: {
             *     freeDay: '금',           // 공강 요일
             *     morningPrefer: true,     // 오전 수업 선호
             *     consecutiveOk: true,     // 연강 허용
             *     lunchBreak: true,        // 점심시간 확보
             *     maxCredits: 18,          // 최대 학점
             *     minCredits: 15,          // 최소 학점
             *   },
             *   completedCourses: [...],   // 기이수 과목 목록
             *   requiredCourses: [...],    // 필수 이수 과목
             * }
             * Response: {
             *   schedule: [{ name, room, day, hour, duration, color, courseId }],
             *   totalCredits: 17,
             *   warnings: [...],
             * }
             * ═══════════════════════════════════════════════════════
             */}

            <div className="inline-flex items-center gap-1 text-[11px] text-green-700 font-semibold bg-green-50 border border-green-200 rounded-lg px-2 py-0.5 mb-3">✦ AI 생성 완료</div>

            {/* 시간표 미니 그리드 */}
            <div className="grid grid-cols-[32px_repeat(5,1fr)] gap-0.5">
              <div />
              {DAYS.map(d => <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1">{d}</div>)}
              {HOURS.map(h => (
                <>
                  <div key={`t-${h}`} className="text-[9px] text-gray-300 text-right pr-1 flex items-center justify-end h-6">{h}</div>
                  {DAYS.map((_, di) => {
                    const slot = getSlot(di, h)
                    return (
                      <div key={`${di}-${h}`} className={`h-6 rounded-sm ${slot ? colorMap[slot.color] + ' flex items-center px-1' : 'bg-gray-50'}`}>
                        {slot && <span className="text-[9px] font-semibold truncate">{slot.name}</span>}
                      </div>
                    )
                  })}
                </>
              ))}
            </div>

            {/* 시간표 요약 */}
            <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
              <span>5과목 · 17학점</span>
              <span className="text-green-600 font-medium">금요일 공강 ✓</span>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}

export default Home
