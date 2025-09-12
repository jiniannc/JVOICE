import { NextRequest, NextResponse } from 'next/server'
import { EmployeeDatabase } from '@/lib/employee-database'

// 신청 데이터 타입 정의
interface RequestRecord {
  id: string
  employeeId: string
  name: string
  department: string
  position?: string
  lineTeam?: string
  type: 'education' | 'recording'
  date: string // YYYY-MM-DD
  slot: number
  details: {
    // 교육용 필드
    language?: 'korean-english' | 'japanese' | 'chinese'
    mode?: '1:1' | 'small'
    category?: '신규' | '재자격' | '공통' | 'PUS'
    // 녹음용 필드  
    recordingLanguage?: 'korean-english' | 'japanese' | 'chinese'
  }
  applicationTime: string // ISO string
  status: 'ACTIVE' | 'CANCELED'
  notes?: string
}

interface MonthlyRequests {
  month: string // YYYY-MM
  education: RequestRecord[]
  recording: RequestRecord[]
  lastUpdated: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📥 신청 요청 받음:', body)
    
    const { 
      employeeId, 
      email,
      name, 
      department, 
      type, 
      date, 
      slot, 
      details 
    } = body

    // 입력 검증
    console.log('🔍 필드 검증:', {
      employeeId: !!employeeId,
      name: !!name, 
      department: !!department,
      type: !!type,
      date: !!date,
      slot: !!slot
    })

