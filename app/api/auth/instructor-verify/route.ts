import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    // 환경 변수에서 비밀번호 확인 (NEXT_PUBLIC_ 접두사 제거)
    const instructorPassword = process.env.INSTRUCTOR_PASSWORD || process.env.NEXT_PUBLIC_INSTRUCTOR_PASSWORD

    if (!instructorPassword) {
      console.error('교관 비밀번호가 설정되지 않음')
      return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 })
    }

    if (password === instructorPassword) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: '잘못된 비밀번호' }, { status: 401 })
    }
  } catch (error) {
    console.error('교관 인증 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
} 