import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { PrismaClient } from '../../../../lib/generated/prisma'
import { cookies } from 'next/headers'

const prisma = new PrismaClient()

// Google Calendar API 설정
const calendar = google.calendar('v3')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { applicationId, instructorEmail } = body

    console.log('🗓️ [Google Meet] 생성 요청:', { applicationId, instructorEmail })

    if (!applicationId) {
      return NextResponse.json(
        { error: 'applicationId가 필요합니다.' },
        { status: 400 }
      )
    }

    // 신청 정보 조회
    const application = await prisma.scheduleApplication.findUnique({
      where: { id: applicationId },
      include: {
        schedule: true,
        user: true
      }
    })

    if (!application) {
      return NextResponse.json(
        { error: '신청 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 1:1 교육인지 확인
    const details = application.details as any
    console.log('🔍 [Google Meet] 신청 details 확인:', details)
    
    // educationType 또는 mode로 1:1 교육 확인
    const isOneOnOne = details.educationType === '1:1' || details.mode === '1:1'
    
    if (!isOneOnOne) {
      console.log('❌ [Google Meet] 1:1 교육이 아님:', { educationType: details.educationType, mode: details.mode })
      return NextResponse.json(
        { error: '1:1 교육만 Google Meet 링크를 생성할 수 있습니다.' },
        { status: 400 }
      )
    }
    
    console.log('✅ [Google Meet] 1:1 교육 확인됨')

    // 이미 Google Meet 링크가 있는지 확인
    if (details.googleMeetLink) {
      return NextResponse.json({
        success: true,
        meetLink: details.googleMeetLink,
        message: '이미 Google Meet 링크가 생성되어 있습니다.'
      })
    }

    // OAuth 토큰 확인
    const cookieStore = cookies()
    let accessToken = cookieStore.get('google_calendar_access_token')?.value
    const refreshToken = cookieStore.get('google_calendar_refresh_token')?.value
    const userInfo = cookieStore.get('google_calendar_user')?.value

    if (!accessToken && !refreshToken) {
      return NextResponse.json(
        { 
          error: 'Calendar 권한이 없습니다. 먼저 Google Calendar 연동을 해주세요.',
          needsAuth: true 
        },
        { status: 401 }
      )
    }

    // 액세스 토큰이 없거나 만료된 경우 리프레시 토큰으로 갱신
    if (!accessToken && refreshToken) {
      console.log('🔄 [Google Meet] 액세스 토큰 갱신 중...')
      
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      })

      if (refreshResponse.ok) {
        const newTokens = await refreshResponse.json()
        accessToken = newTokens.access_token
        
        // 새로운 액세스 토큰을 쿠키에 저장
        cookieStore.set('google_calendar_access_token', accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: newTokens.expires_in || 3600
        })
        
        console.log('✅ [Google Meet] 액세스 토큰 갱신 완료')
      } else {
        return NextResponse.json(
          { 
            error: '토큰 갱신에 실패했습니다. 다시 로그인해주세요.',
            needsAuth: true 
          },
          { status: 401 }
        )
      }
    }

    // OAuth 클라이언트 설정
    const oauth2Client = new google.auth.OAuth2(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    })

    // 1:1 교육 시간 계산 (25분 단위)
    const oneOnOneSlotTimes: Record<number, string> = {
      1: '08:30', 2: '09:00', 3: '09:30', 4: '10:00',
      5: '10:30', 6: '11:00', 7: '11:30', 8: '12:00',
      9: '13:35', 10: '14:05', 11: '14:35', 12: '15:05',
      13: '15:35', 14: '16:05', 15: '16:35', 16: '17:05'
    }

    const startTime = oneOnOneSlotTimes[application.slot] || '08:30'
    const [hours, minutes] = startTime.split(':').map(Number)
    
    const startDateTime = new Date(application.schedule.date)
    startDateTime.setHours(hours, minutes, 0, 0)
    
    const endDateTime = new Date(startDateTime)
    endDateTime.setMinutes(endDateTime.getMinutes() + 25) // 1:1 교육은 25분

    // 언어 표시명 변환
    const languageNames = {
      'korean-english': '한/영',
      'japanese': '일본어',
      'chinese': '중국어'
    }
    const languageName = languageNames[details.language as keyof typeof languageNames] || details.language

    // Google Calendar 이벤트 생성
    const event = {
      summary: `1:1 ${languageName} 교육 - ${application.user.name}`,
      description: `
1:1 ${languageName} 교육 세션

📋 신청자 정보:
- 이름: ${application.user.name}
- 사번: ${application.user.employeeId}
- 부서: ${application.user.department}

📅 교육 정보:
- 언어: ${languageName}
- 날짜: ${application.schedule.date}
- 시간: ${startTime} - ${endDateTime.getHours().toString().padStart(2, '0')}:${endDateTime.getMinutes().toString().padStart(2, '0')}
- 차수: ${application.slot}차

⚠️ 중요사항:
- 교육 시작 5분 전까지 JVOICE (모바일) 접속 > 교육 체크인 버튼을 누르고 입장해주세요
  📱 JVOICE 모바일: https://virtuous-peace-production-c728.up.railway.app/mobile
- 카메라와 마이크를 미리 확인해주세요
- 교육 자료는 사전에 준비해주세요
      `.trim(),
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'Asia/Seoul'
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'Asia/Seoul'
      },
      attendees: [
        { email: application.user.email || `${application.user.employeeId}@company.com` },
        ...(instructorEmail ? [{ email: instructorEmail }] : [])
      ],
      conferenceData: {
        createRequest: {
          requestId: `meet-${applicationId}-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1일 전
          { method: 'popup', minutes: 30 },      // 30분 전
          { method: 'popup', minutes: 10 }       // 10분 전
        ]
      }
    }

    console.log('📅 [Google Calendar] 이벤트 생성 중...', {
      summary: event.summary,
      start: event.start.dateTime,
      end: event.end.dateTime
    })

    // Calendar API 호출
    const response = await calendar.events.insert({
      auth: oauth2Client,
      calendarId: 'primary', // 사용자의 기본 캘린더
      conferenceDataVersion: 1,
      sendUpdates: 'all', // 참석자에게 이메일 발송
      requestBody: event
    })

    const createdEvent = response.data
    const meetLink = createdEvent.conferenceData?.entryPoints?.find(
      (entry: any) => entry.entryPointType === 'video'
    )?.uri

    if (!meetLink) {
      throw new Error('Google Meet 링크 생성에 실패했습니다.')
    }

    console.log('✅ [Google Calendar] 이벤트 생성 완료:', {
      eventId: createdEvent.id,
      meetLink
    })

    // 데이터베이스 업데이트
    const updatedApplication = await prisma.scheduleApplication.update({
      where: { id: applicationId },
      data: {
        details: {
          ...details,
          googleMeetLink: meetLink,
          googleCalendarEventId: createdEvent.id,
          meetCreatedAt: new Date().toISOString(),
          meetCreatedBy: instructorEmail || 'system'
        }
      }
    })

    console.log('✅ [Database] Google Meet 링크 저장 완료')

    return NextResponse.json({
      success: true,
      meetLink,
      eventId: createdEvent.id,
      message: 'Google Meet 링크가 생성되었습니다.'
    })

  } catch (error) {
    console.error('❌ [Google Meet] 생성 오류:', error)
    
    // Google API 에러 처리
    if (error instanceof Error) {
      if (error.message.includes('insufficient permissions')) {
        return NextResponse.json(
          { error: 'Google Calendar 권한이 부족합니다. 관리자에게 문의하세요.' },
          { status: 403 }
        )
      } else if (error.message.includes('quota')) {
        return NextResponse.json(
          { error: 'Google API 할당량을 초과했습니다. 잠시 후 다시 시도해주세요.' },
          { status: 429 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Google Meet 링크 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// GET: 기존 Google Meet 링크 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const applicationId = searchParams.get('applicationId')

    if (!applicationId) {
      return NextResponse.json(
        { error: 'applicationId가 필요합니다.' },
        { status: 400 }
      )
    }

    const application = await prisma.scheduleApplication.findUnique({
      where: { id: applicationId },
      select: {
        details: true
      }
    })

    if (!application) {
      return NextResponse.json(
        { error: '신청 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const details = application.details as any
    const meetLink = details.googleMeetLink

    return NextResponse.json({
      success: true,
      meetLink: meetLink || null,
      hasLink: !!meetLink
    })

  } catch (error) {
    console.error('❌ [Google Meet] 조회 오류:', error)
    return NextResponse.json(
      { error: '조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
