import { NextRequest, NextResponse } from "next/server"
import * as nodemailer from 'nodemailer' // Gmail SMTP용
import sgMail from '@sendgrid/mail' // SendGrid용
import { EmployeeDatabase } from '@/lib/employee-database' // 직원 정보 로드

interface CancellationEmailData {
  applicants: {
    name: string
    email?: string
    employeeId: string
  }[]
  session: {
    language: string
    classType: string
    sessionNumber: number
    slotTime: string
    date: string
  }
  reason: string
}

// 이메일 발송 함수
async function sendCancellationEmail(to: string, subject: string, content: string): Promise<{success: boolean, error?: string}> {
  try {
    // 환경변수에서 이메일 서비스 타입 확인
    const emailServiceType = process.env.EMAIL_SERVICE_TYPE || 'simulation'
    
    if (emailServiceType === 'simulation') {
      // 시뮬레이션 모드 (개발/테스트용)
      console.log(`📧 [시뮬레이션] 이메일 발송: ${to}`)
      console.log(`제목: ${subject}`)
      console.log(`내용: ${content.substring(0, 200)}...`)
      
      // 시뮬레이션 딜레이 (실제 이메일 발송 시뮬레이션)
      await new Promise(resolve => setTimeout(resolve, 100))
      
      return { success: true }
    }
    
    if (emailServiceType === 'gmail') {
      // Gmail SMTP를 사용한 실제 이메일 발송 (개인 Gmail)
      console.log('📧 [Gmail] 이메일 발송 시도 중...')
      
      // Gmail SMTP 설정
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_GMAIL_USER,
          pass: process.env.EMAIL_GMAIL_PASSWORD // Gmail 앱 비밀번호
        }
      })
      
      // 이메일 옵션
      const mailOptions = {
        from: `${process.env.EMAIL_FROM_NAME || '객실기내방송팀'} <${process.env.EMAIL_FROM || process.env.EMAIL_GMAIL_USER}>`,
        to: to,
        subject: subject,
        text: content,
        html: content.replace(/\n/g, '<br>') // 줄바꿈을 HTML로 변환
      }
      
      // 이메일 발송
      const info = await transporter.sendMail(mailOptions)
      console.log('✅ [Gmail] 이메일 발송 성공:', info.messageId)
      
      return { success: true }
    }
    
    if (emailServiceType === 'workspace') {
      // Google Workspace SMTP를 사용한 실제 이메일 발송
      console.log('📧 [Google Workspace] 이메일 발송 시도 중...')
      console.log('📧 [Google Workspace] 설정 확인:', {
        user: process.env.EMAIL_GMAIL_USER,
        hasPassword: !!process.env.EMAIL_GMAIL_PASSWORD,
        passwordLength: process.env.EMAIL_GMAIL_PASSWORD?.length || 0
      })
      
      // Google Workspace SMTP 설정 (여러 포트 시도)
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465, // SSL 포트로 변경
        secure: true, // SSL 사용
        auth: {
          user: process.env.EMAIL_GMAIL_USER, // 회사 이메일 (예: user@company.com)
          pass: process.env.EMAIL_GMAIL_PASSWORD // 앱 비밀번호
        },
        connectionTimeout: 30000, // 30초 타임아웃
        greetingTimeout: 30000,
        socketTimeout: 30000
      })
    }
    
    if (emailServiceType === 'company') {
      // 회사 내부 SMTP 서버 사용 (SendGrid 우회)
      console.log('📧 [Company SMTP] 이메일 발송 시도 중...')
      console.log('📧 [Company SMTP] 설정 확인:', {
        host: process.env.COMPANY_SMTP_HOST,
        port: process.env.COMPANY_SMTP_PORT,
        user: process.env.COMPANY_SMTP_USER,
        hasPassword: !!process.env.COMPANY_SMTP_PASSWORD,
        hasOAuth: !!process.env.COMPANY_OAUTH_ACCESS_TOKEN
      })
      
      // OAuth 또는 패스워드 인증 선택
      let authConfig: any
      
      if (process.env.COMPANY_OAUTH_ACCESS_TOKEN) {
        // OAuth 2.0 사용 (비밀번호 변경 시에도 안전)
        authConfig = {
          type: 'OAuth2',
          user: process.env.COMPANY_SMTP_USER || process.env.EMAIL_GMAIL_USER,
          clientId: process.env.COMPANY_OAUTH_CLIENT_ID,
          clientSecret: process.env.COMPANY_OAUTH_CLIENT_SECRET,
          refreshToken: process.env.COMPANY_OAUTH_REFRESH_TOKEN,
          accessToken: process.env.COMPANY_OAUTH_ACCESS_TOKEN
        }
        console.log('🔐 [Company SMTP] OAuth 2.0 인증 사용')
      } else {
        // 기존 패스워드 인증
        authConfig = {
          user: process.env.COMPANY_SMTP_USER || process.env.EMAIL_GMAIL_USER,
          pass: process.env.COMPANY_SMTP_PASSWORD || process.env.EMAIL_GMAIL_PASSWORD
        }
        console.log('🔐 [Company SMTP] 패스워드 인증 사용')
      }
      
      // 회사 SMTP 서버 설정
      const transporter = nodemailer.createTransport({
        host: process.env.COMPANY_SMTP_HOST || 'mail.jinair.com',
        port: parseInt(process.env.COMPANY_SMTP_PORT || '587'),
        secure: false, // TLS
        auth: authConfig,
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000
      })
      
      // 이메일 옵션
      const mailOptions = {
        from: `${process.env.EMAIL_FROM_NAME || '객실기내방송팀'} <${process.env.EMAIL_FROM || process.env.EMAIL_GMAIL_USER}>`,
        to: to,
        subject: subject,
        text: content,
        html: content.replace(/\n/g, '<br>') // 줄바꿈을 HTML로 변환
      }
      
      // 이메일 발송 (타임아웃 처리)
      try {
        const info = await transporter.sendMail(mailOptions)
        console.log('✅ [Google Workspace] 이메일 발송 성공:', info.messageId)
        return { success: true }
      } catch (smtpError) {
        console.error('❌ [Google Workspace] SMTP 오류:', smtpError)
        
        // 포트 587로 재시도
        console.log('📧 [Google Workspace] 포트 587로 재시도...')
        const fallbackTransporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false, // TLS
          auth: {
            user: process.env.EMAIL_GMAIL_USER,
            pass: process.env.EMAIL_GMAIL_PASSWORD
          },
          tls: {
            rejectUnauthorized: false
          },
          connectionTimeout: 30000,
          greetingTimeout: 30000,
          socketTimeout: 30000
        })
        
        try {
          const fallbackInfo = await fallbackTransporter.sendMail(mailOptions)
          console.log('✅ [Google Workspace] 재시도 성공:', fallbackInfo.messageId)
          return { success: true }
        } catch (fallbackError) {
          console.error('❌ [Google Workspace] 재시도도 실패:', fallbackError)
          throw fallbackError
        }
      }
    }
    
    if (emailServiceType === 'company') {
      // 회사 내부 SMTP 이메일 발송
      const mailOptions = {
        from: `${process.env.EMAIL_FROM_NAME || '객실기내방송팀'} <${process.env.EMAIL_FROM || process.env.EMAIL_GMAIL_USER}>`,
        to: to,
        subject: subject,
        text: content,
        html: content.replace(/\n/g, '<br>')
      }
      
      try {
        const info = await transporter.sendMail(mailOptions)
        console.log('✅ [Company SMTP] 이메일 발송 성공:', info.messageId)
        return { success: true }
      } catch (companyError) {
        console.error('❌ [Company SMTP] 발송 실패:', companyError)
        throw companyError
      }
    }
    
    if (emailServiceType === 'sendgrid') {
      // SendGrid를 사용한 실제 이메일 발송
      console.log('📧 [SendGrid] 이메일 발송 시도 중...')
      console.log('📧 [SendGrid] 설정 확인:', {
        hasApiKey: !!process.env.SENDGRID_API_KEY,
        apiKeyPrefix: process.env.SENDGRID_API_KEY?.substring(0, 10) + '...',
        fromEmail: process.env.EMAIL_FROM || 'noreply@company.com',
        fromName: process.env.EMAIL_FROM_NAME || '객실기내방송팀',
        to: to
      })
      
      const sgMail = require('@sendgrid/mail')
      sgMail.setApiKey(process.env.SENDGRID_API_KEY)
      
      const msg = {
        to: to,
        from: {
          email: process.env.EMAIL_FROM || 'noreply@company.com',
          name: process.env.EMAIL_FROM_NAME || '객실기내방송팀'
        },
        subject: subject,
        text: content,
        html: content.replace(/\n/g, '<br>')
      }
      
      console.log('📧 [SendGrid] 메시지 구조:', JSON.stringify(msg, null, 2))
      
      try {
        const result = await sgMail.send(msg)
        console.log('✅ [SendGrid] 이메일 발송 성공:', result[0].statusCode)
        return { success: true }
      } catch (sendGridError: any) {
        console.error('❌ [SendGrid] 상세 오류:', {
          code: sendGridError.code,
          message: sendGridError.message,
          response: sendGridError.response?.body
        })
        throw sendGridError
      }
    }
    
    // 기본값: 시뮬레이션
    console.log('⚠️ [이메일] 알 수 없는 서비스 타입, 시뮬레이션으로 처리:', emailServiceType)
    return { success: true }
    
  } catch (error) {
    console.error('❌ [이메일 발송] 오류:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '알 수 없는 오류' 
    }
  }
}

