import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '../../../../lib/database'
import { cookies } from 'next/headers'

const calendar = google.calendar('v3')

/**
 * 자동 폐강 체크 API
 * 
 * 폐강 조건:
 * - 교육 시작일 기준 이틀 전 오후 2시 시점
 * - 신청자 2명 미만
 * 
 * 작동 방식:
 * - 매일 오후 2시에 호출 (Cron job 또는 수동 호출)
 * - 조건에 해당하는 세션을 찾아 자동 폐강
 * - Google Calendar 이벤트 삭제 + 참석자 자동 알림
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [Auto Cancel] 자동 폐강 체크 시작')

    // 현재 시간
    const now = new Date()
    
    // 이틀 후 날짜 계산
    const twoDaysLater = new Date(now)
    twoDaysLater.setDate(twoDaysLater.getDate() + 2)
    const targetDate = twoDaysLater.toISOString().split('T')[0] // YYYY-MM-DD
    
    console.log(`📅 [Auto Cancel] 대상 날짜: ${targetDate} (이틀 후)`)

    // 폐강 대상 세션 조회
    // 1. 교육 날짜가 이틀 후
    // 2. 상태가 'scheduled'
    // 3. 소규모 교육 (classType: '소규모')
    // 4. 신청자가 최소 인원(2명) 미만
    const sessionsToCancel = await prisma.educationSession.findMany({
      where: {
        date: targetDate,
        status: 'scheduled',
        classType: '소규모',
        applicantsCount: {
          lt: 2 // 2명 미만
        },
        calendarEventId: {
          not: null // 캘린더 이벤트가 있는 것만
        }
      }
    })

    console.log(`📋 [Auto Cancel] 폐강 대상 세션: ${sessionsToCancel.length}개`)

    if (sessionsToCancel.length === 0) {
      return NextResponse.json({
        success: true,
        message: '폐강 대상 세션이 없습니다.',
        cancelled: []
      })
    }

    // OAuth 토큰 확인
    const cookieStore = cookies()
    const accessToken = cookieStore.get('google_calendar_access_token')?.value
    const refreshToken = cookieStore.get('google_calendar_refresh_token')?.value

    if (!accessToken) {
      console.error('❌ [Auto Cancel] OAuth 토큰 없음')
      return NextResponse.json({
        success: false,
        error: 'Google Calendar 인증 필요'
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

    const results = []
    
    // 각 세션에 대해 폐강 처리
    for (const session of sessionsToCancel) {
      try {
        console.log(`🚫 [Auto Cancel] 세션 폐강 시작:`, {
          date: session.date,
          language: session.language,
          sessionNumber: session.sessionNumber,
          applicants: session.applicantsCount
        })

        // Google Calendar 이벤트 삭제 (자동으로 참석자들에게 취소 알림 전송)
        await calendar.events.delete({
          calendarId: 'primary',
          eventId: session.calendarEventId!,
          sendUpdates: 'all' // ✅ 모든 참석자에게 취소 알림
        })

        console.log(`✅ [Auto Cancel] 캘린더 이벤트 삭제 완료: ${session.calendarEventId}`)

        // DB 업데이트
        await prisma.educationSession.update({
          where: { id: session.id },
          data: {
            status: 'cancelled',
            cancelledAt: now,
            cancelledReason: '수강자 2명 미만으로 자동 폐강',
            autoCancelled: true
          }
        })

        console.log(`✅ [Auto Cancel] DB 업데이트 완료: ${session.id}`)

        results.push({
          success: true,
          session: {
            date: session.date,
            language: session.language,
            classType: session.classType,
            sessionNumber: session.sessionNumber
          },
          applicantsCount: session.applicantsCount
        })

      } catch (error: any) {
        console.error(`❌ [Auto Cancel] 세션 폐강 실패:`, error)
        
        results.push({
          success: false,
          session: {
            date: session.date,
            language: session.language,
            classType: session.classType,
            sessionNumber: session.sessionNumber
          },
          error: error.message
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    console.log(`✅ [Auto Cancel] 완료 - 성공: ${successCount}개, 실패: ${failCount}개`)

    return NextResponse.json({
      success: true,
      message: `자동 폐강 처리 완료 (성공: ${successCount}, 실패: ${failCount})`,
      targetDate,
      results
    })

  } catch (error: any) {
    console.error('❌ [Auto Cancel] 오류:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '자동 폐강 체크 중 오류 발생'
    }, { status: 500 })
  }
}

/**
 * GET: 폐강 예정 세션 조회 (테스트용)
 */
export async function GET(request: NextRequest) {
  try {
    const now = new Date()
    const twoDaysLater = new Date(now)
    twoDaysLater.setDate(twoDaysLater.getDate() + 2)
    const targetDate = twoDaysLater.toISOString().split('T')[0]

    const sessionsToCancel = await prisma.educationSession.findMany({
      where: {
        date: targetDate,
        status: 'scheduled',
        classType: '소규모',
        applicantsCount: {
          lt: 2
        }
      }
    })

    return NextResponse.json({
      success: true,
      targetDate,
      sessions: sessionsToCancel,
      count: sessionsToCancel.length
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

