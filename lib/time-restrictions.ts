/**
 * 시간 제한 관련 유틸리티 함수들
 * 관리자가 설정한 time restrictions 상태를 확인하고 적용하는 공통 로직
 */

/**
 * 관리자가 시간 제한을 비활성화했는지 확인
 * @returns Promise<boolean> - true면 시간 제한이 비활성화됨, false면 활성화됨
 */
export async function checkTimeRestrictionsDisabled(): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/time-restrictions')
    const result = await response.json()
    if (result.success) {
      return result.disabled
    }
    return false // 기본값: 시간 제한 활성화
  } catch (error) {
    console.warn('시간 제한 상태 확인 실패:', error)
    return false // 기본값: 시간 제한 활성화
  }
}

/**
 * 신청 기간이 유효한지 확인 (교육/녹음 신청용)
 * @param date - 신청하려는 날짜 (YYYY-MM-DD)
 * @param restrictionsDisabled - 시간 제한이 비활성화되었는지 여부
 * @returns boolean - true면 신청 가능, false면 기간 만료
 */
export function isWithinApplicationPeriod(date: string, restrictionsDisabled: boolean): boolean {
  if (restrictionsDisabled) {
    return true // 시간 제한이 비활성화되면 항상 신청 가능
  }

  const scheduleDate = new Date(date)
  const twoDaysBefore = new Date(scheduleDate)
  twoDaysBefore.setDate(twoDaysBefore.getDate() - 2)
  twoDaysBefore.setHours(14, 0, 0, 0) // 오후 2시로 설정
  
  const now = new Date()
  return now <= twoDaysBefore
}

/**
 * 교육 체크인이 가능한 시간인지 확인
 * @param dateStr - 교육 날짜 (YYYY-MM-DD)
 * @param startTime - 교육 시작 시간 (HH:MM)
 * @param restrictionsDisabled - 시간 제한이 비활성화되었는지 여부
 * @returns 'early' | 'available' | 'late'
 */
export function getEducationCheckinStatus(
  dateStr: string, 
  startTime: string, 
  restrictionsDisabled: boolean
): 'early' | 'available' | 'late' {
  if (restrictionsDisabled) {
    return 'available' // 시간 제한이 비활성화되면 항상 체크인 가능
  }

  if (!dateStr || !startTime) return 'early'
  
  // 브라우저 로컬 시간 기준으로 비교
  const start = new Date(`${dateStr}T${startTime}:00`)
  const now = new Date()
  const startMinus30 = new Date(start.getTime() - 30 * 60 * 1000)

  if (now < startMinus30) return 'early'
  if (now > start) return 'late'
  return 'available'
}

/**
 * 녹음 신청 기간이 유효한지 확인 (캘린더용)
 * @param date - 녹음 날짜 (YYYY-MM-DD)
 * @param restrictionsDisabled - 시간 제한이 비활성화되었는지 여부
 * @returns boolean - true면 신청 가능, false면 기간 만료
 */
export function isRecordingApplicationPeriodValid(date: string, restrictionsDisabled: boolean): boolean {
  return isWithinApplicationPeriod(date, restrictionsDisabled)
}



