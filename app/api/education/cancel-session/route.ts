import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '../../../../lib/database'
import { cookies } from 'next/headers'

const calendar = google.calendar('v3')

/**
 * 수동 폐강 API
 * 
 * 교육 세션을 수동으로 폐강 처리
 * - Google Calendar 이벤트 삭제
 * - 참석자들에게 자동 취소 알림 (Google Calendar 시스템)
 * - DB 상태 업데이트
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionData, reason } = body

    console.log('🚫 [Manual Cancel] 수동 폐강 요청:', {
      date: sessionData.date,
      language: sessionData.language,
      classType: sessionData.classType,
      sessionNumber: sessionData.sessionNumber,
      reason
    })

    if (!sessionData) {
      return NextResponse.json(
        { error: '세션 데이터가 필요합니다.' },
        { status: 400 }
      )
    }

    // DB에서 세션 조회
    const session = await prisma.educationSession.findFirst({
      where: {
        date: sessionData.date,
        language: sessionData.language,
        classType: sessionData.classType,
        sessionNumber: sessionData.sessionNumber
      }
    })

    if (!session) {
      return NextResponse.json(
        { error: '해당 세션을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (session.status === 'cancelled') {
      return NextResponse.json(
        { error: '이미 폐강된 세션입니다.' },
        { status: 400 }
      )
    }

    if (!session.calendarEventId) {
      return NextResponse.json(
        { error: '캘린더 이벤트 ID가 없습니다.' },
        { status: 400 }
      )
    }

    // OAuth 토큰 확인
    const cookieStore = cookies()
    const accessToken = cookieStore.get('google_calendar_access_token')?.value
    const refreshToken = cookieStore.get('google_calendar_refresh_token')?.value

    if (!accessToken) {
      console.log('❌ [Manual Cancel] OAuth 토큰 없음')
      return NextResponse.json({
        needsAuth: true,
        error: 'Google Calendar 연동이 필요합니다.'
      }, { status: 401 })
    }

    // OAuth 클라이언트 설정
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/google-calendar/callback`
    )

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    })

    google.options({ auth: oauth2Client })

    // Google Calendar 이벤트 삭제
    try {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: session.calendarEventId,
        sendUpdates: 'all' // ✅ 모든 참석자에게 취소 알림 자동 전송
      })

      console.log(`✅ [Manual Cancel] 캘린더 이벤트 삭제 완료: ${session.calendarEventId}`)
    } catch (calError: any) {
      console.error('❌ [Manual Cancel] 캘린더 삭제 실패:', calError)
      
      // 캘린더 삭제 실패해도 DB는 업데이트
      if (calError.code === 404) {
        console.warn('⚠️ [Manual Cancel] 캘린더 이벤트가 이미 삭제됨')
      } else {
        throw calError
      }
    }

    // DB 업데이트
    await prisma.educationSession.update({
      where: { id: session.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledReason: reason || '수강자 인원 미달',
        autoCancelled: false
      }
    })

    console.log(`✅ [Manual Cancel] DB 업데이트 완료: ${session.id}`)

    const languageNames: Record<string, string> = {
      'korean-english': '한/영',
      'japanese': '일본어',
      'chinese': '중국어',
      '한영': '한/영',
      '일본어': '일본어',
      '중국어': '중국어'
    }

    const languageName = languageNames[session.language] || session.language

    return NextResponse.json({
      success: true,
      message: `${session.classType} ${languageName} 교육 ${session.sessionNumber}차수가 폐강 처리되었습니다.\n\n참석자들에게 Google Calendar를 통해 자동으로 취소 알림이 전송되었습니다.`,
      session: {
        id: session.id,
        date: session.date,
        language: session.language,
        classType: session.classType,
        sessionNumber: session.sessionNumber,
        status: 'cancelled'
      }
    })

  } catch (error: any) {
    console.error('❌ [Manual Cancel] 오류:', error)
    
    if (error.code === 401) {
      return NextResponse.json({
        needsAuth: true,
        error: 'Google Calendar 권한이 만료되었습니다.'
      }, { status: 401 })
    }

    return NextResponse.json({
      success: false,
      error: error.message || '폐강 처리 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

