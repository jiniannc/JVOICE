import { NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'

export async function GET() {
  try {
    console.log('🧪 [SendGrid 테스트] 시작')
    
    // 환경변수 확인
    const apiKey = process.env.SENDGRID_API_KEY
    const fromEmail = process.env.EMAIL_FROM || 'noreply@company.com'
    const fromName = process.env.EMAIL_FROM_NAME || '객실기내방송팀'
    
    console.log('🧪 [SendGrid 테스트] 설정:', {
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey?.substring(0, 10) + '...',
      fromEmail,
      fromName
    })
    
    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'SENDGRID_API_KEY가 설정되지 않았습니다.' 
      })
    }
    
    // SendGrid 설정
    sgMail.setApiKey(apiKey)
    
    // 테스트 메시지 (Gmail로 테스트)
    const testMsg = {
      to: 'dkyou@gmail.com', // Gmail로 테스트 (실제 Gmail 주소로 변경 필요)
      from: { email: fromEmail, name: fromName },
      subject: '[테스트] SendGrid 연결 확인',
      text: '이 메시지가 도착했다면 SendGrid 설정이 올바릅니다. 회사 이메일 대신 Gmail로 테스트 중입니다.',
      html: '<p>이 메시지가 도착했다면 <strong>SendGrid 설정이 올바릅니다</strong>.</p><p>회사 이메일 대신 Gmail로 테스트 중입니다.</p>'
    }
    
    console.log('🧪 [SendGrid 테스트] 메시지:', JSON.stringify(testMsg, null, 2))
    
    // 실제 발송
    const result = await sgMail.send(testMsg)
    
    console.log('✅ [SendGrid 테스트] 성공:', result[0].statusCode)
    
    return NextResponse.json({
      success: true,
      message: '테스트 이메일이 성공적으로 발송되었습니다.',
      statusCode: result[0].statusCode,
      messageId: result[0].headers['x-message-id']
    })
    
  } catch (error: any) {
    console.error('❌ [SendGrid 테스트] 실패:', {
      code: error.code,
      message: error.message,
      response: error.response?.body
    })
    
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      details: error.response?.body
    }, { status: 500 })
  }
}
