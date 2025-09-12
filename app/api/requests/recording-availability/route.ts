import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

interface SlotAvailability {
  slot: number
  available: boolean
  currentCount: number
  maxCount: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const employeeId = searchParams.get('employeeId')

    if (!date) {
      return NextResponse.json(
        { error: '날짜는 필수입니다.' },
        { status: 400 }
      )
    }

    console.log(`📋 [recording-availability] 녹음 가용성 확인: ${date}`)

    // 해당 날짜의 녹음 신청 현황 조회
    const recordingApplications = await prisma.scheduleApplication.findMany({
      where: {
        schedule: {
          date,
          type: 'recording'
        },
        status: 'ACTIVE'
      }
    })

    console.log(`📋 [recording-availability] ${date} 녹음 신청 현황: ${recordingApplications.length}건`)

    // 차수별 가용성 계산 (1~8차수)
    const slotAvailability: SlotAvailability[] = []
    
    for (let slot = 1; slot <= 8; slot++) {
      const currentApplicants = recordingApplications.filter(app => app.slot === slot)
      const currentCount = currentApplicants.length
      
      slotAvailability.push({
        slot,
        available: currentCount < 8, // 녹음은 차수당 8명 제한
        currentCount,
        maxCount: 8
      })
    }

    // 사용자의 언어별 신청 제한 확인 (employeeId가 있는 경우)
    let hasExistingApplication = false
    if (employeeId) {
      const userApplication = recordingApplications.find(app => 
        app.employeeId === employeeId
      )
      hasExistingApplication = !!userApplication
      console.log(`🔍 [recording-availability] ${employeeId} 기존 신청 여부:`, hasExistingApplication)
    }

    return NextResponse.json({
      success: true,
      date,
      slotAvailability,
      hasExistingApplication,
      totalApplications: recordingApplications.length
    })

  } catch (error) {
    console.error('❌ [recording-availability] 조회 실패:', error)
    return NextResponse.json(
      { error: '녹음 가용성 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
