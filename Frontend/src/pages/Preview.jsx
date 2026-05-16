import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * 시연 영상용 SM:Road 미리보기 (단일 파일)
 *
 * 라우트: /preview  (App.jsx 에서 공개 라우트로 노출)
 *
 * 기능 구현 없이 보여지는 화면만 완성도 있게 만든 파일.
 *   - 슬라이드 전환 (forward/back, 0.35s ease-out)
 *   - 온보딩 카드 440 × 540 통일
 *   - 트리 로드맵 (경영학부 3학년 시나리오) + SVG 엣지
 *   - 대시보드 / 알림 패널 / 마이페이지 모달
 *
 * 색감/폰트는 기존과 동일 (파란 계열, Noto Sans KR).
 * 모든 스타일은 컴포넌트 안 <style> 태그로 self-contained.
 */

// ─── 데이터 ───────────────────────────────────────────────────────────────────

const ROADMAP_NODES = [
  // 1학년
  { id: 'mgmt', name: '경영학원론', col: 0, row: 0, status: 'done' },
  { id: 'acct', name: '회계원리', col: 0, row: 1, status: 'done' },
  { id: 'econ', name: '경제학개론', col: 0, row: 2, status: 'done' },
  { id: 'stat', name: '통계학입문', col: 0, row: 3, status: 'done' },
  // 2학년
  { id: 'mkt', name: '마케팅원론', col: 1, row: 0, status: 'done' },
  { id: 'org', name: '조직행동론', col: 1, row: 1, status: 'done' },
  { id: 'fin', name: '재무관리', col: 1, row: 2, status: 'done' },
  { id: 'micro', name: '미시경제학', col: 1, row: 3, status: 'done' },
  { id: 'cons', name: '소비자경제', col: 1, row: 4, status: 'done' },
  // 3학년 (현재 - 이수중)
  { id: 'da1', name: '경영데이터분석1', col: 2, row: 0, status: 'done', tag: '이수중' },
  { id: 'prod', name: '생산및운영관리', col: 2, row: 1, status: 'done', tag: '이수중' },
  { id: 'intl', name: '국제경영학', col: 2, row: 2, status: 'done', tag: '이수중' },
  { id: 'consstat', name: '소비자통계분석', col: 2, row: 3, status: 'done', tag: '이수중' },
  // 3학년 (예정 - soon)
  { id: 'da2', name: '경영데이터분석2', col: 3, row: 0, status: 'soon' },
  { id: 'strat', name: '경영전략론', col: 3, row: 2, status: 'soon' },
  // 4학년 (잠김 - lock)
  { id: 'cap1', name: '졸업프로젝트Ⅰ', col: 4, row: 0, status: 'lock' },
  { id: 'cap2', name: '졸업프로젝트Ⅱ', col: 4, row: 1, status: 'lock' },
  { id: 'advacct', name: '고급회계', col: 4, row: 2, status: 'lock' },
  { id: 'inv', name: '투자론', col: 4, row: 3, status: 'lock' },
]

const ROADMAP_EDGES = [
  ['mgmt', 'mkt'],
  ['mgmt', 'org'],
  ['acct', 'fin'],
  ['acct', 'advacct'],
  ['econ', 'micro'],
  ['econ', 'cons'],
  ['stat', 'consstat'],
  ['fin', 'da1'],
  ['da1', 'da2'],
  ['da2', 'cap1'],
  ['cap1', 'cap2'],
]

const COL_LABEL = ['1학년', '2학년', '3학년 (현재)', '3학년 (예정)', '4학년']

const TIMETABLE = {
  월: [
    { name: '경영데이터분석2', start: 9, end: 11, color: 'blue', room: '경영관 401' },
    { name: '소비자통계분석', start: 14, end: 15, color: 'cyan', room: '경영관 312' },
  ],
  화: [
    { name: '국제경영학', start: 9, end: 11, color: 'indigo', room: '명신관 215' },
    { name: '경영전략론', start: 13, end: 15, color: 'sky', room: '경영관 503' },
  ],
  수: [
    { name: '경영데이터분석2', start: 9, end: 11, color: 'blue', room: '경영관 401' },
    { name: '소비자통계분석', start: 14, end: 15, color: 'cyan', room: '경영관 312' },
  ],
  목: [{ name: '국제경영학', start: 9, end: 11, color: 'indigo', room: '명신관 215' }],
  금: [
    { name: '경영데이터분석워크숍', start: 11, end: 12, color: 'teal', room: '경영관 410' },
    { name: '경영전략론', start: 13, end: 15, color: 'sky', room: '경영관 503' },
  ],
}

const NOTIFICATIONS = [
  {
    icon: '📚',
    title: '경영전략론 수강 권장 시기',
    body: '3학년 권장 과목이에요. 이번 학기 수강을 놓치면 졸업이 지연될 수 있어요.',
    time: '방금 전',
    unread: true,
  },
  {
    icon: '✦',
    title: 'AI 시간표가 완성됐어요',
    body: '이번 학기 최적 시간표가 생성됐어요. 지금 확인해보세요.',
    time: '5분 전',
    unread: true,
  },
  {
    icon: '⚠️',
    title: '선수과목 미이수 경고',
    body: '졸업프로젝트Ⅰ 수강을 위해 경영데이터분석2 이수가 필요해요.',
    time: '1시간 전',
    unread: false,
  },
  {
    icon: '🗺️',
    title: '로드맵 분석 완료',
    body: '학점이수표 기반 커리큘럼 로드맵이 생성됐어요.',
    time: '어제',
    unread: false,
  },
  {
    icon: '📅',
    title: '2026-1학기 수강신청 안내',
    body: '수강신청 기간이 2주 후 시작돼요. AI 추천 과목을 미리 확인해두세요.',
    time: '3일 전',
    unread: false,
  },
]

const LOADING_STEPS = [
  '학점이수표 분석 중',
  '졸업요건 대조 중',
  '진로 맞춤 과목 매칭 중',
  'AI 로드맵 생성 중',
]

// ─── 메인 컴포넌트 ───────────────────────────────────────────────────────────

