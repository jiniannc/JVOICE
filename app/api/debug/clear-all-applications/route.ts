import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '../../../../lib/generated/prisma'

const prisma = new PrismaClient()

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'education', 'recording', 또는 null(전체)

    console.log(`🗑️ [Debug] 신청 내역 삭제 시작: ${type || '전체'}`)

    let whereCondition: any = {}

    if (type) {
      // 교육/녹음 타입별 삭제
      if (type === 'recording') {
        // 녹음 신청 삭제 (Schedule의 type이 'recording'인 경우)
        const recordingSchedules = await prisma.schedule.findMany({
          where: { type: 'recording' },
          select: { id: true }
        })
        whereCondition.scheduleId = {
          in: recordingSchedules.map(s => s.id)
        }
      } else if (type === 'education') {
        // 교육 신청 삭제 (Schedule의 type이 'recording'이 아닌 경우)
        const educationSchedules = await prisma.schedule.findMany({
          where: { type: { not: 'recording' } },
          select: { id: true }
        })
        whereCondition.scheduleId = {
          in: educationSchedules.map(s => s.id)
        }
      }
    }

    // 해당 조건의 신청 내역 조회 (삭제 전 확인)
    const applicationsToDelete = await prisma.scheduleApplication.findMany({
      where: whereCondition,
      include: {
        schedule: {
          select: {
            date: true,
            type: true,
            classType: true
          }
        },
        user: {
          select: {
            name: true,
            employeeId: true
          }
        }
      }
    })

    console.log(`📋 [Debug] 삭제 예정 신청 내역: ${applicationsToDelete.length}건`)
    applicationsToDelete.slice(0, 10).forEach((app, idx) => {
      console.log(`  ${idx + 1}. ${app.user.employeeId}(${app.user.name}) - ${app.schedule.date} ${app.schedule.type} ${app.slot}차수`)
    })
    if (applicationsToDelete.length > 10) {
      console.log(`  ... 및 ${applicationsToDelete.length - 10}건 더`)
    }

    // 신청 내역 삭제
    const result = await prisma.scheduleApplication.deleteMany({
      where: whereCondition
    })

    console.log(`✅ [Debug] 신청 내역 삭제 완료: ${result.count}개 삭제됨`)

    return NextResponse.json({
      success: true,
      message: `${type ? type === 'education' ? '교육' : '녹음' : '전체'} 신청 내역이 삭제되었습니다.`,
      deletedCount: result.count,
      type: type
    })

  } catch (error) {
    console.error('❌ [Debug] 신청 내역 삭제 오류:', error)
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
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'education', 'recording', 또는 null(전체)

    console.log(`🔍 [Debug] 현재 신청 내역 수 확인: ${type || '전체'}`)

    let whereCondition: any = {}

    if (type) {
      // 교육/녹음 타입별 조회
      if (type === 'recording') {
        const recordingSchedules = await prisma.schedule.findMany({
          where: { type: 'recording' },
          select: { id: true }
        })
        whereCondition.scheduleId = {
          in: recordingSchedules.map(s => s.id)
        }
      } else if (type === 'education') {
        const educationSchedules = await prisma.schedule.findMany({
          where: { type: { not: 'recording' } },
          select: { id: true }
        })
        whereCondition.scheduleId = {
          in: educationSchedules.map(s => s.id)
        }
      }
    }

    // 현재 신청 내역 수 확인
    const count = await prisma.scheduleApplication.count({
      where: whereCondition
    })

    console.log(`📋 [Debug] 현재 신청 내역 수: ${count}개 (${type ? type === 'education' ? '교육' : '녹음' : '전체'})`)

    return NextResponse.json({
      success: true,
      currentCount: count,
      type: type
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
