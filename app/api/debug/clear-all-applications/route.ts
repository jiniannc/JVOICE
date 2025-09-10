import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '../../../../lib/generated/prisma'

const prisma = new PrismaClient()

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ [Debug] 모든 신청 내역 삭제 시작')
    
    // 모든 신청 내역 삭제
    const result = await prisma.scheduleApplication.deleteMany({})
    
    console.log(`✅ [Debug] 모든 신청 내역 삭제 완료: ${result.count}개 삭제됨`)
    
    return NextResponse.json({
      success: true,
      message: '모든 신청 내역이 삭제되었습니다.',
      deletedCount: result.count
    })
    
  } catch (error) {
    console.error('❌ [Debug] 모든 신청 내역 삭제 오류:', error)
    return NextResponse.json(
      { error: '삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [Debug] 현재 신청 내역 수 확인')
    
    // 현재 신청 내역 수 확인
    const count = await prisma.scheduleApplication.count()
    
    console.log(`📋 [Debug] 현재 신청 내역 수: ${count}개`)
    
    return NextResponse.json({
      success: true,
      currentCount: count
    })
    
  } catch (error) {
    console.error('❌ [Debug] 신청 내역 수 확인 오류:', error)
    return NextResponse.json(
      { error: '확인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
