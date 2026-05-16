import { useState, useEffect, useCallback } from 'react'
import {
  getProfile,
  getGraduationStatus,
  getLatestTimetable,
  getLatestRoadmap,
  generateRoadmap,
  uploadTranscript as apiUploadTranscript,
} from '../api'
import { useUser } from '../context/UserContext'

/**
 * Home/Curriculum/Timetable 화면이 공유하는 데이터 훅.
 *
 * - 한 번에 profile / graduation / timetable / roadmap 을 병렬 로드
 * - 어떤 항목이 실패해도 나머지는 살아남도록 Promise.allSettled 사용
 * - userId = UserContext.user.id (이메일)
 * - 학점이수표 업로드 후 졸업 분석을 다시 받을 수 있도록 refresh / uploadTranscript 노출
 */
export function useHomeData() {
  const { user, updateUser } = useUser()
  const userId = user?.id || user?.email || null

  const [profile, setProfile] = useState(null)
  const [graduation, setGraduation] = useState(null)
  const [timetable, setTimetable] = useState(null)
  const [roadmap, setRoadmap] = useState(null)
  const [pipeline, setPipeline] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const buildGraduationParams = useCallback(
    (override = {}) => {
      const params = {}
      if (user?.major) params.department = user.major
      if (user?.year) params.year = user.year
      if (user?.track) params.track = user.track
      // completedCourseNames 는 콤마 구분 문자열 (백엔드가 split 해서 사용)
      const completed = override.completedCourseNames || profile?.completedCourseNames
      if (Array.isArray(completed) && completed.length > 0) {
        params.completedCourseNames = completed.join(',')
      }
      return { ...params, ...override }
    },
    [user, profile]
  )

  const fetchAll = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [profileRes, graduationRes, timetableRes, roadmapRes] =
        await Promise.allSettled([
          getProfile(userId),
          getGraduationStatus(userId, buildGraduationParams()),
          getLatestTimetable(userId),
          getLatestRoadmap(userId),
        ])

      setProfile(profileRes.status === 'fulfilled' ? profileRes.value : null)
      setGraduation(graduationRes.status === 'fulfilled' ? graduationRes.value : null)
      setTimetable(timetableRes.status === 'fulfilled' ? timetableRes.value : null)
      setRoadmap(roadmapRes.status === 'fulfilled' ? roadmapRes.value : null)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [userId, buildGraduationParams])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!userId) {
        setLoading(false)
        return
      }
      try {
        const profileRes = await getProfile(userId).catch(() => null)
        if (cancelled) return
        if (profileRes) setProfile(profileRes)

        // profile 받은 뒤 completedCourseNames 까지 포함한 졸업 상태 호출
        const completed = profileRes?.completedCourseNames || []
        const params = {}
        if (user?.major) params.department = user.major
        if (user?.year) params.year = user.year
        if (user?.track) params.track = user.track
        if (completed.length > 0) params.completedCourseNames = completed.join(',')

        const [graduationRes, timetableRes, roadmapRes] = await Promise.allSettled([
          getGraduationStatus(userId, params),
          getLatestTimetable(userId),
          getLatestRoadmap(userId),
        ])
        if (cancelled) return

        setGraduation(graduationRes.status === 'fulfilled' ? graduationRes.value : null)
        setTimetable(timetableRes.status === 'fulfilled' ? timetableRes.value : null)
        setRoadmap(roadmapRes.status === 'fulfilled' ? roadmapRes.value : null)
      } catch (err) {
        if (!cancelled) setError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId, user?.major, user?.year, user?.track])

  /**
   * 학점이수표 업로드 + 즉시 분석 결과 반영
   *
   * 백엔드 응답 구조 (axios 인터셉터에서 success/data 언래핑 후):
   *   {
   *     parsing: { totalMatched, totalExtracted, totalUnmatched, ... },
   *     extractedCourses, matchedCourses, unmatchedLines,
   *     completedCourseNames: string[],
   *     generatedProfile: { ... },
   *     pipeline: { graduation, timetable, roadmap, ... } | null
   *   }
   *
   * pipeline 은 인식된 과목이 0개이거나 runPipeline=false 일 때 null 이 올 수 있다.
   * 그래서 graduation 갱신은 pipeline 이 있을 때만 하고,
   * 항상 completedCourseNames 만큼은 사용자 컨텍스트에 반영해 다음 졸업 상태 호출에 사용한다.
   */
  const uploadTranscript = useCallback(
    async (file, options = {}) => {
      if (!file) throw new Error('업로드할 파일이 없습니다.')
      const department = options.department || user?.major
      if (!department) {
        throw new Error('전공 정보가 없어 학점이수표를 분석할 수 없습니다.')
      }
      const result = await apiUploadTranscript(file, {
        department,
        year: options.year ?? user?.year ?? 1,
        track: options.track || user?.track || 'singleMajor',
        careerGoals:
          options.careerGoals ||
          (user?.career
            ? user.career.split(',').map((s) => s.trim()).filter(Boolean)
            : []),
        runPipeline: options.runPipeline !== false,
      })

      // 1) 파이프라인 결과를 화면 상태에 반영
      if (result?.pipeline) {
        setPipeline(result.pipeline)
        if (result.pipeline.graduation) setGraduation(result.pipeline.graduation)
        if (result.pipeline.timetable) {
          setTimetable((prev) => ({ ...(prev || {}), ...result.pipeline.timetable }))
        }
        if (result.pipeline.roadmap) {
          setRoadmap((prev) => ({ ...(prev || {}), ...result.pipeline.roadmap }))
        }
      }

      // 2) 인식된 과목명을 컨텍스트에 동기화
      if (Array.isArray(result?.completedCourseNames) && result.completedCourseNames.length > 0) {
        updateUser?.({ completedCourseNames: result.completedCourseNames })

        // 3) 파이프라인이 비어있어도 (구버전 응답 등) 별도로 졸업 상태를 다시 받아 화면을 갱신
        if (!result.pipeline && userId) {
          try {
            const refreshed = await getGraduationStatus(userId, {
              department,
              year: options.year ?? user?.year ?? 1,
              track: options.track || user?.track || 'singleMajor',
              completedCourseNames: result.completedCourseNames.join(','),
            })
            setGraduation(refreshed)
          } catch {
            /* 무시: 파이프라인이 비어있을 때만 재시도하는 부가 호출 */
          }
        }
      }

      return result
    },
    [user, userId, updateUser]
  )

  const generateUserRoadmap = useCallback(
    async (params = {}) => {
      try {
        const data = await generateRoadmap({
          department: user?.major,
          year: user?.year,
          completedCourseNames: profile?.completedCourseNames || [],
          careerGoals: profile?.careerGoals || [],
          ...params,
        })
        setRoadmap(data?.roadmap || data)
        if (data?.timetable) setTimetable((prev) => ({ ...(prev || {}), ...data.timetable }))
        return data
      } catch (err) {
        setError(err)
        throw err
      }
    },
    [user, profile]
  )

  return {
    user,
    userId,
    profile,
    graduation,
    timetable,
    roadmap,
    pipeline,
    loading,
    error,
    refresh: fetchAll,
    uploadTranscript,
    generateUserRoadmap,
  }
}
