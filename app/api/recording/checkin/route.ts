import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeId, name, language, category, checkinTime } = body

    console.log(`🔍 [Recording Checkin] 체크인 요청:`, { employeeId, name, language, category })

    if (!employeeId || !name || !language || !category) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 1. 녹음 응시 목록에 있는지 확인
    const today = new Date()
    const todayKorean = today.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })

    console.log(`🔍 [Recording Checkin] 오늘 날짜:`, todayKorean)

    // 녹음 응시자 목록 조회 (API 호출 대신 직접 로직 사용)
    let applicantFound = false
    
    try {
      // 녹음 응시자 목록 API를 호출하여 확인
      const applicantsRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/recording-applicants?date=${encodeURIComponent(todayKorean)}`, {
        cache: 'no-store'
      })
      
      if (applicantsRes.ok) {
        const applicantsData = await applicantsRes.json()
        const applicants = applicantsData.applicants || []
        
        console.log(`🔍 [Recording Checkin] 응시자 목록:`, applicants.length, '명')
        
        // 해당 직원이 응시자 목록에 있는지 확인
        applicantFound = applicants.some((applicant: any) => {
          const matchByEmployeeId = applicant.employeeId === employeeId
          const matchByName = applicant.name === name
          const matchByLanguage = applicant.language === language
          
          console.log(`🔍 [Recording Checkin] 응시자 매칭 확인:`, {
            applicant: applicant.name,
            applicantEmployeeId: applicant.employeeId,
            applicantLanguage: applicant.language,
            matchByEmployeeId,
            matchByName,
            matchByLanguage
          })
          
          return (matchByEmployeeId || matchByName) && matchByLanguage
        })
      }
    } catch (error) {
      console.error(`❌ [Recording Checkin] 응시자 목록 조회 오류:`, error)
      return NextResponse.json(
        { error: '응시자 목록을 확인할 수 없습니다.' },
        { status: 500 }
      )
    }

    if (!applicantFound) {
      console.log(`❌ [Recording Checkin] 응시자 목록에 없음:`, { employeeId, name, language })
      return NextResponse.json({
        success: false,
        message: '녹음을 응시하지 않으셨습니다. 담당자에게 문의하세요.'
      })
    }

    // 2. 이미 체크인했는지 확인
    const existingCheckin = await prisma.recordingCheckin.findFirst({
      where: {
        employeeId: employeeId,
        checkinDate: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
        }
      }
    })

    if (existingCheckin) {
      console.log(`✅ [Recording Checkin] 이미 체크인됨:`, employeeId)
      return NextResponse.json({
        success: true,
        message: '체크인 완료되었습니다.',
        alreadyCheckedIn: true
      })
    }

    // 3. 체크인 기록 생성
    const checkin = await prisma.recordingCheckin.create({
      data: {
        employeeId: employeeId,
        name: name,
        language: language,
        category: category,
        checkinDate: new Date(checkinTime || Date.now()),
        status: 'CHECKED_IN',
        ipAddress: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown',
      }
    })

    console.log(`✅ [Recording Checkin] 체크인 완료:`, { name, employeeId, language })

    return NextResponse.json({
      success: true,
      message: '체크인 완료되었습니다.',
      checkin: {
        id: checkin.id,
        checkinDate: checkin.checkinDate,
        status: checkin.status
      }
    })

  } catch (error) {
    console.error('❌ [Recording Checkin] 체크인 오류:', error)
    return NextResponse.json(
      { error: '체크인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 체크인 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const employeeId = searchParams.get('employeeId')

    let whereClause: any = {}

    if (date) {
      const targetDate = new Date(date)
      whereClause.checkinDate = {
        gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
        lt: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1)
      }
    }

    if (employeeId) {
      whereClause.employeeId = employeeId
    }

    const checkins = await prisma.recordingCheckin.findMany({
      where: whereClause,
      orderBy: {
        checkinDate: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      checkins
    })

  } catch (error) {
    console.error('체크인 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '체크인 목록을 불러올 수 없습니다.' },
      { status: 500 }
    )
  }
}
