import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ [Admin] 모든 신청 내역 삭제 요청')
    
    // 모든 활성 신청 내역 조회 (삭제 전 로그)
    const existingApplications = await prisma.scheduleApplication.findMany({
      where: {
        status: 'ACTIVE'
      },
      include: {
        schedule: {
          select: {
            date: true,
            type: true
          }
        }
      }
    })
    
    console.log(`🗑️ [Admin] 삭제 예정 신청 내역: ${existingApplications.length}건`)
    existingApplications.forEach((app, idx) => {
      console.log(`  ${idx + 1}. ${app.employeeId} - ${app.schedule.date} ${app.slot}차수 ${app.schedule.type}`)
    })
    
    // 모든 신청 내역을 CANCELLED로 변경 (완전 삭제 대신 상태 변경)
    const result = await prisma.scheduleApplication.updateMany({
      where: {
        status: 'ACTIVE'
      },
      data: {
        status: 'CANCELLED'
      }
    })
    
    console.log(`✅ [Admin] ${result.count}건의 신청 내역을 취소 처리 완료`)
    
    return NextResponse.json({
      success: true,
      message: `${result.count}건의 신청 내역을 삭제했습니다.`,
      deletedCount: result.count,
      applications: existingApplications.map(app => ({
        employeeId: app.employeeId,
        date: app.schedule.date,
        slot: app.slot,
        type: app.schedule.type
      }))
    })
    
  } catch (error) {
    console.error('❌ [Admin] 신청 내역 삭제 실패:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '신청 내역 삭제 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