    if (!employeeId || !name || !type || !date || !slot) {
      console.log('❌ 필수 필드 누락:', {
        employeeId, name, department, type, date, slot
      })
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 관리자가 시간 제한을 비활성화했는지 확인
    let timeRestrictionsDisabled = false
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/time-restrictions`)
      const result = await response.json()
      if (result.success) {
        timeRestrictionsDisabled = result.disabled
      }
    } catch (error) {
      console.warn('시간 제한 상태 확인 실패:', error)
    }

    // 신청 가능 시간 체크: 해당 날짜 기준 전전날 오후 2시까지만 신청 가능
    if (!timeRestrictionsDisabled) {
      const scheduleDate = new Date(date)
      const twoDaysBefore = new Date(scheduleDate)
      twoDaysBefore.setDate(twoDaysBefore.getDate() - 2)
      twoDaysBefore.setHours(14, 0, 0, 0) // 오후 2시로 설정
      
      const now = new Date()
      
      if (now > twoDaysBefore) {
        return NextResponse.json(
          { 
            error: '신청기간만료',
            message: '신청 기간이 만료되었습니다.',
            scheduleDate: date,
            deadline: twoDaysBefore.toISOString()
          },
          { status: 400 }
        )
      }
    } else {
      console.log('🔧 [Admin] 시간 제한이 비활성화되어 있어 신청 시간 제한 무시')
    }

    // 스프레드시트에서 추가 직원 정보 조회
    let employeeInfo = null
    try {
      const employeeDB = new EmployeeDatabase()
      const allEmployees = await employeeDB.fetchEmployees()
      
      // 이메일 우선, 그 다음 employeeId로 찾기
      if (email) {
        employeeInfo = allEmployees.find(emp => emp.email === email)
        console.log('🔍 이메일로 직원 정보 조회:', email, employeeInfo ? '성공' : '실패')
      }
      
      if (!employeeInfo && employeeId) {
        employeeInfo = allEmployees.find(emp => emp.employeeId === employeeId)
        console.log('🔍 사번으로 직원 정보 조회:', employeeId, employeeInfo ? '성공' : '실패')
      }
      
      if (employeeInfo) {
        console.log('✅ 직원 정보 조회 성공:', {
          name: employeeInfo.name,
          employeeId: employeeInfo.employeeId,
          department: employeeInfo.department,
          position: employeeInfo.position,
          lineTeam: employeeInfo.lineTeam,
          email: employeeInfo.email
        })
      } else {
        console.log('⚠️ 스프레드시트에서 직원 정보를 찾을 수 없음:', { email, employeeId })
      }
    } catch (error) {
      console.error('❌ 직원 정보 조회 실패:', error)
    }

    // 월별 파일 경로 결정
    const dateObj = new Date(date)
    const month = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`
    const fileName = `requests/${month}/${type}.json`

    console.log(`📝 신청 처리: ${type} - ${employeeId} (${name}) - ${date} ${slot}차수`)

    // 기존 파일 읽기 (없으면 새로 생성)
    let existingData: MonthlyRequests
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    try {
      const response = await fetch(`${baseUrl}/api/dropbox-download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: fileName })
      })

      if (response.ok) {
        const responseData = await response.json()
        const fileContent = responseData.content
        existingData = JSON.parse(fileContent)
        console.log(`📄 기존 ${type} 파일 로드됨: ${existingData[type].length}개 신청`)
      } else {
        throw new Error('파일 없음')
      }
    } catch (error) {
      console.log(`📄 새 ${type} 파일 생성`)
      existingData = {
        month,
        education: [],
        recording: [],
        lastUpdated: new Date().toISOString()
      }
    }

    // 중복 신청 체크
    const existingRequest = existingData[type].find(
      req => req.employeeId === employeeId && 
             req.date === date && 
             req.slot === slot &&
             req.status === 'ACTIVE'
    )

    if (existingRequest) {
      return NextResponse.json(
        { error: '이미 해당 일정에 신청하셨습니다.' },
        { status: 409 }
      )
    }

    // 교육 신청의 경우 추가 검증
    if (type === 'education') {
      // 1. 언어별 중복 신청 체크 (해당 사용자가 같은 언어로 이미 신청했는지)
      const actualEmployeeId = employeeInfo?.employeeId || employeeId
      const userLanguageRequests = existingData[type].filter(req => 
        (req.employeeId === actualEmployeeId || req.employeeId === employeeId) &&
        req.details.language === details.language &&
        (!req.status || req.status === 'ACTIVE')
      )

      if (userLanguageRequests.length > 0) {
        return NextResponse.json(
          { error: `${details.language === 'korean-english' ? '한/영' : 
                    details.language === 'japanese' ? '일본어' : '중국어'} 교육은 이미 신청하셨습니다. 언어별로 1개씩만 신청 가능합니다.` },
          { status: 409 }
        )
      }

      // 2. 차수별 정원 체크
      const slotRequests = existingData[type].filter(req =>
        req.date === date &&
        req.slot === slot &&
        req.details.language === details.language &&
        req.details.educationType === details.educationType &&
        (!req.status || req.status === 'ACTIVE')
      )

      const maxCapacity = details.educationType === '1:1' ? 1 : 4
      
      if (slotRequests.length >= maxCapacity) {
        return NextResponse.json(
          { error: `해당 차수는 정원이 마감되었습니다. (${details.educationType === '1:1' ? '1:1 교육' : '소규모 교육'}: ${slotRequests.length}/${maxCapacity}명)` },
          { status: 409 }
        )
      }

      console.log(`✅ 정원 체크 통과: ${details.language} ${details.educationType} ${slot}차수 (${slotRequests.length}/${maxCapacity}명)`)
    }

    // 새로운 신청 레코드 생성
    const newRecord: RequestRecord = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      employeeId: employeeInfo?.employeeId || employeeId, // 스프레드시트 사번 우선 사용
      name: employeeInfo?.name || name, // 스프레드시트에서 가져온 이름 우선 사용
      department: employeeInfo?.lineTeam || employeeInfo?.department || department, // 라인팀을 부서로 사용
      position: employeeInfo?.position,
      lineTeam: employeeInfo?.lineTeam, // 추가 정보로 보관
      type,
      date,
      slot,
      details,
      applicationTime: new Date().toISOString(),
      status: 'ACTIVE'
    }

    // 데이터 업데이트
    existingData[type].push(newRecord)
    existingData.lastUpdated = new Date().toISOString()

    // Dropbox에 저장
    const uploadResponse = await fetch(`${baseUrl}/api/dropbox-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: fileName,
        content: JSON.stringify(existingData, null, 2),
        mode: 'overwrite'
      })
    })

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text()
      console.error('❌ Dropbox 업로드 실패:', error)
      return NextResponse.json(
        { error: '신청 저장에 실패했습니다. 다시 시도해주세요.' },
        { status: 500 }
      )
    }

    console.log(`✅ 신청 완료: ${newRecord.id}`)

    return NextResponse.json({
      success: true,
      recordId: newRecord.id,
      message: '신청이 완료되었습니다.'
    })

  } catch (error) {
    console.error('❌ 신청 처리 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const email = searchParams.get('email')
    const month = searchParams.get('month') // YYYY-MM

    if (!employeeId && !email) {
      return NextResponse.json(
        { error: '사원 ID 또는 이메일이 필요합니다.' },
        { status: 400 }
      )
    }

    console.log('🔍 신청 내역 조회 요청:', { employeeId, email })

    // 캐시된 스프레드시트에서 실제 사번 조회 (빠른 조회)
    let actualEmployeeId = employeeId
    if (email && !employeeId?.includes('@')) { // Google ID가 아닌 경우만
      try {
        // 캐시 활용으로 빠른 조회
        const employeeDB = new EmployeeDatabase()
        const allEmployees = await employeeDB.fetchEmployees() // 5분 캐시 적용됨
        const employee = allEmployees.find(emp => emp.email === email)
        if (employee) {
          actualEmployeeId = employee.employeeId
          console.log('✅ 캐시에서 실제 사번 조회:', email, '->', actualEmployeeId)
        }
      } catch (error) {
        console.error('❌ 직원 정보 조회 실패:', error)
      }
    }

    // 신청이 있을 가능성이 높은 현재/다음 월만 확인
    const monthsToCheck = month ? [month] : [
      new Date().toISOString().slice(0, 7), // 현재 월
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7) // 다음 월
    ]

    const allRequests: RequestRecord[] = []
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // 병렬 처리로 모든 파일을 동시에 조회 (성능 개선)
    const downloadPromises: Promise<{month: string, type: string, requests: RequestRecord[]}>[] = []
    
    for (const checkMonth of monthsToCheck) {
      for (const type of ['education', 'recording']) {
        const fileName = `requests/${checkMonth}/${type}.json`
        
        const downloadPromise = fetch(`${baseUrl}/api/dropbox-download`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: fileName })
        }).then(async (response) => {
          if (response.ok) {
            const responseData = await response.json()
            const fileContent = responseData.content
            const data: MonthlyRequests = JSON.parse(fileContent)
            const userRequests = data[type as keyof MonthlyRequests].filter(
              (req: any) => {
                // 실제 사번으로 매칭하거나, 원래 Google ID로도 매칭 + ACTIVE 상태만
                const isMatch = req.employeeId === actualEmployeeId || req.employeeId === employeeId
                const isActive = !req.status || req.status === 'ACTIVE' // status가 없으면 기본적으로 ACTIVE로 간주
                return isMatch && isActive
              }
            )
            console.log(`📄 ${checkMonth}/${type}: ${userRequests.length}개 신청 발견 (전체: ${data[type as keyof MonthlyRequests].length}개)`)
            return { month: checkMonth, type, requests: userRequests }
          } else if (response.status === 404) {
            console.log(`📄 ${checkMonth}/${type}: 파일 없음 (정상)`)
            return { month: checkMonth, type, requests: [] }
          } else {
            console.log(`❌ ${checkMonth}/${type}: 파일 다운로드 실패 (${response.status})`)
            return { month: checkMonth, type, requests: [] }
          }
        }).catch(() => {
          // 파일이 없는 경우는 무시
          return { month: checkMonth, type, requests: [] }
        })
        
        downloadPromises.push(downloadPromise)
      }
    }

    // 모든 다운로드를 병렬로 실행하고 결과 수집
    const results = await Promise.all(downloadPromises)
    results.forEach(result => {
      allRequests.push(...result.requests)
    })

    console.log(`🎯 최종 조회 결과: ${allRequests.length}개 신청 발견`)
    
    return NextResponse.json({
      requests: allRequests.sort((a, b) => 
        new Date(b.applicationTime).getTime() - new Date(a.applicationTime).getTime()
      )
    })

  } catch (error) {
    console.error('❌ 신청 내역 조회 오류:', error)
    return NextResponse.json(
      { error: '신청 내역 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}
