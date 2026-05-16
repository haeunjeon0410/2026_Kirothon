// ─── AI 추천 과목 목록 (백엔드 연결 시 API 응답으로 교체) ───
export const AVAILABLE_COURSES = [
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
export const AI_RECOMMENDED_IDS = [1, 2, 3, 4, 5]

export const DAYS = ['월', '화', '수', '목', '금']
export const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17]

export const colorMap = {
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
