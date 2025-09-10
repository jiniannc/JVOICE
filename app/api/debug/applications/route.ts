import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '../../../../lib/generated/prisma'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [Debug] 신청 내역 디버깅 시작')

    // Request 테이블에서 교육 신청 조회
    const educationRequests = await prisma.request.findMany({
      where: {
        type: 'education'
      },
      include: {
        user: {
          select: {
            employeeId: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        applicationTime: 'desc'
      }
    })

    // ScheduleApplication 테이블에서도 조회
    const scheduleApplications = await prisma.scheduleApplication.findMany({
      include: {
        schedule: {
          select: {
            id: true,
            date: true,
            type: true,
            classType: true,
            month: true
          }
        },
        user: {
          select: {
            employeeId: true,
            name: true
          }
        }
      },
      orderBy: {
        appliedAt: 'desc'
      }
    })

    console.log(`📋 [Debug] 교육 신청: ${educationRequests.length}건, 스케줄 신청: ${scheduleApplications.length}건`)

    // Request 테이블의 상세 정보
    const detailedEducationRequests = educationRequests.map(req => ({
      id: req.id,
      employeeId: req.user?.employeeId,
      userName: req.user?.name,
      userEmail: req.user?.email,
      type: req.type,
      date: req.date,
      slot: req.slot,
      status: req.status,
      details: req.details,
      applicationTime: req.applicationTime,
      notes: req.notes
    }))

    // ScheduleApplication 테이블의 상세 정보
    const detailedScheduleApplications = scheduleApplications.map(app => ({
      id: app.id,
      employeeId: app.employeeId,
      userName: app.user?.name,
      scheduleId: app.scheduleId,
      scheduleDate: app.schedule?.date,
      scheduleType: app.schedule?.type,
      scheduleClassType: app.schedule?.classType,
      slot: app.slot,
      status: app.status,
      appliedAt: app.appliedAt,
      canceledAt: app.canceledAt,
      details: app.details
    }))

    return NextResponse.json({
      success: true,
      educationRequests: {
        count: educationRequests.length,
        data: detailedEducationRequests
      },
      scheduleApplications: {
        count: scheduleApplications.length,
        data: detailedScheduleApplications
      }
    })
    
  } catch (error) {
    console.error('❌ [Debug] 신청 내역 디버깅 오류:', error)
    return NextResponse.json(
      { error: '디버깅 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID가 필요합니다.' },
        { status: 400 }
      )
    }
    
    console.log(`🗑️ [Debug] 강제 삭제: ${id}`)
    
    // 강제로 삭제 (update 대신 delete 사용)
    const result = await prisma.scheduleApplication.delete({
      where: { id }
    })
    
    console.log(`✅ [Debug] 강제 삭제 완료: ${id}`)
    
    return NextResponse.json({
      success: true,
      message: '강제 삭제 완료',
      deletedId: id
    })
    
  } catch (error) {
    console.error('❌ [Debug] 강제 삭제 오류:', error)
    return NextResponse.json(
      { error: '강제 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
