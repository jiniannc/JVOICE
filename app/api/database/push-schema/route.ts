import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '../../../../lib/generated/prisma'
import { execSync } from 'child_process'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  return await POST(request)
}

export async function POST(request: NextRequest) {
  try {
    console.log('🗄️ Prisma 스키마를 데이터베이스에 적용 시작...')
    
    // 1. 데이터베이스 연결 테스트
    await prisma.$connect()
    console.log('✅ 데이터베이스 연결 성공')
    
    // 2. Prisma db push 실행
    console.log('📋 Prisma db push 실행 중...')
    
    try {
      // Prisma db push 실행
      execSync('npx prisma db push', { 
        stdio: 'inherit',
        env: process.env
      })
      console.log('✅ Prisma db push 성공')
      
      // 3. 생성된 테이블 확인
      console.log('🔍 생성된 테이블 확인 중...')
      
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `
      
      console.log('📊 생성된 테이블 목록:', tables)
      
      return NextResponse.json({ 
        success: true, 
        message: 'Prisma 스키마 적용 성공',
        details: '데이터베이스에 모든 테이블이 생성되었습니다',
        tables: tables
      })
      
    } catch (error) {
      console.log('⚠️ Prisma db push 실패:', error)
      return NextResponse.json({ 
        success: false, 
        message: 'Prisma db push 실패',
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

