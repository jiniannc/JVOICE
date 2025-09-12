import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/database'

// 카테고리 데이터 정리 API
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [카테고리 수정] 시작')

    // 1. 일본어/중국어는 모든 카테고리를 '공통'으로 통일
    console.log('🔧 [카테고리 수정] 일본어/중국어 카테고리 통일 시작')
    
    // 중국어 모든 카테고리 → 공통
    const chineseResult = await prisma.schedule.updateMany({
      where: {
        type: 'chinese',
        category: { not: '공통' }
      },
      data: {
        category: '공통'
      }
    })
    
    // 일본어 모든 카테고리 → 공통  
    const japaneseResult = await prisma.schedule.updateMany({
      where: {
        type: 'japanese',
        category: { not: '공통' }
      },
      data: {
        category: '공통'
      }
    })
    
    console.log(`✅ [카테고리 수정] 중국어 통일: ${chineseResult.count}개`)
    console.log(`✅ [카테고리 수정] 일본어 통일: ${japaneseResult.count}개`)
    
    let totalFixed = chineseResult.count + japaneseResult.count

    // 2. null/빈 카테고리를 공통으로 설정
    const nullCategoryResult = await prisma.schedule.updateMany({
      where: {
        OR: [
          { category: null },
          { category: '' }
        ]
      },
      data: {
        category: '공통'
      }
    })

    console.log(`✅ [카테고리 수정] null/빈 카테고리 → 공통: ${nullCategoryResult.count}개`)
    totalFixed += nullCategoryResult.count

    // 3. PUS 카테고리 정원 확인 및 수정
    const pusSchedules = await prisma.schedule.findMany({
      where: {
        category: 'PUS',
        classType: 'small'
      }
    })

    let pusFixed = 0
    for (const schedule of pusSchedules) {
      if (schedule.capacity !== 3) {
        await prisma.schedule.update({
          where: { id: schedule.id },
          data: { capacity: 3 }
        })
        pusFixed++
      }
    }

    console.log(`✅ [카테고리 수정] PUS 정원 수정: ${pusFixed}개`)

    // 4. 현재 카테고리 현황 조회
    const categoryStats = await prisma.schedule.groupBy({
      by: ['type', 'classType', 'category'],
      _count: true,
      orderBy: [
        { type: 'asc' },
        { classType: 'asc' },
        { category: 'asc' }
      ]
    })

    console.log('📊 [카테고리 현황]:', categoryStats)

    return NextResponse.json({
      success: true,
      message: `카테고리 정리 완료: ${totalFixed}개 수정`,
      details: {
        totalFixed,
        pusFixed,
        categoryStats
      }
    })

  } catch (error) {
    console.error('❌ [카테고리 수정] 오류:', error)
    return NextResponse.json(
      { error: '카테고리 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
