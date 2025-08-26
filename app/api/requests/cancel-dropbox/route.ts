import { NextRequest, NextResponse } from 'next/server'
import { EmployeeDatabase } from '@/lib/employee-database'

interface RequestRecord {
  id: string
  employeeId: string
  name: string
  department: string
  type: 'education' | 'recording'
  date: string
  slot: number
  details: any
  applicationTime: string
  status: 'ACTIVE' | 'CANCELED'
  notes?: string
  canceledTime?: string
}

interface MonthlyRequests {
  month: string
  education: RequestRecord[]
  recording: RequestRecord[]
  lastUpdated: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { recordId, employeeId, email, reason } = body

    if (!recordId || !employeeId) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 이메일로 실제 사번 조회 (신청할 때와 동일한 로직)
    let actualEmployeeId = employeeId
    if (email && !employeeId?.includes('@')) {
      try {
        const employeeDB = new EmployeeDatabase()
        const allEmployees = await employeeDB.fetchEmployees()
        const employee = allEmployees.find(emp => emp.email === email)
        if (employee) {
          actualEmployeeId = employee.employeeId
          console.log('✅ 취소 요청 - 이메일로 실제 사번 조회:', email, '->', actualEmployeeId)
        }
      } catch (error) {
        console.error('❌ 직원 정보 조회 실패:', error)
      }
    }

    console.log(`📝 취소 요청: ${recordId} by ${employeeId} (실제: ${actualEmployeeId})`)

    // 모든 월의 파일을 확인해서 해당 레코드 찾기
    const monthsToCheck = [
      new Date().toISOString().slice(0, 7),
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7),
      new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7)
    ]

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    console.log(`🔍 검색할 월: ${monthsToCheck.join(', ')}`)
    
    for (const month of monthsToCheck) {
      for (const type of ['education', 'recording']) {
        try {
          const fileName = `requests/${month}/${type}.json`
          console.log(`📂 파일 확인: ${fileName}`)
          
          // 파일 읽기
          const response = await fetch(`${baseUrl}/api/dropbox-download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: fileName })
          })

          if (!response.ok) {
            console.log(`❌ 파일 읽기 실패: ${fileName} (${response.status})`)
            continue
          }

          const responseData = await response.json()
          const fileContent = responseData.content
          const data: MonthlyRequests = JSON.parse(fileContent)
          
          // 해당 레코드 찾기 (실제 사번으로 매칭)
          const targetRequest = data[type as keyof MonthlyRequests].find(
            (req: any) => req.id === recordId && (req.employeeId === actualEmployeeId || req.employeeId === employeeId)
          )

          console.log(`🔍 ${fileName}에서 레코드 검색:`)
          console.log(`  - 찾는 ID: ${recordId}`)
          console.log(`  - 사번 (실제): ${actualEmployeeId}`)
          console.log(`  - 사번 (Google): ${employeeId}`)
          console.log(`  - 전체 ${data[type as keyof MonthlyRequests].length}개 레코드 중 매칭 결과: ${targetRequest ? '발견' : '없음'}`)

          if (!targetRequest) continue

          // 48시간 전 체크 (차수별 시간 적용)
          const slotTimes: Record<number, string> = {
            1: '08:30', 2: '09:30', 3: '10:30', 4: '11:30',
            5: '13:40', 6: '14:40', 7: '15:40', 8: '16:40'
          }
          const timeStr = slotTimes[targetRequest.slot] || '08:30'
          const classDateTime = new Date(`${targetRequest.date}T${timeStr}:00+09:00`)
          const now = new Date()
          const timeDiff = classDateTime.getTime() - now.getTime()
          const hoursDiff = timeDiff / (1000 * 60 * 60)

          console.log(`⏰ 취소 시간 검증:`)
          console.log(`  - 수업 시간: ${classDateTime.toLocaleString('ko-KR')}`)
          console.log(`  - 현재 시간: ${now.toLocaleString('ko-KR')}`)
          console.log(`  - 차이: ${hoursDiff.toFixed(2)}시간`)

          if (hoursDiff < 48) {
            return NextResponse.json(
              { error: '교육 시작 48시간 전까지만 취소할 수 있습니다.' },
              { status: 400 }
            )
          }

          // 레코드 완전 삭제 (상태 변경이 아닌 배열에서 제거)
          const requestArray = data[type as keyof MonthlyRequests]
          const requestIndex = requestArray.findIndex((req: any) => req.id === recordId)
          
          if (requestIndex === -1) {
            return NextResponse.json(
              { error: '신청을 찾을 수 없습니다.' },
              { status: 404 }
            )
          }

          // 배열에서 완전히 제거
          requestArray.splice(requestIndex, 1)
          data.lastUpdated = new Date().toISOString()
          
          console.log(`🗑️ 신청 삭제 완료: ${recordId} (남은 ${type} 신청: ${requestArray.length}개)`)

          // Dropbox에 저장
          const uploadResponse = await fetch(`${baseUrl}/api/dropbox-upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              path: fileName,
              content: JSON.stringify(data, null, 2),
              mode: 'overwrite'
            })
          })

          if (!uploadResponse.ok) {
            console.error('❌ Dropbox 업로드 실패')
            return NextResponse.json(
              { error: '취소 처리에 실패했습니다. 다시 시도해주세요.' },
              { status: 500 }
            )
          }

          console.log(`✅ 취소 완료: ${recordId}`)

          return NextResponse.json({
            success: true,
            message: '신청이 취소되었습니다.'
          })

        } catch (error) {
          continue
        }
      }
    }

    return NextResponse.json(
      { error: '해당 신청을 찾을 수 없습니다.' },
      { status: 404 }
    )

  } catch (error) {
    console.error('❌ 취소 처리 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
