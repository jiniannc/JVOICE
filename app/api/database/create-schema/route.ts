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
    
    // 2. 스키마 생성 (테이블 생성)
    console.log('📋 데이터베이스 스키마 생성 중...')
    
    try {
      // 간단한 테이블 생성 테스트
      await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS test_table (id SERIAL PRIMARY KEY, name TEXT)`
      console.log('✅ 테스트 테이블 생성 성공')
      
      // 테이블 삭제
      await prisma.$executeRaw`DROP TABLE IF EXISTS test_table`
      console.log('✅ 테스트 테이블 삭제 성공')
      
      return NextResponse.json({ 
        success: true, 
        message: '데이터베이스 스키마 생성 테스트 성공',
        details: '데이터베이스 연결 및 테이블 생성/삭제 테스트 완료'
      })
      
    } catch (error) {
      console.log('⚠️ 스키마 생성 실패:', error)
      return NextResponse.json({ 
        success: false, 
        message: '스키마 생성 실패',
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