export default function Preview() {
  const [screen, setScreen] = useState('login')
  const [prev, setPrev] = useState(null)
  const [direction, setDirection] = useState('forward')

  const go = (next, dir = 'forward') => {
    if (next === screen) return
    setDirection(dir)
    setPrev(screen)
    setScreen(next)
    window.setTimeout(() => setPrev(null), 360)
  }

  const renderScreen = (s) => {
    switch (s) {
      case 'login':
        return <LoginScreen onNext={() => go('basic')} />
      case 'basic':
        return <BasicInfoScreen onBack={() => go('login', 'back')} onNext={() => go('upload')} />
      case 'upload':
        return <UploadScreen onBack={() => go('basic', 'back')} onNext={() => go('career')} />
      case 'career':
        return <CareerScreen onBack={() => go('upload', 'back')} onNext={() => go('loading')} />
      case 'loading':
        return <LoadingScreen onDone={() => go('dashboard')} />
      case 'dashboard':
        return <Dashboard onRestart={() => go('login', 'back')} />
      default:
        return null
    }
  }

  return (
    <div className="pv-root">
      <style>{CSS}</style>
      <div className={`pv-stage pv-${direction}`}>
        {prev && (
          <div className="pv-screen pv-exit" key={`exit-${prev}`}>
            {renderScreen(prev)}
          </div>
        )}
        <div className="pv-screen pv-enter" key={`enter-${screen}`}>
          {renderScreen(screen)}
        </div>
      </div>
    </div>
  )
}

// ─── 1) 로그인 ───────────────────────────────────────────────────────────────

function LoginScreen({ onNext }) {
  return (
    <div className="pv-onboard-wrap">
      <div className="pv-card pv-card-login">
        <div className="pv-logo-mark pv-logo-lg">SM</div>
        <h1 className="pv-brand">SM:Road</h1>
        <p className="pv-tagline">졸업까지 나만의 길을 찾아요</p>
        <p className="pv-subtag">
          AI가 학점이수표를 분석해
          <br />
          최적의 수강 로드맵을 설계해드려요
        </p>

        <button className="pv-google-btn" onClick={onNext}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          구글 계정으로 로그인하기
        </button>

        <div className="pv-login-foot">숙명여대 계정(@sookmyung.ac.kr)만 이용 가능합니다</div>
      </div>
    </div>
  )
}

// ─── 2) 기본 정보 ────────────────────────────────────────────────────────────

function StepBar({ step }) {
  return (
    <div className="pv-stepbar">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`pv-step-dot ${step >= i ? 'on' : ''}`} />
      ))}
    </div>
  )
}

function BasicInfoScreen({ onBack, onNext }) {
  const [major, setMajor] = useState('경영학부')
  const [studentId, setStudentId] = useState('2024XXXX')
  const [year, setYear] = useState('3학년')

  return (
    <div className="pv-onboard-wrap">
      <div className="pv-card pv-card-step">
        <div className="pv-card-head">
          <button className="pv-back" onClick={onBack}>
            ← 뒤로
          </button>
          <StepBar step={1} />
        </div>
        <h2 className="pv-card-title">기본 정보</h2>
        <p className="pv-card-sub">졸업 분석에 필요한 정보예요</p>

        <div className="pv-card-body">
          <div className="pv-field">
            <label>학과</label>
            <select value={major} onChange={(e) => setMajor(e.target.value)}>
              <option>경영학부</option>
              <option>경제학부</option>
              <option>소비자경제학과</option>
              <option>컴퓨터과학전공</option>
              <option>소프트웨어학부</option>
              <option>데이터사이언스학부</option>
              <option>통계학과</option>
            </select>
          </div>

          <div className="pv-field">
            <label>학번</label>
            <input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="20240000"
            />
          </div>

          <div className="pv-field">
            <label>학년</label>
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              <option>1학년</option>
              <option>2학년</option>
              <option>3학년</option>
              <option>4학년</option>
            </select>
          </div>
        </div>

        <button className="pv-primary-btn" onClick={onNext}>
          다음
        </button>
      </div>
    </div>
  )
}

// ─── 3) 학점이수표 업로드 ────────────────────────────────────────────────────

