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
    
    // 2. 필요한 컬럼이 이미 존재하는지 확인
    console.log('🔍 monthly_schedules 테이블의 컬럼 확인 중...')
    
    try {
      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'monthly_schedules'
        AND table_schema = 'public'
        ORDER BY ordinal_position
      ` as any[]
      
      console.log('📊 현재 monthly_schedules 컬럼들:', columns)
      
      // active 컬럼이 있는지 확인
      const hasActiveColumn = columns.some((col: any) => col.column_name === 'active')
      
      if (hasActiveColumn) {
        console.log('✅ active 컬럼이 이미 존재합니다')
        return NextResponse.json({ 
          success: true, 
          message: '스키마가 이미 최신 상태입니다',
          details: 'active 컬럼이 이미 존재합니다',
          columns: columns
        })
      }
      
      // 3. active 컬럼 추가
      console.log('📋 active 컬럼 추가 중...')
      
      await prisma.$executeRaw`
        ALTER TABLE monthly_schedules 
        ADD COLUMN active BOOLEAN NOT NULL DEFAULT true
      `
      
      console.log('✅ active 컬럼 추가 성공')
      
      // 4. 업데이트된 컬럼 확인
      const updatedColumns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'monthly_schedules'
        AND table_schema = 'public'
        ORDER BY ordinal_position
      ` as any[]
      
      console.log('📊 업데이트된 컬럼들:', updatedColumns)
      
      return NextResponse.json({ 
        success: true, 
        message: 'active 컬럼 추가 성공',
        details: 'monthly_schedules 테이블에 active 컬럼이 추가되었습니다',
        columns: updatedColumns
      })
      
    } catch (error) {
      console.log('⚠️ 스키마 업데이트 실패:', error)
      return NextResponse.json({ 
        success: false, 
        message: '스키마 업데이트 실패',
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

