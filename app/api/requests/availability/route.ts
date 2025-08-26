import { NextRequest, NextResponse } from 'next/server'

interface RequestRecord {
  id: string
  employeeId: string
  name: string
  department: string
  type: 'education' | 'recording'
  date: string
  slot: number
  details: {
    language: string
    educationType?: '1:1' | 'small-group'
    category?: 'new' | 're-qualification' | 'common'
    recordingLanguage?: 'korean-english' | 'japanese' | 'chinese'
  }
  applicationTime: string
  status: 'ACTIVE' | 'CANCELED'
  notes?: string
}

interface MonthlyRequests {
  month: string
  education: RequestRecord[]
  recording: RequestRecord[]
  lastUpdated: string
}

interface SlotAvailability {
  slot: number
  available: boolean
  currentCount: number
  maxCount: number
  language: string
  educationType: string
}

interface LanguageRestriction {
  language: string
  hasExistingApplication: boolean
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const date = searchParams.get('date')
    const employeeId = searchParams.get('employeeId')
    const email = searchParams.get('email')

    if (!month || !date) {
      return NextResponse.json(
        { error: '월과 날짜는 필수입니다.' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    // 해당 월의 교육 신청 현황 가져오기
    const fileName = `requests/${month}/education.json`
    
    let monthlyData: MonthlyRequests
    try {
      const response = await fetch(`${baseUrl}/api/dropbox-download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: fileName })
      })

      if (response.ok) {
        const responseData = await response.json()
        const fileContent = responseData.content
        monthlyData = JSON.parse(fileContent)
      } else {
        // 파일이 없으면 빈 데이터로 초기화
        monthlyData = {
          month,
          education: [],
          recording: [],
          lastUpdated: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('신청 현황 조회 실패:', error)
      monthlyData = {
        month,
        education: [],
        recording: [],
        lastUpdated: new Date().toISOString()
      }
    }

    // 해당 날짜의 교육 신청 필터링
    const dateRequests = monthlyData.education.filter(req => 
      req.date === date && (!req.status || req.status === 'ACTIVE')
    )

    console.log(`📊 ${date} 교육 신청 현황: ${dateRequests.length}건`)

    // 차수별 가용성 계산
    const slotAvailability: SlotAvailability[] = []
    
    // 언어별 교육 타입별로 그룹화
    const requestsByLanguageAndType = new Map<string, RequestRecord[]>()
    
    dateRequests.forEach(req => {
      const key = `${req.details.language}-${req.details.educationType}`
      if (!requestsByLanguageAndType.has(key)) {
        requestsByLanguageAndType.set(key, [])
      }
      requestsByLanguageAndType.get(key)!.push(req)
    })

    // 각 언어별, 교육타입별로 차수 가용성 확인
    const languages = ['korean-english', 'japanese', 'chinese']
    const educationTypes = ['1:1', 'small-group']

    for (const language of languages) {
      for (const educationType of educationTypes) {
        const key = `${language}-${educationType}`
        const requests = requestsByLanguageAndType.get(key) || []
        
        // 차수별로 그룹화
        const slotGroups = new Map<number, RequestRecord[]>()
        requests.forEach(req => {
          if (!slotGroups.has(req.slot)) {
            slotGroups.set(req.slot, [])
          }
          slotGroups.get(req.slot)!.push(req)
        })

        // 1:1은 1명, 소규모는 4명 제한
        const maxCount = educationType === '1:1' ? 1 : 4

        // 각 차수의 가용성 확인
        for (let slot = 1; slot <= 16; slot++) {
          const currentRequests = slotGroups.get(slot) || []
          const currentCount = currentRequests.length
          
          slotAvailability.push({
            slot,
            available: currentCount < maxCount,
            currentCount,
            maxCount,
            language,
            educationType
          })
        }
      }
    }

    // 사용자의 언어별 신청 제한 확인
    const languageRestrictions: LanguageRestriction[] = []
    
    if (employeeId || email) {
      // 해당 사용자의 기존 신청 확인 (모든 월에서)
      const currentMonth = new Date().toISOString().slice(0, 7)
      const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7)
      
      const userApplications: RequestRecord[] = []
      
      for (const checkMonth of [currentMonth, nextMonth]) {
        try {
          const checkFileName = `requests/${checkMonth}/education.json`
          const response = await fetch(`${baseUrl}/api/dropbox-download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: checkFileName })
          })

          if (response.ok) {
            const responseData = await response.json()
            const fileContent = responseData.content
            const data: MonthlyRequests = JSON.parse(fileContent)
            
            const userRequests = data.education.filter(req => {
              const isMatch = req.employeeId === employeeId || 
                           (email && req.employeeId && req.employeeId.includes('@') && req.employeeId === email)
              const isActive = !req.status || req.status === 'ACTIVE'
              return isMatch && isActive
            })
            
            userApplications.push(...userRequests)
          }
        } catch (error) {
          console.log(`월별 데이터 확인 실패: ${checkMonth}`)
        }
      }

      // 언어별 기존 신청 확인
      for (const language of languages) {
        const hasExisting = userApplications.some(req => req.details.language === language)
        languageRestrictions.push({
          language,
          hasExistingApplication: hasExisting
        })
      }
    }

    return NextResponse.json({
      success: true,
      date,
      slotAvailability,
      languageRestrictions,
      totalRequests: dateRequests.length
    })

  } catch (error) {
    console.error('가용성 조회 실패:', error)
    return NextResponse.json(
      { error: '가용성 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}

