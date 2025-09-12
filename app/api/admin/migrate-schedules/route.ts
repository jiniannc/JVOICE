import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/database'

// 기존 스케줄에 기본 카테고리 설정하는 마이그레이션 API
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [Migration] 스케줄 카테고리 마이그레이션 시작')

    // category가 null인 모든 스케줄 조회
    const schedulesWithoutCategory = await prisma.schedule.findMany({
      where: {
        OR: [
          { category: null },
          { category: '' }
        ]
      }
    })

    console.log(`📋 [Migration] 카테고리 없는 스케줄: ${schedulesWithoutCategory.length}개`)

    let updatedCount = 0

    // 각 스케줄에 기본 카테고리 '공통' 설정
    for (const schedule of schedulesWithoutCategory) {
      try {
        await prisma.schedule.update({
          where: { id: schedule.id },
          data: { category: '공통' }
        })
        updatedCount++
        console.log(`✅ [Migration] 스케줄 ${schedule.id} 업데이트: ${schedule.date} ${schedule.type} ${schedule.classType} → 공통`)
      } catch (error) {
        console.error(`❌ [Migration] 스케줄 ${schedule.id} 업데이트 실패:`, error)
      }
    }

    console.log(`🎉 [Migration] 마이그레이션 완료: ${updatedCount}/${schedulesWithoutCategory.length}개 업데이트`)

    return NextResponse.json({
      success: true,
      message: `마이그레이션 완료: ${updatedCount}개 스케줄 업데이트`,
      details: {
        total: schedulesWithoutCategory.length,
        updated: updatedCount
      }
    })

  } catch (error) {
    console.error('❌ [Migration] 마이그레이션 오류:', error)
    return NextResponse.json(
      { error: '마이그레이션 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}