function UploadScreen({ onBack, onNext }) {
  const [file, setFile] = useState(null)
  const [drag, setDrag] = useState(false)

  const handleFile = (f) => {
    if (!f) return
    setFile({ name: f.name, size: f.size })
  }

  return (
    <div className="pv-onboard-wrap">
      <div className="pv-card pv-card-step">
        <div className="pv-card-head">
          <button className="pv-back" onClick={onBack}>
            ← 뒤로
          </button>
          <StepBar step={2} />
        </div>
        <h2 className="pv-card-title">학점이수표 업로드</h2>
        <p className="pv-card-sub">스노우보드에서 PDF로 저장 후 업로드해 주세요</p>

        <div className="pv-card-body">
          <label
            className={`pv-drop ${drag ? 'pv-drop-on' : ''} ${file ? 'pv-drop-filled' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDrag(false)
              handleFile(e.dataTransfer.files?.[0])
            }}
          >
            <input
              type="file"
              accept=".pdf,.xls,.xlsx"
              hidden
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <div className="pv-drop-icon">{file ? '📄' : '⬆'}</div>
            <div className="pv-drop-title">
              {file ? file.name : '파일을 드래그하거나 클릭'}
            </div>
            <div className="pv-drop-sub">
              {file ? '업로드 완료 — 다른 파일로 교체하려면 클릭' : 'PDF · Excel · 최대 10MB'}
            </div>
          </label>

          <div className="pv-tip">
            <span className="pv-tip-icon">💡</span>
            <div>
              <div className="pv-tip-line">스노우보드 → 학적/성적 → 학점이수현황 → PDF 저장</div>
              <div className="pv-tip-line pv-tip-mute">개인정보는 분석 후 즉시 삭제됩니다</div>
            </div>
          </div>
        </div>

        <div className="pv-actions">
          <button className="pv-primary-btn" onClick={onNext}>
            다음
          </button>
          <button className="pv-ghost-btn" onClick={onNext}>
            지금은 건너뛸게요
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 4) 관심 진로 ────────────────────────────────────────────────────────────

function CareerScreen({ onBack, onNext }) {
  const options = [
    { k: 'sec', label: '🔒 보안' },
    { k: 'ai', label: '🤖 AI · ML' },
    { k: 'be', label: '💻 백엔드' },
    { k: 'app', label: '📱 앱 개발' },
    { k: 'cloud', label: '☁️ 클라우드' },
    { k: 'data', label: '📊 데이터 분석' },
    { k: 'fin', label: '💰 금융 · 회계' },
    { k: 'mkt', label: '🛍 마케팅' },
    { k: 'pm', label: '📋 PM · 기획' },
  ]
  const [picked, setPicked] = useState(['data'])
  const toggle = (k) =>
    setPicked((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]))

  return (
    <div className="pv-onboard-wrap">
      <div className="pv-card pv-card-step">
        <div className="pv-card-head">
          <button className="pv-back" onClick={onBack}>
            ← 뒤로
          </button>
          <StepBar step={3} />
        </div>
        <h2 className="pv-card-title">관심 진로</h2>
        <p className="pv-card-sub">진로 기반으로 수강 로드맵을 설계해드려요</p>

        <div className="pv-card-body">
          <div className="pv-chip-grid">
            {options.map((o) => (
              <button
                key={o.k}
                className={`pv-chip ${picked.includes(o.k) ? 'on' : ''}`}
                onClick={() => toggle(o.k)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pv-actions">
          <button className="pv-primary-btn" onClick={onNext}>
            분석 시작하기
          </button>
          <button className="pv-ghost-btn" onClick={onNext}>
            아직 모르겠어요
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 5) 로딩 ────────────────────────────────────────────────────────────────

function LoadingScreen({ onDone }) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const t = window.setInterval(() => {
      setActive((i) => {
        if (i >= LOADING_STEPS.length - 1) {
          window.clearInterval(t)
          window.setTimeout(onDone, 700)
          return i
        }
        return i + 1
      })
    }, 850)
    return () => window.clearInterval(t)
  }, [onDone])

  return (
    <div className="pv-onboard-wrap">
      <div className="pv-card pv-card-loading">
        <div className="pv-loader" />
        <h2 className="pv-card-title pv-center">로드맵을 설계하고 있어요</h2>
        <p className="pv-card-sub pv-center">잠깐만 기다려주세요</p>

        <div className="pv-loading-steps">
          {LOADING_STEPS.map((label, i) => (
            <div
              key={label}
              className={`pv-lstep ${i < active ? 'done' : ''} ${i === active ? 'active' : ''}`}
            >
              <span className="pv-lstep-dot">
                {i < active ? '✓' : i === active ? '' : ''}
              </span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── 6) 대시보드 ────────────────────────────────────────────────────────────

function Dashboard({ onRestart }) {
  const [showNoti, setShowNoti] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showMyPage, setShowMyPage] = useState(false)

  // 외부 클릭 닫기
  const notiRef = useRef(null)
  const menuRef = useRef(null)
  useEffect(() => {
    const onClick = (e) => {
      if (notiRef.current && !notiRef.current.contains(e.target)) setShowNoti(false)
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div className="pv-dash">
      {/* Topbar */}
      <header className="pv-top">
        <div className="pv-top-left">
          <div className="pv-logo-mark">SM</div>
          <div>
            <div className="pv-brand-sm">SM:Road</div>
            <div className="pv-brand-cap">숙명여자대학교 수강 설계 플랫폼</div>
          </div>
        </div>

        <div className="pv-top-right">
          <span className="pv-sem-pill">2026 — 1학기</span>

          <div className="pv-pop-anchor" ref={notiRef}>
            <button
              className="pv-icon-btn"
              onClick={() => setShowNoti((v) => !v)}
              aria-label="알림"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 22a2.4 2.4 0 0 0 2.4-2.4H9.6A2.4 2.4 0 0 0 12 22zm6-6V11a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="pv-noti-badge">{NOTIFICATIONS.filter((n) => n.unread).length}</span>
            </button>

            {showNoti && (
              <div className="pv-pop">
                <div className="pv-pop-head">
                  <span>알림</span>
                  <button className="pv-pop-link">모두 읽음</button>
                </div>
                <div className="pv-noti-list">
                  {NOTIFICATIONS.map((n, i) => (
                    <div key={i} className={`pv-noti-item ${n.unread ? 'unread' : ''}`}>
                      <div className="pv-noti-icon">{n.icon}</div>
                      <div className="pv-noti-body">
                        <div className="pv-noti-title">{n.title}</div>
                        <div className="pv-noti-text">{n.body}</div>
                        <div className="pv-noti-time">{n.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pv-pop-anchor" ref={menuRef}>
            <button className="pv-avatar" onClick={() => setShowMenu((v) => !v)}>
              윤
            </button>
            {showMenu && (
              <div className="pv-pop pv-pop-menu">
                <div className="pv-menu-head">
                  <div className="pv-avatar-lg">윤</div>
                  <div>
                    <div className="pv-menu-name">윤아현</div>
                    <div className="pv-menu-mail">yoonahyeon@sookmyung.ac.kr</div>
                  </div>
                </div>
                <button
                  className="pv-menu-item"
                  onClick={() => {
                    setShowMenu(false)
                    setShowMyPage(true)
                  }}
                >
                  👤 마이페이지
                </button>
                <button className="pv-menu-item">⚙ 설정</button>
                <div className="pv-menu-sep" />
                <button className="pv-menu-item pv-menu-danger" onClick={onRestart}>
                  ↦ 로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Welcome */}
      <section className="pv-welcome">
        <div>
          <h1 className="pv-welcome-title">안녕하세요, 윤아현님 👋</h1>
          <p className="pv-welcome-sub">
            경영학부 · 3학년 · 복수전공 (소비자경제학과) · 진로: 데이터 분석가
          </p>
        </div>
        <div className="pv-welcome-deco">🎓</div>
      </section>

      {/* Stats */}
      <section className="pv-stats">
        <div className="pv-stat pv-stat-credit">
          <CreditDonut earned={89} total={130} />
          <div className="pv-stat-meta">
            <div className="pv-stat-label">취득 학점</div>
            <div className="pv-stat-big">89학점</div>
            <div className="pv-stat-foot">41학점 남았어요</div>
          </div>
        </div>

        <div className="pv-stat">
          <div className="pv-stat-label">이번 학기 수강</div>
          <div className="pv-stat-big">15학점</div>
          <div className="pv-stat-foot">5과목 · 권장 15–18학점</div>
        </div>

        <div className="pv-stat">
          <div className="pv-stat-label">졸업 예상</div>
          <div className="pv-stat-big">2027-1</div>
          <div className="pv-stat-foot">3학기 후 졸업 가능</div>
        </div>
      </section>

      {/* Roadmap + Timetable */}
      <section className="pv-grid-2">
        <RoadmapCard />
        <TimetableCard />
      </section>

      {showMyPage && <MyPageModal onClose={() => setShowMyPage(false)} />}
    </div>
  )
}

// ─── 도넛 ───────────────────────────────────────────────────────────────────

function CreditDonut({ earned, total }) {
  const r = 36
  const c = 2 * Math.PI * r
  const pct = Math.min(1, earned / total)
  const dash = c * pct
  return (
    <svg width="92" height="92" viewBox="0 0 92 92">
      <circle cx="46" cy="46" r={r} fill="none" stroke="#e6eefb" strokeWidth="11" />
      <circle
        cx="46"
        cy="46"
        r={r}
        fill="none"
        stroke="url(#pv-grad)"
        strokeWidth="11"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform="rotate(-90 46 46)"
      />
      <defs>
        <linearGradient id="pv-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <text
        x="46"
        y="42"
        textAnchor="middle"
        fontSize="18"
        fontWeight="800"
        fill="#1e3a8a"
      >
        {earned}
      </text>
      <text x="46" y="60" textAnchor="middle" fontSize="11" fill="#94a3b8">
        / {total}
      </text>
    </svg>
  )
}

// ─── 로드맵 카드 ────────────────────────────────────────────────────────────

function RoadmapCard() {
  // 좌표 계산
  const colX = (col) => 30 + col * 145
  const rowY = (row) => 35 + row * 65
  const W = 760
  const H = 380

  const byId = useMemo(() => {
    const m = new Map()
    ROADMAP_NODES.forEach((n) => m.set(n.id, n))
    return m
  }, [])

  const edgePath = (s, t) => {
    const sx = colX(s.col) + 110
    const sy = rowY(s.row) + 15
    const ex = colX(t.col)
    const ey = rowY(t.row) + 15
    const dx = Math.max(40, (ex - sx) / 2)
    return `M ${sx},${sy} C ${sx + dx},${sy} ${ex - dx},${ey} ${ex},${ey}`
  }

  return (
    <div className="pv-card-flat">
      <div className="pv-card-flat-head">
        <div>
          <div className="pv-section-title">커리큘럼 로드맵</div>
          <div className="pv-section-sub">선수과목 기반 · 경영학부 / 복수전공 소비자경제학과</div>
        </div>
        <div className="pv-legend">
          <span className="pv-leg pv-leg-done">이수</span>
          <span className="pv-leg pv-leg-current">이수중</span>
          <span className="pv-leg pv-leg-soon">예정</span>
          <span className="pv-leg pv-leg-lock">잠김</span>
        </div>
      </div>

      <div className="pv-tree-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="pv-tree-svg" preserveAspectRatio="xMidYMid meet">
          {/* 컬럼 헤더 */}
          {COL_LABEL.map((label, i) => (
            <g key={label}>
              <rect
                x={colX(i) - 6}
                y={6}
                width={122}
                height={20}
                rx={10}
                fill={i === 2 ? '#dbeafe' : '#eef2f7'}
              />
              <text
                x={colX(i) + 55}
                y={20}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill={i === 2 ? '#1d4ed8' : '#64748b'}
              >
                {label}
              </text>
            </g>
          ))}

          {/* 엣지 */}
          {ROADMAP_EDGES.map(([sId, tId], i) => {
            const s = byId.get(sId)
            const t = byId.get(tId)
            if (!s || !t) return null
            const lock = t.status === 'lock'
            const soon = t.status === 'soon'
            const stroke = lock ? '#cbd5e1' : soon ? '#93c5fd' : '#3b82f6'
            return (
              <path
                key={i}
                d={edgePath(s, t)}
                fill="none"
                stroke={stroke}
                strokeWidth={lock ? 1.2 : 1.6}
                strokeDasharray={lock || soon ? '4 4' : 'none'}
                opacity={lock ? 0.55 : 0.85}
              />
            )
          })}

          {/* 노드 */}
          {ROADMAP_NODES.map((n) => {
            const x = colX(n.col)
            const y = rowY(n.row)
            const cls = `pv-node pv-node-${n.status}`
            return (
              <g key={n.id} transform={`translate(${x}, ${y})`} className={cls}>
                <rect
                  width={110}
                  height={30}
                  rx={8}
                  className="pv-node-bg"
                />
                <foreignObject x="0" y="0" width="110" height="30">
                  <div className="pv-node-fo">
                    <span className="pv-node-name" title={n.name}>
                      {n.name}
                    </span>
                    {n.tag && <span className="pv-node-tag">{n.tag}</span>}
                    {n.status === 'lock' && <span className="pv-node-lock">🔒</span>}
                  </div>
                </foreignObject>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// ─── 시간표 카드 ────────────────────────────────────────────────────────────

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16]
const DAYS = ['월', '화', '수', '목', '금']

function TimetableCard() {
  const [drag, setDrag] = useState(null)

  // 그리드 셀에서 강의 블록 찾기
  const blockAt = (day, hour) => {
    const lessons = TIMETABLE[day] || []
    return lessons.find((l) => hour >= l.start && hour < l.end)
  }

  const isStart = (day, hour) => {
    const lessons = TIMETABLE[day] || []
    return lessons.find((l) => l.start === hour)
  }

  return (
    <div className="pv-card-flat">
      <div className="pv-card-flat-head">
        <div>
          <div className="pv-section-title">AI 추천 시간표</div>
          <div className="pv-section-sub">2026 — 1학기 · 5과목 15학점 · 금요일 오전 공강</div>
        </div>
        <span className="pv-ai-pill">✦ AI 생성 완료</span>
      </div>

      <div className="pv-tt">
        <div className="pv-tt-head">
          <div className="pv-tt-time-h" />
          {DAYS.map((d) => (
            <div key={d} className="pv-tt-day-h">
              {d}
            </div>
          ))}
        </div>
        <div className="pv-tt-body">
          {HOURS.map((h) => (
            <div key={h} className="pv-tt-row">
              <div className="pv-tt-time">{h}:00</div>
              {DAYS.map((d) => {
                const block = blockAt(d, h)
                const start = isStart(d, h)
                if (start) {
                  const span = start.end - start.start
                  return (
                    <div
                      key={d + h}
                      className={`pv-tt-cell pv-tt-block pv-tt-${start.color}`}
                      style={{ gridRow: `span ${span}` }}
                      draggable
                      onDragStart={() => setDrag({ name: start.name, day: d, hour: h })}
                      onDragEnd={() => setDrag(null)}
                    >
                      <div className="pv-tt-name">{start.name}</div>
                      <div className="pv-tt-room">{start.room}</div>
                      <div className="pv-tt-time-range">
                        {start.start}:00 — {start.end}:00
                      </div>
                    </div>
                  )
                }
                if (block) return null // span 으로 채워짐
                return (
                  <div
                    key={d + h}
                    className="pv-tt-cell pv-tt-empty"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => setDrag(null)}
                  />
                )
              })}
            </div>
          ))}
        </div>
        {drag && <div className="pv-tt-ghost">{drag.name} 이동 중…</div>}
      </div>
    </div>
  )
}

// ─── 마이페이지 모달 ────────────────────────────────────────────────────────

function MyPageModal({ onClose }) {
  return (
    <div className="pv-modal-back" onClick={onClose}>
      <div className="pv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pv-modal-head">
          <div className="pv-modal-user">
            <div className="pv-avatar-xl">윤</div>
            <div>
              <div className="pv-modal-name">윤아현</div>
              <div className="pv-modal-mail">yoonahyeon@sookmyung.ac.kr</div>
            </div>
          </div>
          <button className="pv-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="pv-modal-body">
          <div className="pv-field">
            <label>학과</label>
            <select defaultValue="경영학부">
              <option>경영학부</option>
              <option>경제학부</option>
              <option>소비자경제학과</option>
            </select>
          </div>

          <div className="pv-field">
            <label>복수전공</label>
            <select defaultValue="소비자경제학과">
              <option>소비자경제학과</option>
              <option>경제학부</option>
              <option>없음</option>
            </select>
          </div>

          <div className="pv-2col">
            <div className="pv-field">
              <label>학번</label>
              <input defaultValue="2024XXXX" />
            </div>
            <div className="pv-field">
              <label>학년</label>
              <select defaultValue="3학년">
                <option>1학년</option>
                <option>2학년</option>
                <option>3학년</option>
                <option>4학년</option>
              </select>
            </div>
          </div>

          <div className="pv-field">
            <label>관심 진로</label>
            <select defaultValue="데이터 분석">
              <option>데이터 분석</option>
              <option>금융 · 회계</option>
              <option>마케팅</option>
              <option>PM · 기획</option>
            </select>
          </div>

          <div className="pv-field">
            <label>학점이수표</label>
            <div className="pv-file-row">
              <span className="pv-file-name">📄 학점이수표_2026_1.pdf</span>
              <button className="pv-file-btn">재업로드</button>
            </div>
          </div>
        </div>

        <div className="pv-modal-foot">
          <button className="pv-ghost-btn pv-modal-cancel" onClick={onClose}>
            취소
          </button>
          <button className="pv-primary-btn pv-modal-save" onClick={onClose}>
            저장하고 재분석
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 스타일 ─────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;800&display=swap');

.pv-root {
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg, #f0f6ff 0%, #f8fbff 50%, #eef4fb 100%);
  font-family: 'Noto Sans KR', system-ui, -apple-system, sans-serif;
  color: #0f172a;
  overflow: hidden;
}

/* ─── stage / slide animation ───────────────────────────── */
.pv-stage {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.pv-screen {
  position: absolute;
  inset: 0;
  animation-duration: 0.35s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  will-change: transform, opacity;
}
.pv-forward .pv-enter { animation-name: pvEnterFromRight; }
.pv-forward .pv-exit  { animation-name: pvExitToLeft; }
.pv-back    .pv-enter { animation-name: pvEnterFromLeft; }
.pv-back    .pv-exit  { animation-name: pvExitToRight; }

@keyframes pvEnterFromRight { from { transform: translateX(60px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes pvExitToLeft     { from { transform: translateX(0);    opacity: 1; } to { transform: translateX(-60px); opacity: 0; } }
@keyframes pvEnterFromLeft  { from { transform: translateX(-60px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes pvExitToRight    { from { transform: translateX(0);    opacity: 1; } to { transform: translateX(60px); opacity: 0; } }

/* ─── 온보딩 카드 (440 × 540 통일) ────────────────────────── */
.pv-onboard-wrap {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pv-card {
  width: 440px;
  height: 540px;
  background: #fff;
  border-radius: 24px;
  padding: 36px;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08), 0 4px 12px rgba(15, 23, 42, 0.04);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}
.pv-card-login {
  align-items: center;
  text-align: center;
  justify-content: center;
}
.pv-card-step .pv-card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 18px;
}
.pv-card-loading {
  align-items: center;
  text-align: center;
  justify-content: center;
}

.pv-logo-mark {
  width: 44px; height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #3b82f6, #06b6d4);
  color: #fff;
  font-weight: 800;
  font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  letter-spacing: 0.5px;
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.35);
}
.pv-logo-lg { width: 56px; height: 56px; font-size: 16px; border-radius: 16px; }

.pv-brand {
  font-size: 28px;
  font-weight: 800;
  color: #1e3a8a;
  margin: 18px 0 4px;
  letter-spacing: -0.5px;
}
.pv-tagline { font-size: 14px; color: #475569; margin: 0 0 6px; font-weight: 500; }
.pv-subtag  { font-size: 12px; color: #94a3b8; margin: 0 0 28px; line-height: 1.6; }

.pv-google-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 13px 18px;
  border-radius: 14px;
  border: 1.5px solid #e2e8f0;
  background: #fff;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s ease;
}
.pv-google-btn:hover { border-color: #3b82f6; box-shadow: 0 6px 16px rgba(59, 130, 246, 0.15); }
.pv-login-foot { font-size: 11px; color: #cbd5e1; margin-top: 18px; }

/* ─── 카드 헤더 / 스텝 ────────────────────────────────────── */
.pv-card-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 18px;
}
.pv-back {
  background: none; border: none;
  color: #94a3b8;
  font-size: 13px; font-weight: 500;
  cursor: pointer;
  padding: 4px 0;
}
.pv-back:hover { color: #3b82f6; }

.pv-stepbar { display: flex; gap: 6px; }
.pv-step-dot { width: 22px; height: 4px; border-radius: 2px; background: #e2e8f0; transition: 0.3s; }
.pv-step-dot.on { background: linear-gradient(90deg, #3b82f6, #06b6d4); }

.pv-card-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.3px; }
.pv-card-sub   { font-size: 13px; color: #94a3b8; margin: 4px 0 0; }
.pv-center { text-align: center; }

/* ─── 폼 필드 ─────────────────────────────────────────────── */
.pv-field { display: flex; flex-direction: column; gap: 6px; }
.pv-field label {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.pv-field select, .pv-field input {
  padding: 11px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  font-size: 14px;
  font-family: inherit;
  color: #0f172a;
  outline: none;
  transition: 0.15s;
}
.pv-field select:focus, .pv-field input:focus {
  border-color: #3b82f6;
  background: #fff;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
}
.pv-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

/* ─── 버튼 ────────────────────────────────────────────────── */
.pv-primary-btn {
  width: 100%;
  padding: 14px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, #3b82f6, #06b6d4);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.15s;
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
}
.pv-primary-btn:hover { transform: translateY(-1px); box-shadow: 0 12px 28px rgba(59, 130, 246, 0.4); }
.pv-ghost-btn {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1.5px solid transparent;
  background: transparent;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: 0.15s;
}
.pv-ghost-btn:hover { color: #475569; background: #f1f5f9; }
.pv-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }

/* ─── 업로드 ──────────────────────────────────────────────── */
.pv-drop {
  flex: 1;
  border: 2px dashed #cbd5e1;
  border-radius: 16px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  cursor: pointer;
  transition: 0.2s;
  text-align: center;
}
.pv-drop:hover { border-color: #3b82f6; background: #eff6ff; }
.pv-drop-on   { border-color: #3b82f6; background: #dbeafe; }
.pv-drop-filled { border-style: solid; border-color: #3b82f6; background: #eff6ff; }
.pv-drop-icon  { font-size: 32px; }
.pv-drop-title { font-size: 14px; font-weight: 700; color: #1e293b; }
.pv-drop-sub   { font-size: 11px; color: #94a3b8; }

.pv-tip {
  display: flex; gap: 10px;
  background: #eff6ff;
  border: 1px solid #dbeafe;
  border-radius: 12px;
  padding: 12px 14px;
}
.pv-tip-icon { font-size: 16px; }
.pv-tip-line { font-size: 12px; color: #1e3a8a; line-height: 1.6; font-weight: 500; }
.pv-tip-mute { color: #64748b; font-weight: 400; margin-top: 2px; }

/* ─── chip ────────────────────────────────────────────────── */
.pv-chip-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  align-content: start;
}
.pv-chip {
  padding: 14px 8px;
  border-radius: 14px;
  border: 1.5px solid #e2e8f0;
  background: #fff;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: 0.15s;
}
.pv-chip:hover { border-color: #3b82f6; color: #1e3a8a; }
.pv-chip.on {
  border-color: #3b82f6;
  background: linear-gradient(135deg, #eff6ff, #cffafe);
  color: #1e3a8a;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

/* ─── 로딩 ────────────────────────────────────────────────── */
.pv-loader {
  width: 60px; height: 60px;
  border-radius: 50%;
  border: 4px solid #e2e8f0;
  border-top-color: #3b82f6;
  animation: pv-spin 0.8s linear infinite;
  margin-bottom: 22px;
}
@keyframes pv-spin { to { transform: rotate(360deg); } }
.pv-loading-steps {
  width: 100%;
  display: flex; flex-direction: column;
  gap: 10px; margin-top: 28px;
}
.pv-lstep {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: #f8fafc;
  font-size: 12px; color: #94a3b8;
  font-weight: 500;
  transition: 0.3s;
}
.pv-lstep.active {
  background: #eff6ff;
  color: #1e3a8a;
  font-weight: 700;
  box-shadow: 0 0 0 1px #dbeafe inset;
}
.pv-lstep.done { color: #1e3a8a; }
.pv-lstep-dot {
  width: 18px; height: 18px;
  border-radius: 50%;
  background: #e2e8f0;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; color: #fff; font-weight: 700;
  flex-shrink: 0;
}
.pv-lstep.done .pv-lstep-dot { background: #3b82f6; }
.pv-lstep.active .pv-lstep-dot { background: #06b6d4; animation: pv-pulse 1s infinite; }
@keyframes pv-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.2); } }

/* ─── 대시보드 ────────────────────────────────────────────── */
.pv-dash {
  height: 100%;
  overflow-y: auto;
  padding: 20px 28px 60px;
}

.pv-top {
  display: flex; align-items: center; justify-content: space-between;
  background: #fff;
  border-radius: 18px;
  padding: 12px 20px;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);
  margin-bottom: 20px;
}
.pv-top-left { display: flex; align-items: center; gap: 12px; }
.pv-brand-sm { font-size: 16px; font-weight: 800; color: #1e3a8a; letter-spacing: -0.3px; }
.pv-brand-cap { font-size: 11px; color: #94a3b8; margin-top: 1px; }
.pv-top-right { display: flex; align-items: center; gap: 12px; }

.pv-sem-pill {
  font-size: 12px; font-weight: 600;
  color: #1e3a8a;
  background: linear-gradient(135deg, #dbeafe, #cffafe);
  padding: 6px 12px; border-radius: 999px;
}

.pv-icon-btn {
  position: relative;
  width: 38px; height: 38px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: 0.15s;
}
.pv-icon-btn:hover { border-color: #3b82f6; color: #3b82f6; }
.pv-noti-badge {
  position: absolute;
  top: -3px; right: -3px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  width: 16px; height: 16px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid #fff;
}

.pv-avatar {
  width: 38px; height: 38px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #3b82f6, #06b6d4);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: 0.15s;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}
.pv-avatar:hover { transform: scale(1.05); }
.pv-avatar-lg {
  width: 46px; height: 46px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #06b6d4);
  color: #fff; font-weight: 700; font-size: 18px;
  display: flex; align-items: center; justify-content: center;
}
.pv-avatar-xl {
  width: 56px; height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #06b6d4);
  color: #fff; font-weight: 700; font-size: 20px;
  display: flex; align-items: center; justify-content: center;
}

/* ─── 팝오버 ──────────────────────────────────────────────── */
.pv-pop-anchor { position: relative; }
.pv-pop {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 340px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.14), 0 4px 12px rgba(15, 23, 42, 0.06);
  z-index: 30;
  overflow: hidden;
  animation: pv-pop 0.18s ease-out;
}
@keyframes pv-pop { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
.pv-pop-head {
  padding: 14px 18px;
  display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid #f1f5f9;
  font-weight: 700; font-size: 13px; color: #1e293b;
}
.pv-pop-link { background: none; border: none; color: #3b82f6; font-size: 12px; font-weight: 600; cursor: pointer; }
.pv-noti-list { max-height: 380px; overflow-y: auto; }
.pv-noti-item {
  display: flex; gap: 10px;
  padding: 12px 18px;
  border-bottom: 1px solid #f8fafc;
  cursor: pointer;
  transition: 0.1s;
}
.pv-noti-item:hover { background: #f8fafc; }
.pv-noti-item.unread { background: #eff6ff; }
.pv-noti-item.unread:hover { background: #dbeafe; }
.pv-noti-icon {
  width: 32px; height: 32px;
  border-radius: 10px;
  background: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  border: 1px solid #e2e8f0;
}
.pv-noti-body { flex: 1; min-width: 0; }
.pv-noti-title { font-size: 12px; font-weight: 700; color: #0f172a; }
.pv-noti-text  { font-size: 11px; color: #64748b; margin-top: 2px; line-height: 1.5; }
.pv-noti-time  { font-size: 10px; color: #cbd5e1; margin-top: 4px; }

.pv-pop-menu { width: 260px; padding: 6px; }
.pv-menu-head {
  display: flex; align-items: center; gap: 10px;
  padding: 12px;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 4px;
}
.pv-menu-name { font-size: 13px; font-weight: 700; color: #0f172a; }
.pv-menu-mail { font-size: 10px; color: #94a3b8; margin-top: 1px; }
.pv-menu-item {
  display: block; width: 100%;
  background: none; border: none;
  text-align: left;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: #475569;
  cursor: pointer;
  transition: 0.1s;
}
.pv-menu-item:hover { background: #f1f5f9; color: #1e293b; }
.pv-menu-danger { color: #ef4444; }
.pv-menu-danger:hover { background: #fef2f2; color: #dc2626; }
.pv-menu-sep { height: 1px; background: #f1f5f9; margin: 4px 0; }

/* ─── 환영 배너 ───────────────────────────────────────────── */
.pv-welcome {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #06b6d4 100%);
  color: #fff;
  border-radius: 22px;
  padding: 24px 30px;
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 18px;
  box-shadow: 0 12px 32px rgba(59, 130, 246, 0.25);
}
.pv-welcome-title { font-size: 20px; font-weight: 800; margin: 0 0 4px; letter-spacing: -0.3px; }
.pv-welcome-sub   { font-size: 13px; opacity: 0.92; margin: 0; }
.pv-welcome-deco  { font-size: 48px; opacity: 0.8; }

/* ─── 통계 ────────────────────────────────────────────────── */
.pv-stats { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 14px; margin-bottom: 18px; }
.pv-stat {
  background: #fff;
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
}
.pv-stat-credit { display: flex; align-items: center; gap: 18px; }
.pv-stat-meta { flex: 1; }
.pv-stat-label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
.pv-stat-big   { font-size: 26px; font-weight: 800; color: #0f172a; margin: 6px 0 4px; letter-spacing: -0.5px; }
.pv-stat-foot  { font-size: 11px; color: #64748b; }

/* ─── 2열 그리드 ──────────────────────────────────────────── */
.pv-grid-2 { display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; }
.pv-card-flat {
  background: #fff;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
}
.pv-card-flat-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 16px;
}
.pv-section-title { font-size: 14px; font-weight: 800; color: #0f172a; }
.pv-section-sub   { font-size: 11px; color: #94a3b8; margin-top: 3px; }

.pv-legend { display: flex; gap: 8px; flex-wrap: wrap; }
.pv-leg {
  font-size: 10px; font-weight: 600;
  padding: 4px 8px; border-radius: 999px;
  border: 1px solid;
}
.pv-leg-done    { color: #1e3a8a; border-color: #3b82f6; background: #eff6ff; }
.pv-leg-current { color: #1e3a8a; border-color: #1d4ed8; background: #dbeafe; }
.pv-leg-soon    { color: #1e40af; border-color: #93c5fd; background: #eff6ff; border-style: dashed; }
.pv-leg-lock    { color: #64748b; border-color: #cbd5e1; background: #f8fafc; }

.pv-ai-pill {
  font-size: 11px; font-weight: 700;
  color: #1e3a8a;
  background: linear-gradient(135deg, #dbeafe, #cffafe);
  padding: 5px 11px; border-radius: 999px;
  border: 1px solid #bfdbfe;
}

/* ─── 트리 로드맵 ─────────────────────────────────────────── */
.pv-tree-wrap {
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
  border-radius: 14px;
  padding: 6px;
  border: 1px solid #f1f5f9;
}
.pv-tree-svg { width: 100%; height: auto; max-height: 380px; display: block; }

.pv-node-bg { fill: #fff; stroke: #cbd5e1; stroke-width: 1; }
.pv-node-done .pv-node-bg    { fill: #eff6ff; stroke: #3b82f6; stroke-width: 1.5; }
.pv-node-soon .pv-node-bg    { fill: #fff;     stroke: #93c5fd; stroke-width: 1.5; stroke-dasharray: 4 3; }
.pv-node-lock .pv-node-bg    { fill: #f8fafc; stroke: #cbd5e1; stroke-width: 1; }

.pv-node-fo {
  width: 110px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  gap: 4px;
  padding: 0 8px;
  font-family: 'Noto Sans KR', sans-serif;
  box-sizing: border-box;
}
.pv-node-name {
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 78px;
}
.pv-node-done .pv-node-name { color: #1e3a8a; }
.pv-node-soon .pv-node-name { color: #1d4ed8; }
.pv-node-lock .pv-node-name { color: #94a3b8; }
.pv-node-tag {
  font-size: 8px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 6px;
  background: #1d4ed8;
  color: #fff;
  flex-shrink: 0;
}
.pv-node-soon .pv-node-tag { background: #93c5fd; }
.pv-node-lock { opacity: 0.85; }
.pv-node-lock .pv-node-lock { font-size: 11px; }

/* ─── 시간표 ─────────────────────────────────────────────── */
.pv-tt {
  position: relative;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
  overflow: hidden;
}
.pv-tt-head {
  display: grid;
  grid-template-columns: 36px repeat(5, 1fr);
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}
.pv-tt-time-h, .pv-tt-day-h {
  padding: 8px 0;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: #475569;
}
.pv-tt-day-h { color: #1e3a8a; }

.pv-tt-body {
  display: grid;
  grid-template-columns: 36px repeat(5, 1fr);
  grid-auto-rows: 38px;
}
.pv-tt-row { display: contents; }
.pv-tt-time {
  font-size: 9px;
  color: #cbd5e1;
  text-align: center;
  display: flex; align-items: flex-start; justify-content: center;
  padding-top: 3px;
  border-right: 1px solid #f1f5f9;
}
.pv-tt-cell {
  border-right: 1px solid #f1f5f9;
  border-bottom: 1px solid #f8fafc;
  position: relative;
}
.pv-tt-cell:last-child { border-right: none; }
.pv-tt-empty { background: #fff; }
.pv-tt-empty:hover { background: #f8fafc; }

.pv-tt-block {
  padding: 6px 8px;
  margin: 1px;
  border-radius: 8px;
  cursor: grab;
  display: flex; flex-direction: column; justify-content: center;
  border-left: 3px solid;
  font-family: 'Noto Sans KR', sans-serif;
  user-select: none;
  transition: transform 0.1s;
}
.pv-tt-block:active { cursor: grabbing; transform: scale(0.98); }
.pv-tt-name { font-size: 11px; font-weight: 700; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pv-tt-room { font-size: 9px; opacity: 0.7; margin-top: 1px; }
.pv-tt-time-range { font-size: 9px; opacity: 0.6; margin-top: 2px; }

.pv-tt-blue   { background: #dbeafe; color: #1e3a8a; border-left-color: #3b82f6; }
.pv-tt-cyan   { background: #cffafe; color: #155e75; border-left-color: #06b6d4; }
.pv-tt-indigo { background: #e0e7ff; color: #3730a3; border-left-color: #6366f1; }
.pv-tt-sky    { background: #e0f2fe; color: #075985; border-left-color: #0ea5e9; }
.pv-tt-teal   { background: #ccfbf1; color: #115e59; border-left-color: #14b8a6; }

.pv-tt-ghost {
  position: absolute; bottom: 8px; right: 12px;
  background: #1e3a8a; color: #fff;
  font-size: 10px; padding: 4px 10px;
  border-radius: 999px;
  box-shadow: 0 4px 12px rgba(30, 58, 138, 0.3);
}

/* ─── 마이페이지 모달 ─────────────────────────────────────── */
.pv-modal-back {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
  animation: pv-fade 0.2s ease-out;
}
@keyframes pv-fade { from { opacity: 0; } to { opacity: 1; } }
.pv-modal {
  width: 480px;
  max-height: 88vh;
  background: #fff;
  border-radius: 22px;
  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.25);
  display: flex; flex-direction: column;
  overflow: hidden;
  animation: pv-pop 0.22s ease-out;
}
.pv-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
}
.pv-modal-user { display: flex; align-items: center; gap: 14px; }
.pv-modal-name { font-size: 15px; font-weight: 700; color: #0f172a; }
.pv-modal-mail { font-size: 11px; color: #94a3b8; margin-top: 2px; }
.pv-modal-close {
  width: 30px; height: 30px;
  border-radius: 10px;
  border: none;
  background: #f1f5f9;
  color: #64748b;
  cursor: pointer;
  font-size: 13px;
}
.pv-modal-close:hover { background: #e2e8f0; color: #0f172a; }

.pv-modal-body {
  padding: 22px 24px;
  display: flex; flex-direction: column; gap: 16px;
  overflow-y: auto;
}
.pv-file-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
}
.pv-file-name { font-size: 13px; color: #1e293b; font-weight: 500; }
.pv-file-btn {
  font-size: 11px; font-weight: 700;
  color: #3b82f6;
  background: transparent;
  border: 1px solid #3b82f6;
  padding: 5px 10px;
  border-radius: 8px;
  cursor: pointer;
}
.pv-file-btn:hover { background: #eff6ff; }

.pv-modal-foot {
  display: flex; gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid #f1f5f9;
  background: #fafbfc;
}
.pv-modal-cancel { width: 30%; }
.pv-modal-save { width: 70%; margin: 0; }
`
