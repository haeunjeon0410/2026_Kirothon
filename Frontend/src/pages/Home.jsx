import { useRef, useState } from 'react'
import Navbar from '../components/Navbar'
import { DAYS, HOURS, colorMap } from '../data/timetable'
import { useUser } from '../context/UserContext'
import { useHomeData } from '../hooks/useHomeData'
import {
  toCategoryCards,
  toCreditSummary,
  toExtraSemesterRisk,
  toFlatSchedule,
} from '../hooks/academicAdapters'

/**
 * 홈 화면 - 백엔드 데이터로 채워진 대시보드
 *
 * 데이터 소스:
 *   - useHomeData(): profile / graduation / timetable / roadmap / pipeline
 *   - 학점이수표 업로드는 useHomeData().uploadTranscript() 사용
 */
function Home() {
  const { user } = useUser()
  const {
    graduation,
    timetable,
    pipeline,
    loading,
    uploadTranscript,
  } = useHomeData()

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const fileInputRef = useRef(null)

  const credit = toCreditSummary(graduation)
  const cards = toCategoryCards(graduation)
  const risk = toExtraSemesterRisk(graduation)
  const selectedCourses = toFlatSchedule(timetable)
  const totalCredits = pipeline?.timetable?.totalScheduled || selectedCourses.length
  const trackLabel = graduation?.track || user?.track || ''

  const getSlot = (day, hour) =>
    selectedCourses.find((c) => c.slots.some((s) => s.day === day && s.hour === hour))

  // ─── 도넛 차트 stroke-dasharray 계산 ───
  const RADIUS = 52
  const CIRC = 2 * Math.PI * RADIUS // ≈ 326.7
  const arcs = cards.reduce((acc, c) => {
    const prevCursor = acc.length === 0 ? 0 : acc[acc.length - 1].nextCursor
    const slice = credit.required > 0 ? (c.earned / credit.required) * CIRC : 0
    acc.push({
      length: Math.max(0, slice),
      offset: -prevCursor,
      color: c.color,
      nextCursor: prevCursor + slice,
    })
    return acc
  }, [])
  const STROKE_BY_COLOR = {
    blue: '#4285f4',
    green: '#34a853',
    yellow: '#fbbc04',
    purple: '#a78bfa',
    gray: '#cbd5e1',
    pink: '#ec4899',
    cyan: '#06b6d4',
    indigo: '#6366f1',
  }
  const DOT_BY_COLOR = {
    blue: 'bg-blue-500',
    green: 'bg-green-600',
    yellow: 'bg-yellow-400',
    purple: 'bg-purple-400',
    gray: 'bg-gray-400',
    pink: 'bg-pink-500',
    cyan: 'bg-cyan-500',
    indigo: 'bg-indigo-500',
  }

  // ─── 학점이수표 업로드 핸들러 ───
  const handlePickFile = () => {
    setUploadError('')
    setUploadSuccess('')
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 같은 파일 재업로드 가능하도록 초기화
    if (!file) return

    if (!user?.major) {
      setUploadError('마이페이지에서 본전공을 먼저 설정해주세요.')
      return
    }
    if (file.type !== 'application/pdf') {
      setUploadError('PDF 파일만 업로드할 수 있어요.')
      return
    }

    try {
      setUploading(true)
      setUploadError('')
      setUploadSuccess('')
      const result = await uploadTranscript(file)
      const matched = result?.parsing?.totalMatched || 0
      const extracted = result?.parsing?.totalExtracted || 0
      if (matched === 0) {
        setUploadError(
          extracted === 0
            ? 'PDF에서 과목을 추출하지 못했어요. 다른 학점이수표 파일로 시도해주세요.'
            : `과목을 ${extracted}개 추출했지만 ‘${user.major}’ 데이터셋과 일치하는 항목이 없어요. 본전공 설정을 확인해주세요.`
        )
      } else {
        setUploadSuccess(`${matched}개 과목을 인식했어요. 분석 결과를 갱신했습니다.`)
      }
    } catch (err) {
      const msg =
        err?.error?.message ||
        err?.message ||
        (typeof err === 'string' ? err : '학점이수표 분석에 실패했어요.')
      setUploadError(msg)
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="mt-14 p-8 max-w-[1100px] mx-auto">
        {/* 환영 배너 */}
        <div className="bg-gradient-to-r from-green-700 via-green-600 to-green-400 rounded-2xl px-9 py-7 text-white flex items-center justify-between mb-7">
          <div>
            <h1 className="text-xl font-extrabold mb-1">
              안녕하세요, {user?.name || '학생'}님 👋
            </h1>
            <p className="text-sm opacity-85">
              {[user?.major, user?.year ? `${user.year}학년` : null, trackLabel]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <div className="text-5xl opacity-90">🌿</div>
        </div>

        {/* ═══ 학점 이수 현황 ═══ */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-700">학점 이수 현황</h3>
          <button
            onClick={handlePickFile}
            disabled={uploading}
            className="text-xs text-green-600 font-medium border border-green-200 rounded-lg px-3 py-1 hover:bg-green-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? '⏳ 분석 중...' : '📄 이수표 재업로드'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {(uploadError || uploadSuccess) && (
          <div
            className={`mb-3 px-4 py-2 rounded-lg text-xs ${
              uploadError
                ? 'bg-red-50 border border-red-200 text-red-600'
                : 'bg-green-50 border border-green-200 text-green-700'
            }`}
          >
            {uploadError || uploadSuccess}
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          {loading && !graduation ? (
            <div className="py-12 text-center text-sm text-gray-300">
              데이터를 불러오는 중...
            </div>
          ) : !graduation ? (
            <div className="py-12 text-center text-sm text-gray-400">
              아직 분석할 이수 데이터가 없어요.
              <br />
              <span className="text-xs text-gray-300">
                위의 ‘이수표 재업로드’ 버튼으로 학점이수표 PDF를 올려주세요.
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-9">
                {/* 도넛 차트 + 이수율 */}
                <div className="shrink-0 min-w-[110px]">
                  <div className="text-sm text-gray-400 mb-2">전체 이수율</div>
                  <div className="text-4xl font-extrabold text-gray-800 leading-none">
                    {credit.percent}
                    <span className="text-2xl">%</span>
                  </div>
                  <div className="text-xs text-gray-300 mt-1 mb-4">
                    ({credit.earned}/{credit.required} 학점)
                  </div>
                  <div className="text-xs text-gray-500">
                    • 졸업요건:{' '}
                    <strong className="text-green-700">{credit.required}학점</strong> 이상
                  </div>
                </div>
                <div className="shrink-0">
                  <svg width="140" height="140" viewBox="0 0 140 140">
                    <circle
                      cx="70"
                      cy="70"
                      r={RADIUS}
                      fill="none"
                      stroke="#eee"
                      strokeWidth="18"
                      transform="rotate(-90 70 70)"
                    />
                    {arcs.map((a, i) => (
                      <circle
                        key={i}
                        cx="70"
                        cy="70"
                        r={RADIUS}
                        fill="none"
                        stroke={STROKE_BY_COLOR[a.color] || '#cbd5e1'}
                        strokeWidth="18"
                        strokeDasharray={`${a.length} ${CIRC - a.length}`}
                        strokeDashoffset={a.offset}
                        transform="rotate(-90 70 70)"
                      />
                    ))}
                  </svg>
                </div>
                {/* 범례 */}
                <div className="flex-1 flex flex-col gap-3.5">
                  {cards.length === 0 ? (
                    <div className="text-xs text-gray-300">
                      카테고리 데이터가 없어요.
                    </div>
                  ) : (
                    cards.map((r) => (
                      <div
                        key={r.label}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              DOT_BY_COLOR[r.color] || 'bg-gray-300'
                            }`}
                          />
                          <span className="text-sm text-gray-600">{r.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-800">
                            {r.earned} / {r.required}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              r.fulfilled
                                ? 'bg-green-50 text-green-600'
                                : 'bg-red-50 text-red-500'
                            }`}
                          >
                            {r.fulfilled ? '충족' : `-${r.remaining}`}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 졸업 분석 요약 */}
              <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-1">졸업 가능 여부</div>
                  <div
                    className={`text-sm font-bold ${
                      graduation?.canGraduate ? 'text-green-600' : 'text-yellow-600'
                    }`}
                  >
                    {graduation?.canGraduate ? '✅ 가능' : '⚠️ 조건부 가능'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-1">트랙</div>
                  <div className="text-sm font-bold text-gray-800">
                    {trackLabel || '-'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-1">부족 학점</div>
                  <div
                    className={`text-sm font-bold ${
                      credit.remaining > 0 ? 'text-red-500' : 'text-green-600'
                    }`}
                  >
                    {credit.remaining}학점
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 추가학기 경고 */}
        {risk.risky && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-7 flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <div>
              <div className="text-sm font-bold text-red-700 mb-1">
                추가학기 가능성 감지
              </div>
              <p className="text-xs text-red-600 leading-relaxed">
                {risk.message ||
                  '현재 이수 속도 기준 졸업이 빡빡할 수 있어요. 로드맵을 점검해보세요.'}
              </p>
            </div>
          </div>
        )}

        {/* ═══ 커리큘럼 로드맵 + AI 시간표 ═══ */}
        <div className="grid grid-cols-2 gap-5 mb-7">
          {/* ─── 커리큘럼 로드맵 ─── */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-gray-700">🗺️ 커리큘럼 로드맵</span>
              <a href="/roadmap" className="text-xs text-green-600 font-medium">
                전체 보기 →
              </a>
            </div>

            <div className="flex items-center justify-center h-48 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <div className="text-center">
                <div className="text-3xl mb-2">🗺️</div>
                <p className="text-sm text-gray-400 font-medium">
                  AI가 로드맵을 생성 중이에요
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  로그인 정보 기반으로 분석 후 표시됩니다
                </p>
              </div>
            </div>
          </div>

          {/* ─── AI 추천 시간표 ─── */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-gray-700">📅 AI 추천 시간표</span>
              <a href="/timetable" className="text-xs text-green-600 font-medium">
                수정하기 →
              </a>
            </div>

            {selectedCourses.length === 0 ? (
              <div className="flex items-center justify-center h-48 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <div className="text-center">
                  <div className="text-3xl mb-2">📅</div>
                  <p className="text-sm text-gray-400 font-medium">
                    아직 추천 시간표가 없어요
                  </p>
                  <p className="text-xs text-gray-300 mt-1">
                    이수표 업로드 후 자동 생성됩니다
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="inline-flex items-center gap-1 text-[11px] text-green-700 font-semibold bg-green-50 border border-green-200 rounded-lg px-2 py-0.5 mb-3">
                  ✦ AI 생성 완료
                </div>

                {/* 시간표 미니 그리드 */}
                <div className="grid grid-cols-[32px_repeat(5,1fr)] gap-0.5">
                  <div />
                  {DAYS.map((d) => (
                    <div
                      key={d}
                      className="text-center text-[10px] font-bold text-gray-400 py-1"
                    >
                      {d}
                    </div>
                  ))}
                  {HOURS.map((h) => (
                    <>
                      <div
                        key={`t-${h}`}
                        className="text-[9px] text-gray-300 text-right pr-1 flex items-center justify-end h-6"
                      >
                        {h}
                      </div>
                      {DAYS.map((_, di) => {
                        const slot = getSlot(di, h)
                        return (
                          <div
                            key={`${di}-${h}`}
                            className={`h-6 rounded-sm ${
                              slot
                                ? colorMap[slot.color] +
                                  ' flex items-center px-1'
                                : 'bg-gray-50'
                            }`}
                          >
                            {slot && (
                              <span className="text-[9px] font-semibold truncate">
                                {slot.name}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                  <span>
                    {selectedCourses.length}과목 · {totalCredits || selectedCourses.length}슬롯
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default Home
