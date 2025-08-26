import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '../../../../lib/generated/prisma'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  return await POST(request)
}

export async function POST(request: NextRequest) {
  try {
    console.log('🗄️ Railway 데이터베이스 스키마 생성 시작...')
    
    // 1. 데이터베이스 연결 테스트
    await prisma.$connect()
    console.log('✅ 데이터베이스 연결 성공')
    
    // 2. 간단한 테이블 생성 테스트
    console.log('📊 테이블 생성 테스트 중...')
    
    // 테이블이 존재하는지 확인
    try {
      const result = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `
      console.log('📋 현재 테이블 목록:', result)
      
      return NextResponse.json({ 
        success: true, 
        message: '데이터베이스 연결 성공',
        tables: result
      })
      
    } catch (error) {
      console.log('⚠️ 테이블 조회 실패:', error)
      return NextResponse.json({ 
        success: false, 
        message: '테이블 조회 실패',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error)
    return NextResponse.json({ 
      success: false, 
      message: '데이터베이스 연결 실패',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
