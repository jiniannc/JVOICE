import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/database'
import { EmployeeDatabase } from '@/lib/employee-database'

// 신청 데이터 타입 정의
interface RequestData {
  employeeId: string
  name: string
  department?: string
  type: 'education' | 'recording'
  date: string // YYYY-MM-DD
  slot: number
  details: {
    // 교육용 필드
    language?: 'korean-english' | 'japanese' | 'chinese'
    mode?: '1:1' | 'small' | 'small-group'
    category?: '신규' | '재자격' | '공통' | 'PUS'
    // 녹음용 필드  
    recordingLanguage?: 'korean-english' | 'japanese' | 'chinese'
  }
  notes?: string
}

// 관리자용: 모든 신청 내역 삭제 (테스트용)
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    if (action === 'clear-all') {
      console.log('🗑️ [Database] 모든 신청 내역 삭제 요청')
      
      // 모든 활성 신청 내역 조회 (삭제 전 로그)
      const existingApplications = await prisma.scheduleApplication.findMany({
        where: {
          status: 'ACTIVE'
        },
        include: {
          schedule: {
            select: {
              date: true,
              type: true
            }
          }
        }
      })
      
      console.log(`🗑️ [Database] 삭제 예정 신청 내역: ${existingApplications.length}건`)
      existingApplications.forEach((app, idx) => {
        console.log(`  ${idx + 1}. ${app.employeeId} - ${app.schedule.date} ${app.slot}차수 ${app.schedule.type}`)
      })
      
      // 모든 신청 내역을 CANCELLED로 변경 (완전 삭제 대신 상태 변경)
      const result = await prisma.scheduleApplication.updateMany({
        where: {
          status: 'ACTIVE'
        },
        data: {
          status: 'CANCELLED'
        }
      })
      
      console.log(`✅ [Database] ${result.count}건의 신청 내역을 취소 처리 완료`)
      
      return NextResponse.json({
        success: true,
        message: `${result.count}건의 신청 내역을 삭제했습니다.`,
        deletedCount: result.count,
        applications: existingApplications.map(app => ({
          employeeId: app.employeeId,
          date: app.schedule.date,
          slot: app.slot,
          type: app.schedule.type
        }))
      })
    }
    
    return NextResponse.json({
      success: false,
      error: '지원하지 않는 액션입니다.'
    }, { status: 400 })
    
  } catch (error) {
    console.error('❌ [Database] PATCH 요청 실패:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'PATCH 요청 처리 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📥 [Database] 신청 요청 받음:', body)
    
    const { 
      employeeId, 
      email,
      name, 
      department, 
      type, 
      date, 
      slot, 
      details,
      notes 
    }: RequestData & { email?: string } = body

    // 입력 검증
    if (!employeeId || !name || !type || !date || !slot) {
      console.log('❌ [Database] 필수 필드 누락:', {
        employeeId, name, department, type, date, slot
      })
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 스프레드시트에서 추가 직원 정보 조회
    let employeeInfo = null
    try {
      const employeeDB = new EmployeeDatabase()
      const employees = await employeeDB.fetchEmployees()
      employeeInfo = employees.find(emp => emp.employeeId === employeeId)
      console.log('👤 [Database] 직원 정보 조회:', employeeInfo ? '성공' : '실패')
    } catch (error) {
      console.warn('⚠️ [Database] 직원 정보 조회 실패:', error)
    }

    // 사용자 확인/생성
    let user = await prisma.user.findUnique({
      where: { employeeId }
    })

    if (!user) {
      // 새 사용자 생성
      user = await prisma.user.create({
        data: {
          employeeId,
          name: employeeInfo?.name || name,
          email: email || `${employeeId}@company.com`,
          department: employeeInfo?.lineTeam || employeeInfo?.department || department || '',
          position: employeeInfo?.position || '',
          isActive: true
        }
      })
      console.log('👤 [Database] 새 사용자 생성:', user.employeeId)
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

    // 신청 시간 제한 체크: 교육/녹음 날짜 전전날 오후 2시까지만 신청 가능
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

    // 월 추출
    const month = date.slice(0, 7) // YYYY-MM

    // 해당 월의 스케줄이 동기화되어 있는지 확인
    const monthlySchedule = await prisma.monthlySchedule.findUnique({
      where: { month }
    })

    if (!monthlySchedule) {
      return NextResponse.json(
        { error: `${month} 스케줄이 동기화되지 않았습니다. 관리자에게 문의하세요.` },
        { status: 400 }
      )
    }

    // 중복 신청 검사 - 카테고리도 고려
    const category = details?.category || '공통' // 카테고리 추출
    const existingApplication = await prisma.scheduleApplication.findFirst({
      where: {
        employeeId,
        schedule: {
          date,
          type: type === 'recording' ? 'recording' : getScheduleType(details),
          classType: type === 'recording' ? 'recording' : getClassType(details),
          category: category // 🔧 [FIX] 카테고리별로 중복 검사
        },
        slot,
        status: 'ACTIVE'
      }
    })

    if (existingApplication) {
      return NextResponse.json(
        { error: '이미 해당 차수에 신청하셨습니다.' },
        { status: 400 }
      )
    }

    // 언어별 월간 중복 신청 검사 (녹음의 경우)
    if (type === 'recording' && details.recordingLanguage) {
      const monthlyRecordingApplication = await prisma.scheduleApplication.findFirst({
        where: {
          employeeId,
          schedule: {
            month,
            type: 'recording'
          },
          status: 'ACTIVE',
          details: {
            path: ['recordingLanguage'],
            equals: details.recordingLanguage
          }
        }
      })

      if (monthlyRecordingApplication) {
        const languageName = details.recordingLanguage === 'korean-english' ? '한영' : 
                           details.recordingLanguage === 'japanese' ? '일본어' : '중국어';
        return NextResponse.json(
          { error: `${languageName} 녹음은 이미 이번 달에 신청하셨습니다. 언어별로 한 달에 한 번만 신청 가능합니다.` },
          { status: 400 }
        )
      }
    }

    // 언어별 월간 중복 신청 검사 (교육의 경우)
    if (type === 'education' && details.language) {
      const monthlyEducationApplication = await prisma.scheduleApplication.findFirst({
        where: {
          employeeId,
          schedule: {
            month,
            type: details.language
          },
          status: 'ACTIVE'
        }
      })

      if (monthlyEducationApplication) {
        const languageName = details.language === 'korean-english' ? '한영' : 
                           details.language === 'japanese' ? '일본어' : '중국어';
        return NextResponse.json(
          { error: `${languageName} 교육은 이미 이번 달에 신청하셨습니다. 언어별로 한 달에 한 번만 신청 가능합니다.` },
          { status: 400 }
        )
      }
    }

    // 해당 스케줄 찾기 또는 생성
    // UI에서 'small-group'이 넘어오는 경우 DB 스키마의 'small'로 정규화
    const normalizedClassType = (type === 'recording') ? 'recording' : normalizeClassType(details)
    const normalizedScheduleType = (type === 'recording') ? 'recording' : getScheduleType(details)
    // category는 위에서 이미 선언됨

    console.log('🔍 [Database API] 스케줄 찾기:', {
      date,
      type: normalizedScheduleType,
      classType: normalizedClassType,
      category: category,
      originalDetails: details
    })

    let schedule = await prisma.schedule.findFirst({
      where: {
        date,
        type: normalizedScheduleType,
        classType: normalizedClassType,
        category: category // 카테고리별로 스케줄 구분
      }
    })

    console.log('📋 [Database API] 찾은 스케줄:', schedule ? {
      id: schedule.id,
      date: schedule.date,
      type: schedule.type,
      classType: schedule.classType,
      category: schedule.category,
      classroom: schedule.classroom
    } : 'null')

    if (!schedule) {
      // 스케줄 생성 (동적)
      console.log('🆕 [Database API] 새 스케줄 생성:', {
        date,
        type: normalizedScheduleType,
        classType: normalizedClassType,
        category: category
      })
      
      schedule = await prisma.schedule.create({
        data: {
          month,
          date,
          type: normalizedScheduleType,
          classType: normalizedClassType,
          category: category, // 카테고리 포함
          slots: type === 'recording' ? [1,2,3,4,5,6,7,8] : [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
          capacity: getCapacity(type, { ...details, mode: normalizedClassType }),
          visible: true
        }
      })
      console.log('📅 [Database] 새 스케줄 생성:', schedule.id)
    }

    // 수용 인원 확인
    if (type === 'recording') {
      // 녹음의 경우: 언어 상관없이 전체 차수당 8명까지만 가능
      const currentRecordingApplications = await prisma.scheduleApplication.count({
        where: {
          schedule: {
            date,
            type: 'recording'
          },
          slot,
          status: 'ACTIVE'
        }
      })

      if (currentRecordingApplications >= 8) {
        return NextResponse.json(
          { error: `해당 녹음 차수는 정원이 마감되었습니다. (${currentRecordingApplications}/8명)` },
          { status: 400 }
        )
      }
    } else {
      // 교육의 경우: 기존 로직 유지
      const currentApplications = await prisma.scheduleApplication.count({
        where: {
          scheduleId: schedule.id,
          slot,
          status: 'ACTIVE'
        }
      })

      if (currentApplications >= schedule.capacity) {
        return NextResponse.json(
          { error: '해당 차수가 만원입니다.' },
          { status: 400 }
        )
      }
    }

    // 신청 생성
    console.log('📝 [Database API] 신청 생성:', {
      scheduleId: schedule.id,
      employeeId,
      slot,
      scheduleInfo: {
        date: schedule.date,
        type: schedule.type,
        classType: schedule.classType,
        category: schedule.category,
        classroom: schedule.classroom
      },
      details: { type, ...details, notes }
    })

    const application = await prisma.scheduleApplication.create({
      data: {
        scheduleId: schedule.id,
        employeeId,
        slot,
        status: 'ACTIVE',
        details: {
          type,
          ...details,
          notes
        }
      }
    })

    console.log(`✅ [Database] 신청 완료: ${application.id} → 스케줄 ${schedule.id} (${schedule.category})`)

    return NextResponse.json({
      success: true,
      recordId: application.id,
      message: '신청이 완료되었습니다.',
      data: {
        id: application.id,
        type,
        date,
        slot,
        details
      }
    })

  } catch (error) {
    console.error('❌ [Database] 신청 처리 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// GET: 신청 내역 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const month = searchParams.get('month')
    const date = searchParams.get('date')

    if (!employeeId) {
      return NextResponse.json(
        { error: 'employeeId가 필요합니다.' },
        { status: 400 }
      )
    }

    console.log(`📋 [Database] 신청 내역 조회: ${employeeId}, month: ${month}, date: ${date}`)

    let whereClause: any = {
      employeeId,
      status: 'ACTIVE'
    }

    if (month) {
      whereClause.schedule = {
        month
      }
    }

    if (date) {
      whereClause.schedule = {
        ...whereClause.schedule,
        date
      }
    }

    const applications = await prisma.scheduleApplication.findMany({
      where: whereClause,
      include: {
        schedule: {
          select: {
            date: true,
            type: true,
            classType: true,
            classroom: true
          }
        },
        user: {
          select: {
            name: true,
            department: true
          }
        }
      },
      orderBy: [
        { schedule: { date: 'asc' } },
        { slot: 'asc' }
      ]
    })

    // 응답 형식 변환
    const items = applications.map(app => ({
      id: app.id,
      type: app.schedule.type === 'recording' ? 'recording' : 'education',
      date: app.schedule.date,
      slot: app.slot,
      details: app.details,
      status: app.status,
      appliedAt: app.appliedAt,
      schedule: {
        type: app.schedule.type,
        classType: app.schedule.classType,
        classroom: app.schedule.classroom
      }
    }))

    console.log(`✅ [Database] 신청 내역 조회 완료: ${items.length}건`)

    return NextResponse.json({
      success: true,
      items,
      total: items.length
    })

  } catch (error) {
    console.error('❌ [Database] 신청 내역 조회 오류:', error)
    return NextResponse.json(
      { error: '조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// DELETE: 신청 취소
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const applicationId = searchParams.get('id')
    const employeeId = searchParams.get('employeeId')

    if (!applicationId || !employeeId) {
      return NextResponse.json(
        { error: 'applicationId와 employeeId가 필요합니다.' },
        { status: 400 }
      )
    }

    console.log(`🗑️ [Database] 신청 취소: ${applicationId}`)

    // 신청 존재 확인 및 본인 신청인지 검증
    const application = await prisma.scheduleApplication.findFirst({
      where: {
        id: applicationId,
        employeeId,
        status: 'ACTIVE'
      },
      include: {
        schedule: true
      }
    })

    if (!application) {
      return NextResponse.json(
        { error: '신청을 찾을 수 없거나 취소할 권한이 없습니다.' },
        { status: 404 }
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

    // 취소 시간 제한 체크: 교육/녹음 날짜 이틀 전 오후 2시까지만 취소 가능
    if (!timeRestrictionsDisabled) {
      const scheduleDate = new Date(application.schedule.date)
      const twoDaysBefore = new Date(scheduleDate)
      twoDaysBefore.setDate(twoDaysBefore.getDate() - 2)
      twoDaysBefore.setHours(14, 0, 0, 0) // 오후 2시로 설정
      
      const now = new Date()
      
      if (now > twoDaysBefore) {
        return NextResponse.json(
          { 
            error: '기간만료', 
            message: '취소 기간이 만료되었습니다.',
            contactRequired: true,
            scheduleDate: application.schedule.date,
            deadline: twoDaysBefore.toISOString()
          },
          { status: 400 }
        )
      }
    } else {
      console.log('🔧 [Admin] 시간 제한이 비활성화되어 있어 취소 시간 제한 무시')
    }

    // 신청 취소 (완전 삭제)
    await prisma.scheduleApplication.delete({
      where: { id: applicationId }
    })

    console.log(`✅ [Database] 신청 취소 완료: ${applicationId}`)

    return NextResponse.json({
      success: true,
      message: '신청이 취소되었습니다.'
    })

  } catch (error) {
    console.error('❌ [Database] 신청 취소 오류:', error)
    return NextResponse.json(
      { error: '취소 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// 헬퍼 함수들
function getScheduleType(details: any): string {
  if (details.language) {
    return details.language
  }
  return 'korean-english' // 기본값
}

function getClassType(details: any): string {
  // 🔧 [FIX] educationType 필드도 확인 (모바일에서 전송)
  const mode = details.mode || details.educationType
  if (mode) {
    return mode === 'small-group' ? 'small' : mode
  }
  return '1:1' // 기본값
}

function getCapacity(type: string, details: any): number {
  if (type === 'recording') {
    return 8 // 녹음은 8명
  }
  
  const mode = details.mode === 'small-group' ? 'small' : details.mode
  if (mode === 'small') {
    // PUS 카테고리는 3명, 나머지는 4명
    return details.category === 'PUS' ? 3 : 4
  }
  
  return 1 // 1:1은 1명
}

function normalizeClassType(details: any): '1:1' | 'small' | 'recording' {
  if (!details) return '1:1'
  
  // 🔧 [FIX] educationType 필드도 확인 (모바일에서 전송)
  const mode = details.mode || details.educationType
  if (mode === 'small-group' || mode === 'small') return 'small'
  if (mode === '1:1') return '1:1'
  return '1:1'
}

