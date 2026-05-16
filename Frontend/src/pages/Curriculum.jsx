import { useRef, useState } from 'react'
import Navbar from '../components/Navbar'
import { useUser } from '../context/UserContext'
import { useHomeData } from '../hooks/useHomeData'
import {
  toCategoryCards,
  toCreditSummary,
  toExtraSemesterRisk,
  toMissingMandatory,
  toCurrentCourses,
} from '../hooks/academicAdapters'

/**
 * 커리큘럼 기반 학업 현황 페이지
 *
 * 데이터 소스:
 *   - graduation: GET /academic/graduation-status/:userId
 *   - pipeline: 학점이수표 업로드 후 받은 분석 결과 (recommendedCourses 등)
 *   - timetable: GET /profile/:userId/timetable
 */
function Curriculum() {
  const { user } = useUser()
  const {
    profile,
    graduation,
    timetable,
    pipeline,
    loading,
    uploadTranscript,
  } = useHomeData()

  const [tab, setTab] = useState('overview')
  const [showExtraSemesterAlert, setShowExtraSemesterAlert] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const fileInputRef = useRef(null)

  const credit = toCreditSummary(graduation)
  const cards = toCategoryCards(graduation)
  const risk = toExtraSemesterRisk(graduation)
  const missingCourses = toMissingMandatory(graduation, pipeline)
  const currentCourses = toCurrentCourses(timetable)

  const trackLabel = graduation?.track || profile?.track || user?.track || ''
  const department = graduation?.department || user?.major || ''

  const COLOR_BAR = {
    blue: 'from-blue-600 to-blue-400',
    green: 'from-green-600 to-green-400',
    yellow: 'from-yellow-500 to-yellow-300',
    purple: 'from-purple-500 to-purple-300',
    gray: 'from-gray-400 to-gray-300',
    pink: 'from-pink-500 to-pink-300',
    cyan: 'from-cyan-500 to-cyan-300',
    indigo: 'from-indigo-500 to-indigo-300',
  }

  const handlePickFile = () => {
    setUploadError('')
    setUploadSuccess('')
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
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
        setUploadSuccess(`${matched}개 과목을 인식했어요. 분석을 갱신했습니다.`)
      }
    } catch (err) {
      setUploadError(
        err?.error?.message ||
          err?.message ||
          (typeof err === 'string' ? err : '학점이수표 분석에 실패했어요.')
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="mt-14 p-8 max-w-[1100px] mx-auto">
        {/* 추가학기 경고 팝업 */}
        {risk.risky && showExtraSemesterAlert && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-4">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-red-800 mb-1">
                추가학기 가능성 감지
              </h3>
              <p className="text-xs text-red-600 leading-relaxed">
                {risk.message}
              </p>
              {risk.extraSemestersNeeded > 0 && (
                <p className="text-xs text-red-400 mt-1">
                  예상 추가학기: {risk.extraSemestersNeeded}학기
                </p>
              )}
            </div>
            <button
              onClick={() => setShowExtraSemesterAlert(false)}
              className="text-red-300 hover:text-red-500 text-sm"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-extrabold text-green-900 mb-1">
              📊 커리큘럼 기반 학업 현황
            </h1>
            <p className="text-sm text-gray-400">
              {[department, trackLabel].filter(Boolean).join(' · ') ||
                '전공 정보 없음'}
            </p>
          </div>
          <button
            onClick={handlePickFile}
            disabled={uploading}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-gray-200 text-gray-500 hover:border-green-400 hover:text-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? '⏳ 분석 중...' : '📄 이수표 업로드'}
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
            className={`mb-4 px-4 py-2 rounded-lg text-xs ${
              uploadError
                ? 'bg-red-50 border border-red-200 text-red-600'
                : 'bg-green-50 border border-green-200 text-green-700'
            }`}
          >
            {uploadError || uploadSuccess}
          </div>
        )}

        {/* 탭 */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm w-fit mb-6">
          {[
            { key: 'overview', label: '전체 요약' },
            { key: 'graduation', label: '졸업 요건' },
            { key: 'courses', label: '이수 과목' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
                tab === t.key
                  ? 'bg-green-700 text-white'
                  : 'text-gray-400 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 로딩/빈 상태 */}
        {loading && !graduation ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm text-center text-sm text-gray-300">
            분석 결과를 불러오는 중...
          </div>
        ) : !graduation ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
            <div className="text-4xl mb-3">📄</div>
            <p className="text-sm text-gray-500 font-semibold mb-1">
              아직 분석 결과가 없어요
            </p>
            <p className="text-xs text-gray-400">
              우측 상단 ‘이수표 업로드’ 버튼으로 PDF를 올려주세요.
            </p>
          </div>
        ) : (
          <>
            {/* ═══ 전체 요약 ═══ */}
            {tab === 'overview' && (
              <>
                {/* 졸업 가능 여부 배너 */}
                <div
                  className={`rounded-2xl p-5 mb-6 flex items-center gap-4 ${
                    graduation.canGraduate
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <div className="text-3xl">
                    {graduation.canGraduate ? '🎓' : '⚠️'}
                  </div>
                  <div>
                    <h3
                      className={`text-sm font-bold ${
                        graduation.canGraduate
                          ? 'text-green-800'
                          : 'text-red-800'
                      }`}
                    >
                      {graduation.canGraduate
                        ? '졸업 요건 충족'
                        : '졸업 요건 미충족'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {trackLabel ? `트랙: ${trackLabel} · ` : ''}
                      남은 학점: {credit.remaining}학점
                    </p>
                  </div>
                </div>

                {/* 학점 카드 */}
                <div className="grid grid-cols-4 gap-3.5 mb-6">
                  {cards.length === 0 ? (
                    <div className="col-span-4 bg-white rounded-2xl p-8 shadow-sm text-center text-xs text-gray-300">
                      카테고리 데이터가 없어요.
                    </div>
                  ) : (
                    cards.map((c) => (
                      <div
                        key={c.label}
                        className="bg-white rounded-2xl p-5 shadow-sm"
                      >
                        <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-2">
                          {c.label}
                        </div>
                        <div className="text-2xl font-extrabold text-green-700">
                          {c.earned}
                        </div>
                        <div className="text-xs text-gray-300 mt-0.5 mb-3">
                          / {c.required}학점
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${
                              COLOR_BAR[c.color] || COLOR_BAR.gray
                            } rounded-full transition-all`}
                            style={{ width: `${c.progress}%` }}
                          />
                        </div>
                        <div
                          className={`text-[11px] font-bold mt-2 ${
                            c.progress >= 80
                              ? 'text-green-600'
                              : c.progress >= 50
                                ? 'text-yellow-600'
                                : 'text-red-500'
                          }`}
                        >
                          {c.fulfilled ? '✓ 충족' : `${c.remaining}학점 남음`}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* 미이수 필수 과목 */}
                <div className="bg-white rounded-2xl p-5 shadow-sm mb-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-gray-800">
                      ⚠️ 미이수 필수 과목
                    </h2>
                    <span className="text-[11px] font-bold bg-red-50 text-red-500 px-2.5 py-1 rounded-lg">
                      {missingCourses.length}과목
                    </span>
                  </div>
                  {missingCourses.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400">
                      미이수 필수 과목이 없어요.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {missingCourses.map((c) => (
                        <div
                          key={c.name}
                          className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded">
                              필수
                            </span>
                            <span className="text-sm font-medium text-gray-700">
                              {c.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span>{c.type}</span>
                            <span>{c.credit}학점</span>
                            <span>권장 {c.year}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 현재 수강 중 */}
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-gray-800">
                      📚 현재 수강 중
                    </h2>
                    <span className="text-[11px] font-bold bg-green-50 text-green-700 px-2.5 py-1 rounded-lg">
                      {currentCourses.length}과목
                    </span>
                  </div>
                  {currentCourses.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400">
                      저장된 시간표가 없어요.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {currentCourses.map((c) => (
                        <div
                          key={c.name}
                          className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                              수강중
                            </span>
                            <span className="text-sm font-medium text-gray-700">
                              {c.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span>{c.type}</span>
                            <span>{c.credit}학점</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ═══ 졸업 요건 탭 ═══ */}
            {tab === 'graduation' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-base font-bold text-gray-800 mb-4">
                  🎓 졸업 요건 상세
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <span className="text-sm text-gray-600">총 졸업 학점</span>
                    <span className="text-sm font-bold text-gray-800">
                      {credit.required}학점 이상
                    </span>
                  </div>
                  {cards.map((c) => (
                    <div
                      key={c.label}
                      className="flex items-center justify-between py-3 border-b border-gray-100"
                    >
                      <span className="text-sm text-gray-600">{c.label}</span>
                      <span
                        className={`text-sm font-bold ${
                          c.fulfilled ? 'text-green-700' : 'text-gray-800'
                        }`}
                      >
                        {c.required}학점 이상 ({c.earned} 이수)
                      </span>
                    </div>
                  ))}
                  {graduation.unmetConditions?.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 space-y-1">
                      {graduation.unmetConditions.map((u, i) => (
                        <div key={i} className="text-xs text-red-600">
                          • {u.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══ 이수 과목 탭 ═══ */}
            {tab === 'courses' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-gray-800">
                    📋 전체 이수 과목
                  </h2>
                  <span className="text-xs text-gray-400">
                    총 {credit.earned}학점 이수
                  </span>
                </div>
                {(() => {
                  const completed =
                    pipeline?.analysis?.completedCourses ||
                    profile?.completedCourseNames?.map((name) => ({ name })) ||
                    []
                  if (completed.length === 0) {
                    return (
                      <p className="text-sm text-gray-400 text-center py-12">
                        📄 학점이수표를 업로드하면
                        <br />
                        전체 이수 과목이 여기에 표시됩니다.
                      </p>
                    )
                  }
                  return (
                    <div className="space-y-1.5">
                      {completed.map((c, i) => (
                        <div
                          key={`${c.name || c}-${i}`}
                          className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition"
                        >
                          <span className="text-sm text-gray-700">
                            {c.name || c}
                          </span>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            {c.category && <span>{c.category}</span>}
                            {c.credits != null && <span>{c.credits}학점</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

export default Curriculum
