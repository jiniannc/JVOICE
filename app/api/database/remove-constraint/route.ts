import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '../../../../lib/generated/prisma'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [Database] 유니크 제약조건 제거 시작')
    
    // PostgreSQL에서 직접 제약조건 제거
    const result = await prisma.$executeRaw`
      ALTER TABLE schedule_applications 
      DROP CONSTRAINT IF EXISTS schedule_applications_scheduleId_employeeId_slot_status_key;
    `
    
    console.log('✅ [Database] 유니크 제약조건 제거 완료')
    
    return NextResponse.json({
      success: true,
      message: '유니크 제약조건이 제거되었습니다.',
      result
    })
    
  } catch (error) {
    console.error('❌ [Database] 유니크 제약조건 제거 오류:', error)
    return NextResponse.json(
      { error: '제약조건 제거 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [Database] 현재 제약조건 확인')
    
    // 현재 테이블의 제약조건 확인
    const constraints = await prisma.$queryRaw`
      SELECT conname, contype, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'schedule_applications'::regclass;
    `
    
    console.log('📋 [Database] 현재 제약조건:', constraints)
    
    return NextResponse.json({
      success: true,
      constraints
    })
    
  } catch (error) {
    console.error('❌ [Database] 제약조건 확인 오류:', error)
    return NextResponse.json(
      { error: '제약조건 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
