import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/database'

// 특정 날짜의 스케줄 데이터 디버깅용 API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || '2025-10-02'

    console.log(`🔍 [Debug] ${date} 스케줄 데이터 조회`)

    // 해당 날짜의 모든 스케줄 조회
    const schedules = await prisma.schedule.findMany({
      where: {
        date: date
      },
      select: {
        id: true,
        date: true,
        type: true,
        classType: true,
        category: true,
        slots: true,
        capacity: true,
        visible: true,
        classroom: true,
        classroomInfo: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: [
        { type: 'asc' },
        { classType: 'asc' },
        { category: 'asc' }
      ]
    })

    // 해당 날짜의 모든 신청 조회
    const applications = await prisma.scheduleApplication.findMany({
      where: {
        schedule: {
          date: date
        }
      },
      include: {
        schedule: {
          select: {
            type: true,
            classType: true,
            category: true
          }
        }
      },
      orderBy: [
        { slot: 'asc' }
      ]
    })

    console.log(`📅 [Debug] ${date} - 스케줄: ${schedules.length}개, 신청: ${applications.length}건`)

    // 카테고리별 통계
    const categoryStats = new Map<string, { schedules: number, applications: number }>()
    
    schedules.forEach(schedule => {
      const category = schedule.category || '없음'
      const key = `${schedule.type}-${schedule.classType}-${category}`
      if (!categoryStats.has(key)) {
        categoryStats.set(key, { schedules: 0, applications: 0 })
      }
      categoryStats.get(key)!.schedules++
    })

    applications.forEach(app => {
      const category = app.schedule.category || '없음'
      const key = `${app.schedule.type}-${app.schedule.classType}-${category}`
      if (!categoryStats.has(key)) {
        categoryStats.set(key, { schedules: 0, applications: 0 })
      }
      categoryStats.get(key)!.applications++
    })

    return NextResponse.json({
      success: true,
      date,
      summary: {
        totalSchedules: schedules.length,
        totalApplications: applications.length,
        visibleSchedules: schedules.filter(s => s.visible).length
      },
      schedules,
      applications,
      categoryStats: Object.fromEntries(categoryStats)
    })

  } catch (error) {
    console.error('❌ [Debug] 스케줄 데이터 조회 오류:', error)
    return NextResponse.json(
      { error: '스케줄 데이터 조회에 실패했습니다.' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}