/**
 * 교육 폐강 알림 이메일 발송 API
 * POST { applicants: [...], session: {...}, reason: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body: CancellationEmailData = await req.json()
    const { applicants, session, reason } = body

    console.log('👥 [폐강 알림] 직원 정보 로딩 중...')
    // 직원 정보 로드 (실제 이메일 주소 확보)
    const employeeDB = new EmployeeDatabase()
    const employees = await employeeDB.fetchEmployees()
    console.log(`👥 [폐강 알림] 직원 정보 로딩 완료: ${employees.length}명`)

    if (!applicants || !session || !reason) {
      return NextResponse.json(
        { error: '필수 데이터가 누락되었습니다.' },
        { status: 400 }
      )
    }

    console.log(`📧 [폐강 알림] ${session.language} ${session.classType} ${session.sessionNumber}차수 폐강 알림 발송 시작`)

    // 언어 표시명 변환
    const getLanguageDisplay = (language: string): string => {
      switch (language) {
        case '한/영': return '한국어/영어'
        case '일본어': return '일본어'  
        case '중국어': return '중국어'
        default: return language
      }
    }

    // 교육 타입 표시명 변환
    const getClassTypeDisplay = (classType: string): string => {
      switch (classType) {
        case '소규모': return '소규모 그룹 교육'
        case '1:1': return '1:1 개별 교육'
        default: return classType
      }
    }

    // 이메일 내용 생성
    const emailSubject = `[교육 폐강 안내] ${getLanguageDisplay(session.language)} ${getClassTypeDisplay(session.classType)} (${session.sessionNumber}차수)`
    
    const emailContent = `
안녕하세요.

신청하신 교육이 부득이한 사유로 폐강되어 안내 드립니다.

■ 폐강 교육 정보
- 언어: ${getLanguageDisplay(session.language)}
- 교육 형태: ${getClassTypeDisplay(session.classType)}
- 차수: ${session.sessionNumber}차수
- 시간: ${session.slotTime}
- 날짜: ${session.date}
- 폐강 사유: ${reason}

■ 향후 안내
- 다른 차수나 날짜의 교육을 신청하시기 바랍니다.
- 문의사항이 있으시면 객실기내방송팀으로 연락주시기 바랍니다.

감사합니다.

객실기내방송팀
`

    // 각 신청자에게 이메일 발송
    const emailResults = []
    
    for (const applicant of applicants) {
      try {
        // 직원 정보에서 실제 이메일 주소 찾기
        const employee = employees.find(emp => emp.employeeId === applicant.employeeId)
        const emailAddress = employee?.email || applicant.email || `${applicant.employeeId}@company.com`
        
        console.log(`📧 [폐강 알림] ${applicant.name}(${applicant.employeeId}) -> ${emailAddress}`)
        if (employee?.email) {
          console.log(`✅ [폐강 알림] 직원 스프레드시트에서 이메일 확인: ${employee.email}`)
          console.log(`👤 [폐강 알림] 직원 정보: ${employee.name} (${employee.employeeId})`)
        } else {
          console.log(`⚠️ [폐강 알림] 직원 스프레드시트에서 이메일 없음, 기본값 사용: ${emailAddress}`)
          console.log(`🔍 [폐강 알림] 검색 시도한 사번: ${applicant.employeeId}`)
          console.log(`🔍 [폐강 알림] 사용 가능한 직원 수: ${employees.length}`)
        }
        console.log(`제목: ${emailSubject}`)
        console.log(`내용 미리보기: ${emailContent.substring(0, 100)}...`)
        
        // 실제 이메일 발송 로직
        const emailSent = await sendCancellationEmail(emailAddress, emailSubject, emailContent)
        
        if (emailSent.success) {
          emailResults.push({
            name: applicant.name,
            employeeId: applicant.employeeId,
            email: emailAddress,
            status: 'sent',
            sentAt: new Date().toISOString()
          })
        } else {
          throw new Error(emailSent.error || '이메일 발송 실패')
        }
        
      } catch (error) {
        console.error(`❌ [폐강 알림] ${applicant.name} 이메일 발송 실패:`, error)
        emailResults.push({
          name: applicant.name,
          employeeId: applicant.employeeId,
          email: applicant.email || `${applicant.employeeId}@company.com`,
          status: 'failed',
          error: error instanceof Error ? error.message : '알 수 없는 오류'
        })
      }
    }

    const successCount = emailResults.filter(r => r.status === 'sent').length
    const failCount = emailResults.filter(r => r.status === 'failed').length

    console.log(`✅ [폐강 알림] 발송 완료: 성공 ${successCount}건, 실패 ${failCount}건`)

    return NextResponse.json({
      success: true,
      message: `폐강 알림이 발송되었습니다. (성공: ${successCount}건, 실패: ${failCount}건)`,
      results: emailResults,
      summary: {
        total: applicants.length,
        success: successCount,
        failed: failCount
      }
    })

  } catch (error) {
    console.error('❌ [폐강 알림] 처리 오류:', error)
    return NextResponse.json(
      { error: '폐강 알림 발송 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
