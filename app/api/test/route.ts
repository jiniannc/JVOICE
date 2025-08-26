import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    success: true, 
    message: 'API 테스트 성공!',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    success: true, 
    message: 'POST API 테스트 성공!',
    timestamp: new Date().toISOString()
  })
}

