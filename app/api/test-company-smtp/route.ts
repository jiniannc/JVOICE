import { NextResponse } from 'next/server'
import * as nodemailer from 'nodemailer'

export async function GET() {
  try {
    console.log('🧪 [Company SMTP 테스트] 시작')
    
    // 환경변수 확인
    const smtpHost = process.env.COMPANY_SMTP_HOST || 'mail.jinair.com'
    const smtpPort = parseInt(process.env.COMPANY_SMTP_PORT || '587')
    const smtpUser = process.env.COMPANY_SMTP_USER || process.env.EMAIL_GMAIL_USER
    const smtpPassword = process.env.COMPANY_SMTP_PASSWORD || process.env.EMAIL_GMAIL_PASSWORD
    const fromEmail = process.env.EMAIL_FROM || 'noreply@jinair.com'
    const fromName = process.env.EMAIL_FROM_NAME || '객실기내방송팀'
    
    console.log('🧪 [Company SMTP 테스트] 설정:', {
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      hasPassword: !!smtpPassword,
      fromEmail,
      fromName
    })
    
    if (!smtpUser || !smtpPassword) {
      return NextResponse.json({ 
        success: false, 
        error: 'COMPANY_SMTP_USER 또는 COMPANY_SMTP_PASSWORD가 설정되지 않았습니다.' 
      })
    }
    
    // 여러 설정으로 시도
    const configs = [
      {
        name: 'TLS 587',
        config: {
          host: smtpHost,
          port: 587,
          secure: false,
          auth: { user: smtpUser, pass: smtpPassword },
          tls: { rejectUnauthorized: false }
        }
      },
      {
        name: 'SSL 465',
        config: {
          host: smtpHost,
          port: 465,
          secure: true,
          auth: { user: smtpUser, pass: smtpPassword }
        }
      },
      {
        name: 'Plain 25',
        config: {
          host: smtpHost,
          port: 25,
          secure: false,
          auth: { user: smtpUser, pass: smtpPassword },
          tls: { rejectUnauthorized: false }
        }
      }
    ]
    
    // 테스트 메시지
    const testMsg = {
      to: smtpUser, // 자신에게 발송
      from: { email: fromEmail, name: fromName },
      subject: '[테스트] 회사 SMTP 연결 확인',
      text: '이 메시지가 도착했다면 회사 내부 SMTP 설정이 올바릅니다.',
      html: '<p>이 메시지가 도착했다면 <strong>회사 내부 SMTP 설정이 올바릅니다</strong>.</p>'
    }
    
    console.log('🧪 [Company SMTP 테스트] 메시지:', JSON.stringify(testMsg, null, 2))
    
    // 각 설정으로 시도
    for (const { name, config } of configs) {
      try {
        console.log(`🧪 [Company SMTP] ${name} 설정으로 시도 중...`)
        
        const transporter = nodemailer.createTransport({
          ...config,
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 10000
        })
        
        // 연결 테스트
        await transporter.verify()
        console.log(`✅ [Company SMTP] ${name} 연결 성공`)
        
        // 실제 발송
        const result = await transporter.sendMail(testMsg)
        console.log(`✅ [Company SMTP] ${name} 이메일 발송 성공:`, result.messageId)
        
        return NextResponse.json({
          success: true,
          message: `${name} 설정으로 테스트 이메일이 성공적으로 발송되었습니다.`,
          config: name,
          messageId: result.messageId
        })
        
      } catch (error: any) {
        console.error(`❌ [Company SMTP] ${name} 실패:`, error.message)
        continue // 다음 설정 시도
      }
    }
    
    // 모든 설정 실패
    return NextResponse.json({
      success: false,
      error: '모든 SMTP 설정이 실패했습니다.',
      configs: configs.map(c => c.name)
    }, { status: 500 })
    
  } catch (error: any) {
    console.error('❌ [Company SMTP 테스트] 전체 실패:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: '회사 SMTP 서버 연결에 실패했습니다.'
    }, { status: 500 })
  }
}
