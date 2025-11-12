import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '../../../../lib/database'
import { cookies } from 'next/headers'

// Google Calendar API 설정
const calendar = google.calendar('v3')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionData, instructorEmail } = body

    console.log('📅 [Calendar Invite] 소규모 교육 캘린더 초대 생성 요청:', { sessionData, instructorEmail })

    if (!sessionData || !sessionData.applicants || sessionData.applicants.length === 0) {
      return NextResponse.json(
        { error: '세션 데이터 또는 신청자 정보가 필요합니다.' },
        { status: 400 }
      )
    }

    // OAuth 토큰 확인
    const cookieStore = cookies()
    const accessToken = cookieStore.get('google_calendar_access_token')?.value
    const refreshToken = cookieStore.get('google_calendar_refresh_token')?.value

    if (!accessToken) {
      console.log('❌ [Calendar Invite] OAuth 토큰 없음')
      return NextResponse.json({
        needsAuth: true,
        error: 'Google Calendar 연동이 필요합니다.',
        authUrl: '/api/auth/google-calendar'
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

    // 토큰 갱신 처리
    oauth2Client.on('tokens', (tokens) => {
      if (tokens.access_token) {
        console.log('🔄 [Calendar Invite] Access token 갱신됨')
        // 새로운 토큰을 쿠키에 저장
        const response = NextResponse.next()
        response.cookies.set('google_calendar_access_token', tokens.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 3600 // 1시간
        })
      }
    })

    google.options({ auth: oauth2Client })

    // 언어 이름 매핑
    const languageNames: Record<string, string> = {
      'korean': '한국어',
      'english': '영어',
      'japanese': '일본어',
      'chinese': '중국어',
      'korean-english': '한/영'
    }

    const languageName = languageNames[sessionData.language] || sessionData.language

    // 시간 계산 (세션 시간 정보 파싱)
    const timeMatch = sessionData.slotTime.match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/)
    if (!timeMatch) {
      return NextResponse.json(
        { error: '시간 정보를 파싱할 수 없습니다.' },
        { status: 400 }
      )
    }

    const [, startHour, startMinute, endHour, endMinute] = timeMatch
    
    // 한국 시간대로 명시적으로 날짜/시간 생성 (UTC 시차 문제 해결)
    // Google Calendar API는 ISO 8601 형식을 요구하므로, 한국 시간을 직접 문자열로 생성
    const startDateTimeStr = `${sessionData.date}T${startHour}:${startMinute}:00`
    const endDateTimeStr = `${sessionData.date}T${endHour}:${endMinute}:00`
    
    console.log('🕐 [Calendar Invite] 시간 설정:', {
      원본날짜: sessionData.date,
      원본시간: sessionData.slotTime,
      시작시간ISO: startDateTimeStr,
      종료시간ISO: endDateTimeStr,
      시간대: 'Asia/Seoul'
    })

    // 참석자 이메일 목록 생성 (유효한 이메일만 필터링)
    const attendees = sessionData.applicants
      .filter((applicant: any) => {
        // 이메일이 있고, @jinair.com이 아닌 실제 이메일만 허용
        return applicant.email && 
               applicant.email.includes('@') && 
               !applicant.email.match(/^\d+@jinair\.com$/) // 사번@jinair.com 형식 제외
      })
      .map((applicant: any) => ({
        email: applicant.email
      }));
    
    // 필터링 결과 로그
    console.log('📧 [Calendar Invite] 필터링된 참석자 이메일:', attendees.map(a => a.email));
    console.log('⚠️ [Calendar Invite] 제외된 신청자:', 
      sessionData.applicants
        .filter((applicant: any) => 
          !applicant.email || 
          !applicant.email.includes('@') || 
          applicant.email.match(/^\d+@jinair\.com$/)
        )
        .map((a: any) => `${a.name}(${a.employeeId}): ${a.email || '이메일 없음'}`)
    );

    // 강사 이메일 추가
    if (instructorEmail) {
      attendees.push({ email: instructorEmail })
    }

    // 신청자 목록 텍스트 생성
    const applicantsList = sessionData.applicants.map((applicant: any, index: number) => {
      return `${index + 1}. ${applicant.name} (${applicant.employeeId}) - ${applicant.department || '부서미상'}`
    }).join('\n')
    
    const validEmailCount = attendees.length - (instructorEmail ? 1 : 0) // 강사 제외한 참석자 수

    // 세션 데이터 로그 (디버깅용)
    console.log('📋 [Calendar Invite] 세션 데이터:', {
      classroom: sessionData.classroom,
      category: sessionData.category,
      language: sessionData.language,
      classType: sessionData.classType
    })

    // Google Calendar 이벤트 생성
    const event = {
      summary: `${sessionData.classType} ${languageName} 교육 - ${sessionData.sessionNumber}차수`,
      description: `
${sessionData.classType} ${languageName} 교육 세션

📋 교육 정보:
- 언어: ${languageName}
- 유형: ${sessionData.classType}
${sessionData.category ? `- 카테고리: ${sessionData.category}` : ''}
- 날짜: ${sessionData.date}
- 시간: ${sessionData.slotTime}
- 차수: ${sessionData.sessionNumber}차
${sessionData.classroom ? `- 교육 학과장: ${sessionData.classroom}` : ''}

👥 참가자 (총 ${sessionData.applicants.length}명):
${applicantsList}

⚠️ 중요사항:
- 지정된 학과장 입실 후 JVOICE (모바일) 접속 > 교육 체크인 버튼을 눌러주세요.
  📱 JVOICE 모바일: https://virtuous-peace-production-c728.up.railway.app/mobile
- 교육 필요 부분은 사전에 준비해주세요
      `.trim(),
      start: {
        dateTime: startDateTimeStr,
        timeZone: 'Asia/Seoul'
      },
      end: {
        dateTime: endDateTimeStr,
        timeZone: 'Asia/Seoul'
      },
      attendees: attendees,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1일 전
          { method: 'popup', minutes: 30 },      // 30분 전
          { method: 'popup', minutes: 10 }       // 10분 전
        ]
      }
    }

    console.log('📅 [Calendar Invite] 이벤트 생성 중...', {
      summary: event.summary,
      start: event.start.dateTime,
      end: event.end.dateTime,
      attendeesCount: attendees.length
    })

    // Calendar API 호출
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'all' // 모든 참석자에게 초대 메일 발송
    })

    console.log('✅ [Calendar Invite] 캘린더 이벤트 생성 완료:', response.data.id)
    
    // DB에 교육 세션 정보 저장
    try {
      const educationSession = await prisma.educationSession.upsert({
        where: {
          date_language_classType_sessionNumber: {
            date: sessionData.date,
            language: sessionData.language,
            classType: sessionData.classType,
            sessionNumber: sessionData.sessionNumber
          }
        },
        update: {
          calendarEventId: response.data.id,
          calendarInviteSent: true,
          calendarInviteSentAt: new Date(),
          applicantsCount: sessionData.applicants.length,
          status: 'scheduled'
        },
        create: {
          date: sessionData.date,
          language: sessionData.language,
          classType: sessionData.classType,
          sessionNumber: sessionData.sessionNumber,
          slotTime: sessionData.slotTime,
          classroom: sessionData.classroom,
          category: sessionData.category,
          calendarEventId: response.data.id,
          calendarInviteSent: true,
          calendarInviteSentAt: new Date(),
          applicantsCount: sessionData.applicants.length,
          minParticipants: 2,
          status: 'scheduled'
        }
      })
      
      console.log('✅ [Calendar Invite] DB에 세션 정보 저장 완료:', educationSession.id)
    } catch (dbError) {
      console.error('⚠️ [Calendar Invite] DB 저장 실패 (캘린더는 생성됨):', dbError)
      // DB 저장 실패해도 캘린더 생성은 성공했으므로 계속 진행
    }
    
    // 성공 메시지 생성
    const totalApplicants = sessionData.applicants.length
    const invitedCount = validEmailCount
    const notInvitedCount = totalApplicants - invitedCount
    
    let message = `${sessionData.classType} ${languageName} 교육 캘린더 초대가 생성되었습니다.`
    if (notInvitedCount > 0) {
      message += `\n\n⚠️ 주의: ${notInvitedCount}명은 유효한 이메일이 없어 초대 메일이 발송되지 않았습니다.\n캘린더 이벤트 설명에서 해당 인원을 확인하고 수동으로 초대해주세요.`
    }

    return NextResponse.json({
      success: true,
      eventId: response.data.id,
      eventLink: response.data.htmlLink,
      message: message,
      stats: {
        total: totalApplicants,
        invited: invitedCount,
        notInvited: notInvitedCount
      }
    })

  } catch (error: any) {
    console.error('❌ [Calendar Invite] 오류:', error)
    
    if (error.code === 401) {
      return NextResponse.json({
        needsAuth: true,
        error: 'Google Calendar 권한이 만료되었습니다. 다시 연동해주세요.',
        authUrl: '/api/auth/google-calendar'
      }, { status: 401 })
    }

    return NextResponse.json({
      success: false,
      error: error.message || '캘린더 초대 생성 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}
